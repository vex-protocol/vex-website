import type { IncomingMessage, ServerResponse } from "node:http";

import { getSessionSecret } from "../lib/ghOAuthEnv";
import { readGithubSession } from "../lib/ghSession";
import { sendJson } from "../lib/nodeHttp";

export default function handler(
    req: IncomingMessage,
    res: ServerResponse
): void {
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
        sendJson(res, 200, { authenticated: false });
        return;
    }

    sendJson(res, 200, {
        authenticated: true,
        login: session.login,
        id: session.id,
    });
}
