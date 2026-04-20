import type { IncomingMessage, ServerResponse } from "node:http";

import { GH_SESSION_COOKIE } from "../lib/ghSession";
import { redirect, useSecureCookies } from "../lib/nodeHttp";

const COOKIE_ACCEPTED = "cla_sdk_accepted";
const COOKIE_STATE = "gh_oauth_state";

/**
 * Clears GitHub OAuth session and CLA acceptance cookies, then redirects to `/`.
 */
export default function handler(
    req: IncomingMessage,
    res: ServerResponse
): void {
    if (req.method !== "GET" && req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, POST");
        res.end("Method Not Allowed");
        return;
    }

    const secure = useSecureCookies();
    const flags = [
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0",
        ...(secure ? ["Secure"] : []),
    ].join("; ");

    const clear = (name: string): string => `${name}=; ${flags}`;

    res.setHeader("Set-Cookie", [
        clear(GH_SESSION_COOKIE),
        clear(COOKIE_ACCEPTED),
        clear(COOKIE_STATE),
    ]);
    redirect(res, "/");
}
