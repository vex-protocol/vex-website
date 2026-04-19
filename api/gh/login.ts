import type { IncomingMessage, ServerResponse } from "node:http";

import {
    ghOAuthConfigHint,
    ghOAuthMissingForLogin,
    getSessionSecret,
} from "../lib/ghOAuthEnv";
import {
    randomState,
    seal,
    siteOrigin,
} from "../lib/siteSession";
import { redirect, sendText, useSecureCookies } from "../lib/nodeHttp";

const COOKIE_STATE = "gh_oauth_state";

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

    const missing = ghOAuthMissingForLogin();
    if (missing.length > 0) {
        sendText(res, 503, ghOAuthConfigHint(missing));
        return;
    }
    const secret = getSessionSecret()!;
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID!.trim();

    const state = randomState();
    const exp = Math.floor(Date.now() / 1000) + 600;
    const sealed = seal(secret, { s: state, exp });

    const origin = siteOrigin();
    const redirectUri = `${origin}/api/gh/callback`;

    const secure = useSecureCookies();
    const cookie = [
        `${COOKIE_STATE}=${encodeURIComponent(sealed)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=600",
        ...(secure ? ["Secure"] : []),
    ].join("; ");

    res.setHeader("Set-Cookie", cookie);
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:user",
        state,
    });
    redirect(
        res,
        `https://github.com/login/oauth/authorize?${params.toString()}`,
    );
}
