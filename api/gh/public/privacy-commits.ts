import type { IncomingMessage, ServerResponse } from "node:http";

import {
    cachedJson,
    fetchGithubApiJson,
} from "../../lib/githubPublicCache";
import { sendJson } from "../../lib/nodeHttp";

const CACHE_KEY = "public:privacy-commits:v1";
const TTL_MS = 120_000;

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
        const body = await cachedJson(CACHE_KEY, TTL_MS, async () =>
            fetchGithubApiJson("repos/vex-chat/privacy-policy/commits", {
                sha: "main",
                per_page: "3",
            }),
        );
        res.setHeader(
            "Cache-Control",
            "public, max-age=90, stale-while-revalidate=180",
        );
        sendJson(res, 200, body);
    } catch (err: unknown) {
        console.error("privacy-commits", err);
        sendJson(res, 502, { error: "github_unavailable" });
    }
}
