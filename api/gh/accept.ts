import type { IncomingMessage, ServerResponse } from "node:http";

import { getSessionSecret } from "../lib/ghOAuthEnv";
import { open, parseCookies, seal } from "../lib/siteSession";
import {
    readJsonBody,
    sendJson,
    useSecureCookies,
} from "../lib/nodeHttp";

const COOKIE_SESSION = "gh_session";
const COOKIE_ACCEPTED = "cla_sdk_accepted";

const CLA_SDK_VERSION = process.env.CLA_SDK_VERSION?.trim() ?? "1";

type GithubSession = {
    v: number;
    login: string;
    id: number;
    exp: number;
};

type AcceptedCookie = {
    v: number;
    login: string;
    id: number;
    claVersion: string;
    at: string;
    exp: number;
};

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        const origin = process.env.SITE_ORIGIN?.trim();
        if (origin) {
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "POST, OPTIONS");
        res.end("Method Not Allowed");
        return;
    }

    const origin = process.env.SITE_ORIGIN?.trim();
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    const secret = getSessionSecret();
    if (!secret) {
        sendJson(res, 503, { error: "not_configured" });
        return;
    }

    let body: unknown;
    try {
        body = await readJsonBody(req);
    } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
    }

    const agreed =
        typeof body === "object" &&
        body !== null &&
        "agreed" in body &&
        (body as { agreed: unknown }).agreed === true;

    if (!agreed) {
        sendJson(res, 400, { error: "must_agree" });
        return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[COOKIE_SESSION];
    if (!raw) {
        sendJson(res, 401, { error: "not_signed_in" });
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
        sendJson(res, 401, { error: "session_expired" });
        return;
    }

    const at = new Date().toISOString();
    const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

    const accepted: AcceptedCookie = {
        v: 1,
        login: session.login,
        id: session.id,
        claVersion: CLA_SDK_VERSION,
        at,
        exp,
    };

    const sealedAccepted = seal(
        secret,
        accepted as unknown as Record<string, unknown>,
    );

    const secure = useSecureCookies();

    const clearSession = `${COOKIE_SESSION}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
    const setAccepted = [
        `${COOKIE_ACCEPTED}=${encodeURIComponent(sealedAccepted)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${365 * 24 * 3600}`,
        ...(secure ? ["Secure"] : []),
    ].join("; ");

    res.setHeader("Set-Cookie", [clearSession, setAccepted]);

    console.log(
        JSON.stringify({
            type: "cla_sdk_accepted",
            github_login: session.login,
            github_id: session.id,
            cla_version: CLA_SDK_VERSION,
            at,
        }),
    );

    sendJson(res, 200, {
        ok: true,
        login: session.login,
        claVersion: CLA_SDK_VERSION,
        at,
    });
}
