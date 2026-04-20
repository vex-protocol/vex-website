import type { IncomingMessage, ServerResponse } from "node:http";

import { appendClaAuditEvent } from "../lib/claAudit";
import { addPending, getClaEligibility } from "../lib/claQueue";
import {
    checkAuthorHasOpenPullRequest,
    isPrCheckConfigured,
} from "../lib/githubOpenPr";
import { getSessionSecret } from "../lib/ghOAuthEnv";
import { GH_SESSION_COOKIE, readGithubSession } from "../lib/ghSession";
import { seal } from "../lib/siteSession";
import { readJsonBody, sendJson, useSecureCookies } from "../lib/nodeHttp";

const COOKIE_ACCEPTED = "cla_sdk_accepted";

const CLA_SDK_VERSION = process.env.CLA_SDK_VERSION?.trim() ?? "1";

type AcceptedCookie = {
    v: number;
    login: string;
    id: number;
    claVersion: string;
    at: string;
    exp: number;
};

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> {
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        const origin = process.env.SITE_ORIGIN?.trim();
        if (origin) {
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "POST, OPTIONS");
        res.end("Method Not Allowed");
        return;
    }

    const origin = process.env.SITE_ORIGIN?.trim();
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    const secret = getSessionSecret();
    if (!secret) {
        sendJson(res, 503, { error: "not_configured" });
        return;
    }

    let body: unknown;
    try {
        body = await readJsonBody(req);
    } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
    }

    const agreed =
        typeof body === "object" &&
        body !== null &&
        "agreed" in body &&
        (body as { agreed: unknown }).agreed === true;

    if (!agreed) {
        sendJson(res, 400, { error: "must_agree" });
        return;
    }

    const session = readGithubSession(req, secret);
    if (!session) {
        sendJson(res, 401, { error: "not_signed_in" });
        return;
    }

    const eligibility = await getClaEligibility(session.login);
    if (eligibility.state === "pending") {
        sendJson(res, 409, {
            error: "already_pending",
            message:
                "You already have a CLA submission waiting for maintainers. You cannot submit again until it is approved or rejected.",
        });
        return;
    }
    if (eligibility.state === "completed") {
        sendJson(res, 409, {
            error: "already_completed",
            message:
                "Your CLA was already approved for this program. Contact maintainers if you need changes.",
        });
        return;
    }
    if (eligibility.state === "rejected" && !eligibility.canResubmit) {
        sendJson(res, 403, {
            error: "rejected",
            message:
                "Your previous submission was rejected. A maintainer must allow you to submit again before you can sign.",
        });
        return;
    }

    if (isPrCheckConfigured()) {
        const pr = await checkAuthorHasOpenPullRequest(session.login);
        if (!pr.ok) {
            console.error("cla_pr_check_github", pr.status, pr.detail ?? "");
            sendJson(res, 503, {
                error: "pr_check_failed",
                message:
                    "Could not verify open pull requests with GitHub. Try again later or contact maintainers.",
            });
            return;
        }
        if (pr.count < 1) {
            sendJson(res, 403, {
                error: "no_open_pr",
                message:
                    "Open a pull request in this organization’s repos first, then sign the CLA from the link in the PR comment.",
            });
            return;
        }
    }

    const at = new Date().toISOString();
    const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

    const accepted: AcceptedCookie = {
        v: 1,
        login: session.login,
        id: session.id,
        claVersion: CLA_SDK_VERSION,
        at,
        exp,
    };

    const sealedAccepted = seal(
        secret,
        (accepted as unknown) as Record<string, unknown>
    );

    const secure = useSecureCookies();

    const clearSession = `${GH_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
        secure ? "; Secure" : ""
    }`;
    const setAccepted = [
        `${COOKIE_ACCEPTED}=${encodeURIComponent(sealedAccepted)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${365 * 24 * 3600}`,
        ...(secure ? ["Secure"] : []),
    ].join("; ");

    res.setHeader("Set-Cookie", [clearSession, setAccepted]);

    console.log(
        JSON.stringify({
            type: "cla_sdk_accepted",
            github_login: session.login,
            github_id: session.id,
            cla_version: CLA_SDK_VERSION,
            at,
        })
    );

    void appendClaAuditEvent({
        kind: "submit",
        at,
        login: session.login,
        claVersion: CLA_SDK_VERSION,
    }).catch((err: unknown) => {
        console.error("cla_audit", err);
    });

    void addPending({
        login: session.login,
        at,
        claVersion: CLA_SDK_VERSION,
    }).catch((err: unknown) => {
        console.error("cla_pending_queue", err);
    });

    sendJson(res, 200, {
        ok: true,
        login: session.login,
        claVersion: CLA_SDK_VERSION,
        at,
    });
}
