import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
import { readClaAuditEvents } from "../../lib/claAudit";
import { readQueue } from "../../lib/claQueue";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
import { sendJson } from "../../lib/nodeHttp";

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

    const [events, q] = await Promise.all([
        readClaAuditEvents(),
        readQueue(),
    ]);

    sendJson(res, 200, {
        events,
        completedSnapshot: q.completed,
        note:
            events.length === 0
                ? "No audit file entries yet. New submits / approve / reject actions are appended to data/cla-audit.jsonl (override with CLA_AUDIT_PATH)."
                : undefined,
    });
}
