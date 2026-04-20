import { parseRepoList } from "./updateClabot";

/** Repo whose CLA.md is shown on `/cla` (owner/repo). */
export function getClaSourceRepoFullName(): string {
    const raw = process.env.CLA_SOURCE_REPO?.trim();
    if (raw) {
        const parts = raw.split("/").filter(Boolean);
        if (parts.length === 2) {
            return `${parts[0]}/${parts[1]}`;
        }
    }
    return "vex-protocol/clabot-config";
}

/** Repos where approving updates `.clabot` (from env). */
export function getClabotRepoFullNames(): string[] {
    return parseRepoList(process.env.CLA_BOT_REPOS).map(
        (r) => `${r.owner}/${r.repo}`
    );
}

export function getClaSdkVersion(): string {
    return process.env.CLA_SDK_VERSION?.trim() ?? "1";
}

/**
 * GitHub org slug for admin membership checks (`/orgs/{org}/members`, etc.).
 * Defaults to `vex-protocol` for this project — override with `CLA_ADMIN_ORG` in `.env`.
 */
export function getClaAdminOrgSlug(): string {
    return process.env.CLA_ADMIN_ORG?.trim() || "vex-protocol";
}
