/**
 * OAuth post-login redirect: only same-origin paths, no protocol-relative or open redirects.
 */
export function sanitizeNextPath(
    raw: string | null | undefined
): string | undefined {
    if (raw == null) {
        return undefined;
    }
    const t = raw.trim();
    if (!t.startsWith("/") || t.startsWith("//")) {
        return undefined;
    }
    if (t.includes("://") || t.includes("\\")) {
        return undefined;
    }
    const pathOnly = t.split("?")[0]?.split("#")[0] ?? "";
    if (!pathOnly.startsWith("/")) {
        return undefined;
    }
    if (pathOnly.length > 256) {
        return undefined;
    }
    return pathOnly === "" ? "/" : pathOnly;
}
