import type { IncomingMessage, ServerResponse } from "node:http";

import { isClaAdmin } from "../../lib/adminAuth";
import { readClaAuditEvents } from "../../lib/claAudit";
import {
    getClabotRepoFullNames,
    getClaSdkVersion,
    getClaSourceRepoFullName,
} from "../../lib/claConfig";
import { readQueue } from "../../lib/claQueue";
import { getSessionSecret } from "../../lib/ghOAuthEnv";
import { readGithubSession } from "../../lib/ghSession";
import { sendJson } from "../../lib/nodeHttp";

export type ContributorViewRow = {
    login: string;
    avatarUrl: string;
    claVersionLabel: string;
    submittedAt: string;
    decidedAt: string | null;
    actorLogin: string | null;
    status: "pending_review" | "approved" | "rejected" | "cleared_to_resubmit";
    statusLabel: string;
    /** Which admin buttons to show for this row */
    actions: "approve_reject" | "allow_resubmit" | "none";
};

function githubAvatarUrl(login: string): string {
    return `https://github.com/${encodeURIComponent(login)}.png`;
}

function claVersionLabel(v: string): string {
    const t = v.trim();
    return t ? `Version ${t}` : "Version —";
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

    const [q, eventsNewestFirst] = await Promise.all([
        readQueue(),
        readClaAuditEvents(),
    ]);

    const events = [...eventsNewestFirst].reverse();

    const approveMeta = new Map<
        string,
        { actor: string; at: string }
    >();
    const rejectMeta = new Map<string, { actor: string; at: string }>();
    for (const ev of events) {
        const key = ev.login.toLowerCase();
        if (ev.kind === "approve") {
            approveMeta.set(key, { actor: ev.actor, at: ev.at });
        } else if (ev.kind === "reject") {
            rejectMeta.set(key, { actor: ev.actor, at: ev.at });
        }
    }

    const rows: ContributorViewRow[] = [];

    for (const p of q.pending) {
        rows.push({
            login: p.login,
            avatarUrl: githubAvatarUrl(p.login),
            claVersionLabel: claVersionLabel(p.claVersion),
            submittedAt: p.at,
            decidedAt: null,
            actorLogin: null,
            status: "pending_review",
            statusLabel: "Awaiting review",
            actions: "approve_reject",
        });
    }

    for (const r of q.rejected) {
        const lower = r.login.toLowerCase();
        const cleared = q.resubmitAllowed.includes(lower);
        const rej = rejectMeta.get(lower);
        rows.push({
            login: r.login,
            avatarUrl: githubAvatarUrl(r.login),
            claVersionLabel: claVersionLabel(r.claVersion),
            submittedAt: r.submittedAt,
            decidedAt: r.rejectedAt,
            actorLogin: rej?.actor ?? null,
            status: cleared ? "cleared_to_resubmit" : "rejected",
            statusLabel: cleared
                ? "Declined — cleared to sign again"
                : "Declined",
            actions: cleared ? "none" : "allow_resubmit",
        });
    }

    for (const c of q.completed) {
        const lower = c.login.toLowerCase();
        const ap = approveMeta.get(lower);
        rows.push({
            login: c.login,
            avatarUrl: githubAvatarUrl(c.login),
            claVersionLabel: claVersionLabel(c.claVersion),
            submittedAt: c.at,
            decidedAt: ap?.at ?? null,
            actorLogin: ap?.actor ?? null,
            status: "approved",
            statusLabel: "Approved",
            actions: "none",
        });
    }

    rows.sort((a, b) => {
        const ta = new Date(a.submittedAt).getTime();
        const tb = new Date(b.submittedAt).getTime();
        return tb - ta;
    });

    sendJson(res, 200, {
        sourceRepo: getClaSourceRepoFullName(),
        clabotRepos: getClabotRepoFullNames(),
        claSdkVersion: getClaSdkVersion(),
        contributors: rows,
    });
}
