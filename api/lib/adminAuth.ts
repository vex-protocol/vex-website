/**
 * CLA dashboard admins:
 * - If `CLA_ADMIN_LOGINS` is set (comma-separated), **only** those logins are admins.
 * - Otherwise: `GITHUB_CLA_ADMIN_TOKEN` + `CLA_ADMIN_REPO` (owner/repo) — users with
 *   **write**, **maintain**, or **admin** on that repo.
 */
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

    const token = process.env.GITHUB_CLA_ADMIN_TOKEN?.trim();
    const repoFull = process.env.CLA_ADMIN_REPO?.trim();
    if (!token || !repoFull) {
        return false;
    }

    const parts = repoFull.split("/").filter(Boolean);
    if (parts.length !== 2) {
        return false;
    }
    const [owner, repo] = parts;

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
