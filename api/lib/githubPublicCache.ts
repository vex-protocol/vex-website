/**
 * In-memory TTL cache for unauthenticated GitHub REST responses used by the public site.
 * Reduces rate limits and duplicate work when many clients load the home / privacy pages.
 */

const store = new Map<string, { expiresAt: number; value: unknown }>();

export async function cachedJson<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
): Promise<T> {
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expiresAt > now) {
        return hit.value as T;
    }
    const value = await fetcher();
    store.set(key, { expiresAt: now + ttlMs, value });
    return value;
}

const GH_HEADERS: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "vex.wtf-public",
};

export async function fetchGithubApiJson(
    path: string,
    searchParams?: Record<string, string>,
): Promise<unknown> {
    const url = new URL(`https://api.github.com/${path.replace(/^\//, "")}`);
    if (searchParams) {
        for (const [k, v] of Object.entries(searchParams)) {
            url.searchParams.set(k, v);
        }
    }
    const res = await fetch(url.toString(), { headers: GH_HEADERS });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`github ${String(res.status)}: ${t.slice(0, 400)}`);
    }
    return res.json() as Promise<unknown>;
}

/** For tests or hot-reload in dev. */
export function clearGithubPublicCache(): void {
    store.clear();
}
