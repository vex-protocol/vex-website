/**
 * Cached paginated fetch of `GET /orgs/{org}/members` for admin checks.
 * Token needs permission to list org members (typically `read:org` on a PAT from an org member).
 */

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { logins: Set<string>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(org: string, token: string): string {
    return `${org.toLowerCase()}:${token.slice(0, 12)}`;
}

/** Clear cache (e.g. for tests). */
export function clearOrgMembersCache(): void {
    cache.clear();
}

/**
 * Fetches all member logins for the org (paginated), with in-memory TTL cache.
 */
export async function fetchOrgMemberLogins(
    org: string,
    token: string,
): Promise<Set<string>> {
    const key = cacheKey(org, token);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
        return hit.logins;
    }

    const logins = new Set<string>();
    let page = 1;
    const perPage = 100;

    for (;;) {
        const url = new URL(
            `https://api.github.com/orgs/${encodeURIComponent(org)}/members`,
        );
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));

        const res = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "vex.wtf-org-members",
            },
        });

        if (!res.ok) {
            const body = await res.text();
            console.error(
                "github_org_members_list",
                org,
                res.status,
                body.slice(0, 500),
            );
            throw new Error(`github_org_members:${String(res.status)}`);
        }

        const rows = (await res.json()) as unknown;
        if (!Array.isArray(rows)) {
            throw new Error("github_org_members:invalid_json");
        }

        for (const row of rows) {
            if (
                typeof row === "object" &&
                row !== null &&
                "login" in row &&
                typeof (row as { login: string }).login === "string"
            ) {
                logins.add((row as { login: string }).login.toLowerCase());
            }
        }

        if (rows.length < perPage) {
            break;
        }
        page += 1;
    }

    cache.set(key, { logins, expiresAt: now + TTL_MS });
    return logins;
}

export async function isLoginInOrgMemberList(
    login: string,
    org: string,
    token: string,
): Promise<boolean> {
    const logins = await fetchOrgMemberLogins(org, token);
    return logins.has(login.toLowerCase());
}
