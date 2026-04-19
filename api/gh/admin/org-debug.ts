import type { IncomingMessage, ServerResponse } from "node:http";

import { getClaAdminOrgSlug } from "../../lib/claConfig";
import { isClaAdmin } from "../../lib/adminAuth";
import {
    checkOrgMembershipDirect,
    fetchOrgMemberLoginsSorted,
    fetchOrgPublicMemberLoginsSorted,
} from "../../lib/orgMembersList";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
import { sendJson } from "../../lib/nodeHttp";

async function fetchPatOwnerLogin(token: string): Promise<string | null> {
    const res = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "vex.wtf-org-debug",
        },
    });
    if (!res.ok) {
        return null;
    }
    const j = (await res.json()) as { login?: string };
    return typeof j.login === "string" ? j.login : null;
}

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

    const org = getClaAdminOrgSlug();
    const orgToken = process.env.GITHUB_ORG_MEMBERSHIP_TOKEN?.trim();

    if (!orgToken) {
        sendJson(res, 200, {
            org,
            orgFromEnv: Boolean(process.env.CLA_ADMIN_ORG?.trim()),
            tokenConfigured: false,
            members: null,
            memberCount: null,
            publicMemberCount: null,
            yourLoginInList: null,
            patOwnerLogin: null,
            hint: null,
            error:
                "GITHUB_ORG_MEMBERSHIP_TOKEN is not set — add a PAT to vex.wtf/.env and restart the API server (see .env.example).",
        });
        return;
    }

    try {
        const [members, publicMembers, patOwnerLogin] = await Promise.all([
            fetchOrgMemberLoginsSorted(org, orgToken),
            fetchOrgPublicMemberLoginsSorted(org, orgToken),
            fetchPatOwnerLogin(orgToken),
        ]);

        const inFullList = members.some(
            (m) => m.toLowerCase() === session.login.toLowerCase(),
        );
        const yourLoginInList =
            inFullList ||
            (await checkOrgMembershipDirect(
                session.login,
                org,
                orgToken,
            ));

        let hint: string | null = null;
        if (members.length === 0 && publicMembers.length > 0) {
            hint =
                "The full member list is empty but public members were found. Fine-grained PAT: ensure the token is owned by the **Organization** with **Members → Read**. If the org uses SAML SSO, authorize this PAT for the org (GitHub → Organization → Settings → Personal access tokens).";
        } else if (members.length === 0 && publicMembers.length === 0) {
            hint =
                "GitHub returned no members for this org. Confirm the org slug matches GitHub (e.g. vex-protocol), the PAT has read:org / Members: Read, and SSO is authorized if required.";
        }

        sendJson(res, 200, {
            org,
            orgFromEnv: Boolean(process.env.CLA_ADMIN_ORG?.trim()),
            tokenConfigured: true,
            members,
            memberCount: members.length,
            publicMemberCount: publicMembers.length,
            yourLoginInList,
            patOwnerLogin,
            hint,
            error: null,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendJson(res, 200, {
            org,
            orgFromEnv: Boolean(process.env.CLA_ADMIN_ORG?.trim()),
            tokenConfigured: true,
            members: null,
            memberCount: null,
            publicMemberCount: null,
            yourLoginInList: null,
            patOwnerLogin: null,
            hint: null,
            error: msg,
        });
    }
}
