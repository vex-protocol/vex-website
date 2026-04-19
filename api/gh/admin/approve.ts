import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
import { readQueue, removePending } from "../../lib/claQueue";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
import {
    addContributorToClabotRepo,
    parseRepoList,
} from "../../lib/updateClabot";
import { readJsonBody, sendJson } from "../../lib/nodeHttp";

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "POST");
        res.end("Method Not Allowed");
        return;
    }

    const secret = getSessionSecret();
    if (!secret) {
        sendJson(res, 503, { error: "not_configured" });
        return;
    }

    const session = readGithubSession(req, secret);
    if (!session) {
        sendJson(res, 401, { error: "not_signed_in" });
        return;
    }

    if (!(await isClaAdmin(session.login))) {
        sendJson(res, 403, { error: "forbidden" });
        return;
    }

    let body: unknown;
    try {
        body = await readJsonBody(req);
    } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
    }

    const login =
        typeof body === "object" &&
        body !== null &&
        "login" in body &&
        typeof (body as { login: unknown }).login === "string"
            ? (body as { login: string }).login.trim()
            : "";

    if (!login || login.length > 39 || /[^a-zA-Z0-9-]/.test(login)) {
        sendJson(res, 400, { error: "invalid_login" });
        return;
    }

    const q = await readQueue();
    const inQueue = q.pending.some(
        (p) => p.login.toLowerCase() === login.toLowerCase(),
    );
    if (!inQueue) {
        sendJson(res, 404, { error: "not_in_queue" });
        return;
    }

    const botToken = process.env.GITHUB_CLA_BOT_TOKEN?.trim();
    const repos = parseRepoList(process.env.CLA_BOT_REPOS);

    const github: Array<{
        repo: string;
        ok: boolean;
        skipped?: boolean;
        error?: string;
    }> = [];

    if (botToken && repos.length > 0) {
        for (const { owner, repo } of repos) {
            const result = await addContributorToClabotRepo(
                botToken,
                owner,
                repo,
                login,
            );
            if (result.ok) {
                github.push({
                    repo: result.repo,
                    ok: true,
                    skipped: result.skipped,
                });
            } else {
                github.push({
                    repo: result.repo,
                    ok: false,
                    error: result.error,
                });
            }
        }
        const failed = github.filter((g) => !g.ok);
        if (failed.length > 0) {
            sendJson(res, 502, {
                error: "github_update_failed",
                login,
                github,
            });
            return;
        }
    }

    const removed = await removePending(login);
    if (!removed) {
        sendJson(res, 409, { error: "queue_race" });
        return;
    }

    sendJson(res, 200, {
        ok: true,
        login,
        github,
        note:
            github.length === 0
                ? "Set GITHUB_CLA_BOT_TOKEN and CLA_BOT_REPOS to commit .clabot automatically."
                : undefined,
    });
}
