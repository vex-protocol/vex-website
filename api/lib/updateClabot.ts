type ClabotJson = {
    contributors: string[];
    label?: string;
    message?: string;
    recheckComment?: string;
};

export type ClabotUpdateResult =
    | { repo: string; ok: true; skipped?: boolean }
    | { repo: string; ok: false; error: string };

export async function addContributorToClabotRepo(
    token: string,
    owner: string,
    repo: string,
    login: string,
): Promise<ClabotUpdateResult> {
    const repoKey = `${owner}/${repo}`;
    const filePath = ".clabot";
    const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "vex.wtf-clabot",
            },
        },
    );

    if (!getRes.ok) {
        return {
            repo: repoKey,
            ok: false,
            error: `GET .clabot failed: ${String(getRes.status)}`,
        };
    }

    const file = (await getRes.json()) as {
        content?: string;
        sha?: string;
        encoding?: string;
    };
    if (!file.content || !file.sha) {
        return { repo: repoKey, ok: false, error: "missing_content_or_sha" };
    }

    const decoded = Buffer.from(file.content, "base64").toString("utf8");
    let json: ClabotJson;
    try {
        json = JSON.parse(decoded) as ClabotJson;
    } catch {
        return { repo: repoKey, ok: false, error: "invalid_json" };
    }

    if (!Array.isArray(json.contributors)) {
        json.contributors = [];
    }

    const normalized = login.trim();
    if (json.contributors.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
        return { repo: repoKey, ok: true, skipped: true };
    }

    json.contributors.push(normalized);
    json.contributors.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    const newBody = JSON.stringify(json, null, 2) + "\n";
    const content = Buffer.from(newBody, "utf8").toString("base64");

    const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `chore: add ${normalized} to CLA contributors`,
                content,
                sha: file.sha,
            }),
        },
    );

    if (!putRes.ok) {
        const text = await putRes.text();
        return {
            repo: repoKey,
            ok: false,
            error: text.slice(0, 400),
        };
    }

    return { repo: repoKey, ok: true };
}

export function parseRepoList(raw: string | undefined): Array<{
    owner: string;
    repo: string;
}> {
    if (!raw?.trim()) {
        return [];
    }
    const out: Array<{ owner: string; repo: string }> = [];
    for (const part of raw.split(",")) {
        const s = part.trim();
        const bits = s.split("/").filter(Boolean);
        if (bits.length === 2) {
            out.push({ owner: bits[0], repo: bits[1] });
        }
    }
    return out;
}
