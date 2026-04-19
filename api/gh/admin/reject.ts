import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
import { appendClaAuditEvent } from "../../lib/claAudit";
import { rejectPending } from "../../lib/claQueue";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
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

    if (!(await isClaAdmin(session.login, session.oauth_access_token))) {
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

    const row = await rejectPending(login);
    if (!row) {
        sendJson(res, 404, { error: "not_in_queue" });
        return;
    }

    const at = new Date().toISOString();
    void appendClaAuditEvent({
        kind: "reject",
        at,
        login: row.login,
        actor: session.login,
        claVersion: row.claVersion,
    }).catch((err: unknown) => {
        console.error("cla_audit", err);
    });

    sendJson(res, 200, { ok: true, login });
}
