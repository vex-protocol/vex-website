import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
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

    if (!(await isClaAdmin(session.login))) {
        sendJson(res, 403, { error: "forbidden" });
        return;
    }

    const q = await readQueue();
    sendJson(res, 200, { pending: q.pending });
}
