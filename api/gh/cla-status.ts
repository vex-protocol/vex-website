import type { IncomingMessage, ServerResponse } from "node:http";

import {
    getClabotRepoFullNames,
    getClaSdkVersion,
    getClaSourceRepoFullName,
} from "../lib/claConfig";
import { getClaEligibility } from "../lib/claQueue";
import { getSessionSecret } from "../lib/ghOAuthEnv";
import { readGithubSession } from "../lib/ghSession";
import { sendJson } from "../lib/nodeHttp";

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end("Method Not Allowed");
        return;
    }

    const sourceRepo = getClaSourceRepoFullName();
    const clabotRepos = getClabotRepoFullNames();
    const claVersion = getClaSdkVersion();

    const secret = getSessionSecret();
    if (!secret) {
        sendJson(res, 503, { error: "not_configured" });
        return;
    }

    const session = readGithubSession(req, secret);
    if (!session) {
        sendJson(res, 200, {
            authenticated: false,
            login: null,
            sourceRepo,
            clabotRepos,
            claVersion,
            eligibility: null,
        });
        return;
    }

    const eligibility = await getClaEligibility(session.login);
    if (eligibility.state === "can_submit") {
        sendJson(res, 200, {
            authenticated: true,
            login: session.login,
            sourceRepo,
            clabotRepos,
            claVersion,
            eligibility: "can_submit",
        });
        return;
    }
    if (eligibility.state === "pending") {
        sendJson(res, 200, {
            authenticated: true,
            login: session.login,
            sourceRepo,
            clabotRepos,
            claVersion,
            eligibility: "pending",
            submittedAt: eligibility.submittedAt,
        });
        return;
    }
    if (eligibility.state === "rejected") {
        sendJson(res, 200, {
            authenticated: true,
            login: session.login,
            sourceRepo,
            clabotRepos,
            claVersion,
            eligibility: "rejected",
            submittedAt: eligibility.submittedAt,
            rejectedAt: eligibility.rejectedAt,
            canResubmit: eligibility.canResubmit,
        });
        return;
    }
    sendJson(res, 200, {
        authenticated: true,
        login: session.login,
        sourceRepo,
        clabotRepos,
        claVersion,
        eligibility: "completed",
        completedAt: eligibility.completedAt,
        completedClaVersion: eligibility.claVersion,
        approvedByLogin: eligibility.approvedByLogin,
        approvedAt: eligibility.approvedAt,
    });
}
