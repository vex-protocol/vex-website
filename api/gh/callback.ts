import type { IncomingMessage, ServerResponse } from "node:http";

import {
    ghOAuthConfigHint,
    ghOAuthMissingForCallback,
    getSessionSecret,
} from "../lib/ghOAuthEnv";
import {
    open,
    parseCookies,
    seal,
    siteOrigin,
} from "../lib/siteSession";
import { redirect, useSecureCookies } from "../lib/nodeHttp";

const COOKIE_STATE = "gh_oauth_state";
const COOKIE_SESSION = "gh_session";

type StateCookie = { s: string; exp: number };
type GithubSession = {
    v: number;
    login: string;
    id: number;
    exp: number;
};

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

    const missing = ghOAuthMissingForCallback();
    if (missing.length > 0) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(ghOAuthConfigHint(missing));
        return;
    }
    const secret = getSessionSecret()!;
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID!.trim();
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET!.trim();

    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
    );
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const err = url.searchParams.get("error") ?? "";

    const origin = siteOrigin();
    const homeUrl = `${origin}/`;

    if (err) {
        redirect(res, `${homeUrl}?error=${encodeURIComponent(err)}`);
        return;
    }

    if (!code || !state) {
        redirect(res, `${homeUrl}?error=missing_code`);
        return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const rawState = cookies[COOKIE_STATE];
    if (!rawState) {
        redirect(res, `${homeUrl}?error=missing_state_cookie`);
        return;
    }

    const parsed = open<StateCookie>(secret, rawState);
    if (!parsed || parsed.s !== state || parsed.exp < Date.now() / 1000) {
        redirect(res, `${homeUrl}?error=invalid_state`);
        return;
    }

    const redirectUri = `${origin}/api/gh/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }),
    });

    const tokenJson: unknown = await tokenRes.json();
    const accessToken =
        typeof tokenJson === "object" &&
        tokenJson !== null &&
        "access_token" in tokenJson &&
        typeof (tokenJson as { access_token: unknown }).access_token === "string"
            ? (tokenJson as { access_token: string }).access_token
            : null;

    if (!accessToken) {
        redirect(res, `${homeUrl}?error=token_exchange`);
        return;
    }

    const userRes = await fetch("https://api.github.com/user", {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "vex.wtf-oauth",
        },
    });

    const userJson: unknown = await userRes.json();
    const login =
        typeof userJson === "object" &&
        userJson !== null &&
        "login" in userJson &&
        typeof (userJson as { login: unknown }).login === "string"
            ? (userJson as { login: string }).login
            : null;
    const id =
        typeof userJson === "object" &&
        userJson !== null &&
        "id" in userJson &&
        typeof (userJson as { id: unknown }).id === "number"
            ? (userJson as { id: number }).id
            : null;

    if (!login || id === null) {
        redirect(res, `${homeUrl}?error=github_user`);
        return;
    }

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const session: GithubSession = { v: 1, login, id, exp };
    const sealedSession = seal(secret, session as unknown as Record<string, unknown>);

    const secure = useSecureCookies();

    const clearState = `${COOKIE_STATE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
    const setSession = [
        `${COOKIE_SESSION}=${encodeURIComponent(sealedSession)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=3600",
        ...(secure ? ["Secure"] : []),
    ].join("; ");

    res.setHeader("Set-Cookie", [clearState, setSession]);
    redirect(res, `${homeUrl}?signed_in=1`);
}
