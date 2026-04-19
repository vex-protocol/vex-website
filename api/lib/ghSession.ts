import type { IncomingMessage } from "node:http";

import { open, parseCookies } from "./siteSession";

export const GH_SESSION_COOKIE = "gh_session";

export type GithubSessionPayload = {
    v: number;
    login: string;
    id: number;
    exp: number;
    /** Present when user signed in with `read:org`; server-side only */
    oauth_access_token?: string;
};

export function readGithubSession(
    req: IncomingMessage,
    secret: string,
): GithubSessionPayload | null {
    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[GH_SESSION_COOKIE];
    if (!raw) {
        return null;
    }
    const session = open<GithubSessionPayload>(secret, raw);
    if (
        !session ||
        session.v !== 1 ||
        typeof session.login !== "string" ||
        typeof session.id !== "number" ||
        typeof session.exp !== "number" ||
        session.exp < Date.now() / 1000
    ) {
        return null;
    }
    if (
        session.oauth_access_token !== undefined &&
        typeof session.oauth_access_token !== "string"
    ) {
        return null;
    }
    return session;
}
