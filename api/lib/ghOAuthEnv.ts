/** GitHub OAuth + signed-session env checks. */

export function getSessionSecret(): string | undefined {
    return (
        process.env.SESSION_SECRET?.trim() ||
        process.env.CLA_SESSION_SECRET?.trim()
    );
}

export function ghOAuthMissingForLogin(): string[] {
    const missing: string[] = [];
    if (!getSessionSecret()) {
        missing.push("SESSION_SECRET (or CLA_SESSION_SECRET)");
    }
    if (!process.env.GITHUB_OAUTH_CLIENT_ID?.trim()) {
        missing.push("GITHUB_OAUTH_CLIENT_ID");
    }
    return missing;
}

export function ghOAuthMissingForCallback(): string[] {
    const missing: string[] = [];
    if (!getSessionSecret()) {
        missing.push("SESSION_SECRET (or CLA_SESSION_SECRET)");
    }
    if (!process.env.GITHUB_OAUTH_CLIENT_ID?.trim()) {
        missing.push("GITHUB_OAUTH_CLIENT_ID");
    }
    if (!process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim()) {
        missing.push("GITHUB_OAUTH_CLIENT_SECRET");
    }
    return missing;
}

export function ghOAuthConfigHint(missing: string[]): string {
    return [
        "GitHub OAuth is not configured.",
        missing.length > 0
            ? `Missing: ${missing.join(", ")}.`
            : "Required variables are empty.",
        "Create vex.wtf/.env from .env.example, set SITE_ORIGIN (e.g. http://localhost:5173),",
        "SESSION_SECRET (openssl rand -hex 32), and GitHub OAuth App credentials.",
        "Run npm run dev:all from vex.wtf so Vite proxies /api to the local API server.",
    ].join(" ");
}
