/**
 * Cached paginated fetch of `GET /orgs/{org}/members` for admin checks.
 * Token needs permission to list org members (typically `read:org` on a PAT from an org member).
 */

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
    /** Sorted for display (locale, case-insensitive). */
    members: string[];
    loginsLower: Set<string>;
    expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(org: string, token: string): string {
    return `${org.toLowerCase()}:${token.slice(0, 12)}`;
}

function sortMemberLogins(logins: string[]): string[] {
    return [...logins].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
}

/** Clear cache (e.g. for tests). */
export function clearOrgMembersCache(): void {
    cache.clear();
}

async function getOrgMembersEntry(
    org: string,
    token: string,
): Promise<CacheEntry> {
    const key = cacheKey(org, token);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
        return hit;
    }

    const logins: string[] = [];
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
                logins.push((row as { login: string }).login);
            }
        }

        if (rows.length < perPage) {
            break;
        }
        page += 1;
    }

    const loginsLower = new Set(logins.map((l) => l.toLowerCase()));
    const members = sortMemberLogins(logins);
    const entry: CacheEntry = {
        members,
        loginsLower,
        expiresAt: now + TTL_MS,
    };
    cache.set(key, entry);
    return entry;
}

/**
 * Fetches all member logins for the org (paginated), with in-memory TTL cache.
 */
export async function fetchOrgMemberLogins(
    org: string,
    token: string,
): Promise<Set<string>> {
    const e = await getOrgMembersEntry(org, token);
    return e.loginsLower;
}

/** Sorted logins as returned by GitHub (for admin UI / debugging). */
export async function fetchOrgMemberLoginsSorted(
    org: string,
    token: string,
): Promise<string[]> {
    const e = await getOrgMembersEntry(org, token);
    return e.members;
}

export async function isLoginInOrgMemberList(
    login: string,
    org: string,
    token: string,
): Promise<boolean> {
    const e = await getOrgMembersEntry(org, token);
    return e.loginsLower.has(login.toLowerCase());
}
