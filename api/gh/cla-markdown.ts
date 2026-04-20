import type { IncomingMessage, ServerResponse } from "node:http";

import { getClaSourceRepoFullName } from "../lib/claConfig";
import { cachedJson } from "../lib/githubPublicCache";
import { sendJson } from "../lib/nodeHttp";

const TTL_MS = 5 * 60 * 1000;

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> {
    if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end("Method Not Allowed");
        return;
    }

    const sourceRepo = getClaSourceRepoFullName();
    const cacheKey = `cla-markdown:${sourceRepo}`;

    try {
        const text = await cachedJson(cacheKey, TTL_MS, async () => {
            const url = `https://raw.githubusercontent.com/${sourceRepo}/main/CLA.md`;
            const r = await fetch(url, {
                headers: { "User-Agent": "vex.wtf-cla-markdown" },
            });
            if (!r.ok) {
                throw new Error(`raw_cla:${String(r.status)}`);
            }
            return r.text();
        });
        res.setHeader(
            "Cache-Control",
            "public, max-age=120, stale-while-revalidate=300"
        );
        sendJson(res, 200, { text, sourceRepo });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("cla_markdown", sourceRepo, msg);
        sendJson(res, 502, { error: "fetch_failed", sourceRepo });
    }
}
