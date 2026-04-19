/**
 * Local dev only: serves `api/gh/*` on a plain Node HTTP port so Vite can proxy `/api`.
 * `bootstrap-env` must stay the first import so `.env` loads before handler modules.
 */
import "./bootstrap-env";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import accept from "../api/gh/accept";
import allowResubmit from "../api/gh/admin/allow-resubmit";
import claStatus from "../api/gh/cla-status";
import auditLog from "../api/gh/admin/audit-log";
import adminApprove from "../api/gh/admin/approve";
import adminMe from "../api/gh/admin/me";
import orgDebug from "../api/gh/admin/org-debug";
import adminPending from "../api/gh/admin/pending";
import adminReject from "../api/gh/admin/reject";
import callback from "../api/gh/callback";
import libvexGithub from "../api/gh/public/libvex-github";
import privacyCommits from "../api/gh/public/privacy-commits";
import spireGithub from "../api/gh/public/spire-github";
import login from "../api/gh/login";
import logout from "../api/gh/logout";
import session from "../api/gh/session";
import { ghOAuthMissingForCallback } from "../api/lib/ghOAuthEnv";

type Handler = (
    req: IncomingMessage,
    res: ServerResponse,
) => void | Promise<void>;

const routes: Array<{ method: string; path: string; handler: Handler }> = [
    { method: "GET", path: "/api/gh/login", handler: login },
    { method: "GET", path: "/api/gh/logout", handler: logout },
    { method: "POST", path: "/api/gh/logout", handler: logout },
    { method: "GET", path: "/api/gh/callback", handler: callback },
    { method: "GET", path: "/api/gh/session", handler: session },
    { method: "POST", path: "/api/gh/accept", handler: accept },
    { method: "OPTIONS", path: "/api/gh/accept", handler: accept },
    { method: "GET", path: "/api/gh/cla-status", handler: claStatus },
    { method: "GET", path: "/api/gh/admin/me", handler: adminMe },
    { method: "GET", path: "/api/gh/admin/org-debug", handler: orgDebug },
    { method: "GET", path: "/api/gh/admin/audit-log", handler: auditLog },
    { method: "GET", path: "/api/gh/admin/pending", handler: adminPending },
    { method: "POST", path: "/api/gh/admin/approve", handler: adminApprove },
    { method: "POST", path: "/api/gh/admin/reject", handler: adminReject },
    {
        method: "POST",
        path: "/api/gh/admin/allow-resubmit",
        handler: allowResubmit,
    },
    { method: "GET", path: "/api/gh/public/libvex-github", handler: libvexGithub },
    { method: "GET", path: "/api/gh/public/spire-github", handler: spireGithub },
    { method: "GET", path: "/api/gh/public/privacy-commits", handler: privacyCommits },
];

const PORT = Number(process.env.CLA_API_PORT ?? "8787");

const server = http.createServer((req, res) => {
    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
    );
    const route = routes.find(
        (r) => r.method === req.method && r.path === url.pathname,
    );
    if (!route) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
    }
    void Promise.resolve(route.handler(req, res)).catch((err: unknown) => {
        console.error(err);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal error");
        }
    });
});

server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
        process.stderr.write(
            `Port ${String(PORT)} is already in use (often a leftover dev:api).\n` +
                `  • Quit the other process, or\n` +
                `  • Set CLA_API_PORT=8788 in .env (Vite reads the same var for the /api proxy).\n` +
                `  • macOS: lsof -i :${String(PORT)}  then kill <pid>\n`,
        );
        process.exit(1);
    }
    throw err;
});

server.listen(PORT, () => {
    process.stdout.write(
        `GitHub OAuth API (local) http://127.0.0.1:${String(PORT)}  (Vite proxies /api here)\n`,
    );
    const missing = ghOAuthMissingForCallback();
    if (missing.length > 0) {
        process.stderr.write(
            `[gh-oauth] Env incomplete (missing ${missing.join(", ")}). ` +
                `Fill vex.wtf/.env (see .env.example), then restart.\n`,
        );
    }
});
