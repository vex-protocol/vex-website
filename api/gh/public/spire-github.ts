import type { IncomingMessage, ServerResponse } from "node:http";

import {
    cachedJson,
    fetchGithubApiJson,
} from "../../lib/githubPublicCache";
import { sendJson } from "../../lib/nodeHttp";

const CACHE_KEY = "public:spire-github:v1";
const TTL_MS = 90_000;

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end("Method Not Allowed");
        return;
    }

    try {
        const body = await cachedJson(CACHE_KEY, TTL_MS, async () => {
            const [runs, commits] = await Promise.all([
                fetchGithubApiJson("repos/vex-protocol/spire/actions/runs", {
                    per_page: "1",
                }),
                fetchGithubApiJson("repos/vex-protocol/spire/commits", {
                    per_page: "1",
                }),
            ]);
            return { runs, commits };
        });
        res.setHeader(
            "Cache-Control",
            "public, max-age=60, stale-while-revalidate=120",
        );
        sendJson(res, 200, body);
    } catch (err: unknown) {
        console.error("spire-github", err);
        sendJson(res, 502, { error: "github_unavailable" });
    }
}
