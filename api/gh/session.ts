import type { IncomingMessage, ServerResponse } from "node:http";

import { getSessionSecret } from "../lib/ghOAuthEnv";
import { open, parseCookies } from "../lib/siteSession";
import { sendJson } from "../lib/nodeHttp";

const COOKIE_SESSION = "gh_session";

type GithubSession = {
    v: number;
    login: string;
    id: number;
    exp: number;
};

export default function handler(
    req: IncomingMessage,
    res: ServerResponse,
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

    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[COOKIE_SESSION];
    if (!raw) {
        sendJson(res, 200, { authenticated: false });
        return;
    }

    const session = open<GithubSession>(secret, raw);
    if (
        !session ||
        session.v !== 1 ||
        typeof session.login !== "string" ||
        typeof session.id !== "number" ||
        typeof session.exp !== "number" ||
        session.exp < Date.now() / 1000
    ) {
        sendJson(res, 200, { authenticated: false });
        return;
    }

    sendJson(res, 200, {
        authenticated: true,
        login: session.login,
        id: session.id,
    });
}
