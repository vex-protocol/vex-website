import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
import { fetchOrgMemberLoginsSorted } from "../../lib/orgMembersList";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
import { sendJson } from "../../lib/nodeHttp";

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

    const secret = getSessionSecret();
    if (!secret) {
        sendJson(res, 503, { error: "not_configured" });
        return;
    }

    const session = readGithubSession(req, secret);
    if (!session) {
        sendJson(res, 401, { error: "not_signed_in" });
        return;
    }

    if (!(await isClaAdmin(session.login, session.oauth_access_token))) {
        sendJson(res, 403, { error: "forbidden" });
        return;
    }

    const org = process.env.CLA_ADMIN_ORG?.trim() ?? null;
    const orgToken = process.env.GITHUB_ORG_MEMBERSHIP_TOKEN?.trim();

    if (!org) {
        sendJson(res, 200, {
            org: null,
            tokenConfigured: false,
            members: null,
            memberCount: null,
            yourLoginInList: null,
            error: "CLA_ADMIN_ORG is not set",
        });
        return;
    }

    if (!orgToken) {
        sendJson(res, 200, {
            org,
            tokenConfigured: false,
            members: null,
            memberCount: null,
            yourLoginInList: null,
            error: "GITHUB_ORG_MEMBERSHIP_TOKEN is not set — cannot list members",
        });
        return;
    }

    try {
        const members = await fetchOrgMemberLoginsSorted(org, orgToken);
        const yourLoginInList = members.some(
            (m) => m.toLowerCase() === session.login.toLowerCase(),
        );
        sendJson(res, 200, {
            org,
            tokenConfigured: true,
            members,
            memberCount: members.length,
            yourLoginInList,
            error: null,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendJson(res, 200, {
            org,
            tokenConfigured: true,
            members: null,
            memberCount: null,
            yourLoginInList: null,
            error: msg,
        });
    }
}
