/**
 * Optional enforcement: signed-in GitHub user must have at least one open pull request
 * in an org or in specific repos (GitHub Search API).
 *
 * Set `CLA_PR_CHECK_ORG` (e.g. vex-protocol) and/or `CLA_PR_CHECK_REPOS` (comma-separated owner/repo).
 * `GITHUB_CLA_PR_CHECK_TOKEN` is strongly recommended (higher rate limits; required for some queries).
 */

function buildSearchQuery(login: string): string | null {
    const org = process.env.CLA_PR_CHECK_ORG?.trim();
    const reposRaw = process.env.CLA_PR_CHECK_REPOS?.trim();

    if (org) {
        return `is:pr is:open author:${login} org:${org}`;
    }

    if (reposRaw) {
        const repos = reposRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (repos.length === 0) {
            return null;
        }
        if (repos.length === 1) {
            return `is:pr is:open author:${login} repo:${repos[0]}`;
        }
        const orRepos = repos.map((r) => `repo:${r}`).join(" OR ");
        return `is:pr is:open author:${login} (${orRepos})`;
    }

    return null;
}

export function isPrCheckConfigured(): boolean {
    return !!(
        process.env.CLA_PR_CHECK_ORG?.trim() ||
        process.env.CLA_PR_CHECK_REPOS?.trim()
    );
}

export type OpenPrCheckResult =
    | { ok: true; count: number }
    | {
          ok: false;
          error: "github_error";
          status?: number;
          detail?: string;
      };

/**
 * Returns whether `login` has ≥1 open PR matching org/repos filters.
 */
export async function checkAuthorHasOpenPullRequest(
    login: string
): Promise<OpenPrCheckResult> {
    const q = buildSearchQuery(login);
    if (!q) {
        return { ok: true, count: 0 };
    }

    const token = process.env.GITHUB_CLA_PR_CHECK_TOKEN?.trim();
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
        q
    )}&per_page=1`;

    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "vex.wtf-cla-pr-check",
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
        const detail = await res.text();
        return {
            ok: false,
            error: "github_error",
            status: res.status,
            detail: detail.slice(0, 500),
        };
    }

    const data = (await res.json()) as { total_count?: number };
    const count = typeof data.total_count === "number" ? data.total_count : 0;
    return { ok: true, count };
}
