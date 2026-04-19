/**
 * Who can use `/cla-admin` and the Admin menu:
 *
 * 1. **`CLA_ADMIN_LOGINS`** — If set (comma-separated GitHub usernames), **only** those
 *    users are admins (overrides everything else).
 * 2. Otherwise, any of the following (OR):
 *    - **`CLA_ADMIN_ORG`** + the signed-in user’s OAuth token (stored in session; requires
 *      `read:org` and `GET /user/orgs`) — **no server PAT needed** for org membership.
 *    - **`CLA_ADMIN_ORG` + `GITHUB_ORG_MEMBERSHIP_TOKEN`** — `GET /orgs/{org}/members/{username}`.
 *    - **`CLA_ADMIN_REPO` + `GITHUB_CLA_ADMIN_TOKEN`** — user has **write+** on that repo.
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

/** Whether the OAuth user’s token lists `org` in `GET /user/orgs` (paginated). */
async function userBelongsToOrg(
    oauthAccessToken: string,
    orgSlug: string,
): Promise<boolean> {
    const want = orgSlug.toLowerCase();
    let page = 1;
    const perPage = 100;
    for (;;) {
        const res = await fetch(
            `https://api.github.com/user/orgs?per_page=${String(perPage)}&page=${String(page)}`,
            {
                headers: {
                    Authorization: `Bearer ${oauthAccessToken}`,
                    Accept: "application/vnd.github+json",
                    "User-Agent": "vex.wtf-cla-admin",
                },
            },
        );
        if (!res.ok) {
            return false;
        }
        const orgs = (await res.json()) as unknown;
        if (!Array.isArray(orgs) || orgs.length === 0) {
            return false;
        }
        for (const o of orgs) {
            if (
                typeof o === "object" &&
                o !== null &&
                "login" in o &&
                typeof (o as { login: string }).login === "string" &&
                (o as { login: string }).login.toLowerCase() === want
            ) {
                return true;
            }
        }
        if (orgs.length < perPage) {
            return false;
        }
        page += 1;
    }
}

export async function isClaAdmin(
    login: string,
    oauthAccessToken?: string | null,
): Promise<boolean> {
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
    if (org) {
        if (oauthAccessToken && (await userBelongsToOrg(oauthAccessToken, org))) {
            return true;
        }
        const orgToken = process.env.GITHUB_ORG_MEMBERSHIP_TOKEN?.trim();
        if (orgToken && (await isOrgMember(org, login, orgToken))) {
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
