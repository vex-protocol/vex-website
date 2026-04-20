/**
 * Cached paginated fetch of `GET /orgs/{org}/members` for admin checks.
 * Token needs permission to list org members (classic: `read:org`; fine-grained: org **Members: Read**).
 *
 * If the list comes back empty (token scope / SAML SSO), we fall back to
 * `GET /orgs/{org}/members/{username}` so membership checks still work.
 */

const TTL_MS = 5 * 60 * 1000;
const EMPTY_LIST_TTL_MS = 60 * 1000;

const GH_HEADERS_BASE: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "vex.wtf-org-members",
};

type CacheEntry = {
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
        a.localeCompare(b, undefined, { sensitivity: "base" })
    );
}

/** Clear cache (e.g. for tests). */
export function clearOrgMembersCache(): void {
    cache.clear();
}

function authHeaders(token: string): Record<string, string> {
    return {
        ...GH_HEADERS_BASE,
        Authorization: `Bearer ${token}`,
    };
}

/**
 * True if the user is a public member (helps debug when /members returns []).
 */
export async function fetchOrgPublicMemberLoginsSorted(
    org: string,
    token: string
): Promise<string[]> {
    const logins: string[] = [];
    let page = 1;
    const perPage = 100;
    for (;;) {
        const url = new URL(
            `https://api.github.com/orgs/${encodeURIComponent(
                org
            )}/public_members`
        );
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));
        const res = await fetch(url.toString(), {
            headers: authHeaders(token),
        });
        if (!res.ok) {
            return [];
        }
        const rows = (await res.json()) as unknown;
        if (!Array.isArray(rows)) {
            return [];
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
    return sortMemberLogins(logins);
}

/** Direct membership check (works when member list is empty due to token limits). */
export async function checkOrgMembershipDirect(
    login: string,
    org: string,
    token: string
): Promise<boolean> {
    const url = `https://api.github.com/orgs/${encodeURIComponent(
        org
    )}/members/${encodeURIComponent(login)}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    return res.status === 204;
}

async function getOrgMembersEntry(
    org: string,
    token: string
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
            `https://api.github.com/orgs/${encodeURIComponent(org)}/members`
        );
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));
        url.searchParams.set("filter", "all");
        url.searchParams.set("role", "all");

        const res = await fetch(url.toString(), {
            headers: authHeaders(token),
        });

        if (!res.ok) {
            const body = await res.text();
            console.error(
                "github_org_members_list",
                org,
                res.status,
                body.slice(0, 500)
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
    const ttl = members.length === 0 ? EMPTY_LIST_TTL_MS : TTL_MS;
    const entry: CacheEntry = {
        members,
        loginsLower,
        expiresAt: now + ttl,
    };
    cache.set(key, entry);
    return entry;
}

export async function fetchOrgMemberLogins(
    org: string,
    token: string
): Promise<Set<string>> {
    const e = await getOrgMembersEntry(org, token);
    return e.loginsLower;
}

export async function fetchOrgMemberLoginsSorted(
    org: string,
    token: string
): Promise<string[]> {
    const e = await getOrgMembersEntry(org, token);
    return e.members;
}

export async function isLoginInOrgMemberList(
    login: string,
    org: string,
    token: string
): Promise<boolean> {
    const e = await getOrgMembersEntry(org, token);
    if (e.loginsLower.has(login.toLowerCase())) {
        return true;
    }
    return checkOrgMembershipDirect(login, org, token);
}
