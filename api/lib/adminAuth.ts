/**
 * Who can use `/cla-admin` and the Admin menu:
 *
 * 1. **`CLA_ADMIN_LOGINS`** — If set (comma-separated GitHub usernames), **only** those
 *    users are admins (overrides everything else).
 * 2. Otherwise, any of the following (combined with OR):
 *    - **`CLA_ADMIN_ORG` + `GITHUB_ORG_MEMBERSHIP_TOKEN`** — user is a member of that
 *      org (`GET /orgs/{org}/members/{username}` → 204). The token must be a PAT from an
 *      account that is allowed to query org membership (typically `read:org` on a user/bot
 *      that belongs to the org).
 *    - **`GITHUB_CLA_ADMIN_TOKEN` + `CLA_ADMIN_REPO`** — user has **write**, **maintain**,
 *      or **admin** on that `owner/repo`.
 */

async function hasRepoWriteAccess(
    login: string,
    token: string,
    owner: string,
    repo: string,
): Promise<boolean> {
    const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}/permission`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "vex.wtf-cla-admin",
            },
        },
    );

    if (!res.ok) {
        return false;
    }

    const j = (await res.json()) as { permission?: string };
    const p = j.permission;
    return p === "admin" || p === "maintain" || p === "write";
}

async function isOrgMember(
    org: string,
    login: string,
    token: string,
): Promise<boolean> {
    const res = await fetch(
        `https://api.github.com/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(login)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "vex.wtf-cla-admin",
            },
        },
    );
    return res.status === 204;
}

export async function isClaAdmin(login: string): Promise<boolean> {
    const allow = process.env.CLA_ADMIN_LOGINS?.trim();
    if (allow) {
        const set = new Set(
            allow
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
        );
        return set.has(login.toLowerCase());
    }

    const org = process.env.CLA_ADMIN_ORG?.trim();
    const orgToken = process.env.GITHUB_ORG_MEMBERSHIP_TOKEN?.trim();
    if (org && orgToken) {
        if (await isOrgMember(org, login, orgToken)) {
            return true;
        }
    }

    const token = process.env.GITHUB_CLA_ADMIN_TOKEN?.trim();
    const repoFull = process.env.CLA_ADMIN_REPO?.trim();
    if (token && repoFull) {
        const parts = repoFull.split("/").filter(Boolean);
        if (parts.length === 2) {
            const [owner, repo] = parts;
            if (await hasRepoWriteAccess(login, token, owner, repo)) {
                return true;
            }
        }
    }

    return false;
}
