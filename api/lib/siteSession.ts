/**
 * Signed cookie payloads for site OAuth (GitHub) — no secrets in client JS.
 */
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

/** Public site URL for OAuth redirects (`https://vex.wtf`). Set on any host. */
export function siteOrigin(): string {
    const explicit =
        process.env.SITE_ORIGIN?.trim() || process.env.PUBLIC_SITE_URL?.trim();
    if (explicit) {
        return explicit.replace(/\/$/, "");
    }
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        return `https://${vercel.replace(/^https?:\/\//, "")}`;
    }
    return "http://localhost:5173";
}
