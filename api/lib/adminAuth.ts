/**
 * Who can use `/cla-admin` and the Admin menu:
 *
 * 1. **`CLA_ADMIN_LOGINS`** — If set (comma-separated GitHub usernames), **only** those
 *    users are admins (overrides everything else). Use when org membership is private or
 *    the GitHub org member list API is not usable.
 * 2. Otherwise, any of the following (OR):
 *    - **Org membership** — org slug defaults to **`vex-protocol`**; override with `CLA_ADMIN_ORG`.
 *      With `GITHUB_ORG_MEMBERSHIP_TOKEN`: paginate `GET /orgs/{org}/members`, cache ~5m.
 *      Without that token: session `oauth_access_token` + `GET /user/memberships/orgs/{org}`.
 *    - **`CLA_ADMIN_REPO` + `GITHUB_CLA_ADMIN_TOKEN`** — user has **write+** on that repo.
 */

import { getClaAdminOrgSlug } from "./claConfig";
import { isLoginInOrgMemberList } from "./orgMembersList";

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

/** When no PAT is available to list members; uses the signed-in user’s OAuth token. */
async function userMembershipActive(
    oauthAccessToken: string,
    orgSlug: string,
): Promise<boolean> {
    const res = await fetch(
        `https://api.github.com/user/memberships/orgs/${encodeURIComponent(orgSlug)}`,
        {
            headers: {
                Authorization: `Bearer ${oauthAccessToken}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "vex.wtf-cla-admin",
            },
        },
    );
    if (res.status !== 200) {
        if (res.status !== 404) {
            const body = await res.text();
            console.error(
                "github_user_org_membership",
                orgSlug,
                res.status,
                body.slice(0, 400),
            );
        }
        return false;
    }
    const data = (await res.json()) as { state?: string };
    return data.state === "active";
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

    const org = getClaAdminOrgSlug();
    const orgToken = process.env.GITHUB_ORG_MEMBERSHIP_TOKEN?.trim();

    if (orgToken) {
        try {
            if (await isLoginInOrgMemberList(login, org, orgToken)) {
                return true;
            }
        } catch (err: unknown) {
            console.error("cla_admin_org_list_check", err);
        }
    } else if (oauthAccessToken) {
        if (await userMembershipActive(oauthAccessToken, org)) {
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
