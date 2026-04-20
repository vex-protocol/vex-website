/**
 * Signed cookie payloads for site OAuth (GitHub) — no secrets in client JS.
 */
import type { IncomingMessage } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomState(): string {
    return randomBytes(24).toString("hex");
}

function sign(secret: string, payload: string): string {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function seal(secret: string, data: Record<string, unknown>): string {
    const payload = Buffer.from(JSON.stringify(data), "utf8").toString(
        "base64url"
    );
    const sig = sign(secret, payload);
    return `${payload}.${sig}`;
}

export function open<T extends Record<string, unknown>>(
    secret: string,
    token: string
): T | null {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) {
        return null;
    }
    const payload = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = sign(secret, payload);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
        return null;
    }
    try {
        if (!timingSafeEqual(a, b)) {
            return null;
        }
    } catch {
        return null;
    }
    try {
        const json = Buffer.from(payload, "base64url").toString("utf8");
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

export function parseCookies(
    header: string | undefined
): Record<string, string> {
    if (!header || header.length === 0) {
        return {};
    }
    const out: Record<string, string> = {};
    for (const part of header.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1) {
            continue;
        }
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        out[k] = decodeURIComponent(v);
    }
    return out;
}

function explicitSiteOrigin(): string | undefined {
    const raw =
        process.env.SITE_ORIGIN?.trim() || process.env.PUBLIC_SITE_URL?.trim();
    if (!raw) return undefined;
    return raw.replace(/\/$/, "");
}

function defaultSiteOriginWithoutExplicit(): string {
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        return `https://${vercel.replace(/^https?:\/\//, "")}`;
    }
    return "http://localhost:5173";
}

/** Public site URL for OAuth redirects (`https://vex.wtf`). Set on any host. */
export function siteOrigin(): string {
    return explicitSiteOrigin() ?? defaultSiteOriginWithoutExplicit();
}

/**
 * OAuth redirect_uri and post-login Location.
 *
 * **Local dev:** Always derive from the incoming `Host` (after Vite proxy) when it is
 * localhost / 127.0.0.1 / ::1 — even if `.env` sets `SITE_ORIGIN` to production. Otherwise
 * `redirect_uri` points at vex.wtf while `Set-Cookie` applies to localhost → GitHub sends
 * you to production and you get `?error=missing_state_cookie`. Same bug if `.env` says
 * `localhost` but you open `127.0.0.1` (cookie host ≠ redirect host).
 *
 * **Production:** Uses `SITE_ORIGIN` / `PUBLIC_SITE_URL` when Host is not local.
 */
export function siteOriginFromRequest(req: IncomingMessage): string {
    const forwardedHost = pickFirstHeader(req.headers["x-forwarded-host"]);
    const host = forwardedHost || pickFirstHeader(req.headers.host);

    if (host && isLocalDevHost(host)) {
        const proto =
            pickFirstHeader(req.headers["x-forwarded-proto"]) || "http";
        return `${proto}://${host}`;
    }

    const explicit = explicitSiteOrigin();
    if (explicit) return explicit;

    return defaultSiteOriginWithoutExplicit();
}

function pickFirstHeader(value: string | string[] | undefined): string {
    if (typeof value === "string" && value.length > 0) {
        return value.split(",")[0]?.trim() ?? "";
    }
    if (Array.isArray(value) && value.length > 0) {
        return value[0]!.split(",")[0]?.trim() ?? "";
    }
    return "";
}

function isLocalDevHost(host: string): boolean {
    return (
        host.startsWith("localhost:") ||
        host === "localhost" ||
        host.startsWith("127.0.0.1:") ||
        host.startsWith("[::1]:")
    );
}
