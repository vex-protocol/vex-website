import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { RoutePanel } from "../components/RoutePanel";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { formatRelativeTime } from "../lib/relativeTime";
import { useCallback, useEffect, useState } from "preact/hooks";

type ContributorRow = {
    login: string;
    avatarUrl: string;
    claVersionLabel: string;
    submittedAt: string;
    decidedAt: string | null;
    actorLogin: string | null;
    status: "pending_review" | "approved" | "rejected" | "cleared_to_resubmit";
    statusLabel: string;
    actions: "approve_reject" | "allow_resubmit" | "none";
};

type ContributorsPayload = {
    sourceRepo: string;
    clabotRepos: string[];
    claSdkVersion: string;
    contributors: ContributorRow[];
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return iso;
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(d);
}

/** Pending first; rejected last; middle: cleared → approved. */
const CONTRIBUTOR_STATUS_RANK: Record<ContributorRow["status"], number> = {
    pending_review: 0,
    cleared_to_resubmit: 1,
    approved: 2,
    rejected: 3,
};

function sortContributorRows(rows: ContributorRow[]): ContributorRow[] {
    return [...rows].sort((a, b) => {
        const rank =
            CONTRIBUTOR_STATUS_RANK[a.status] -
            CONTRIBUTOR_STATUS_RANK[b.status];
        if (rank !== 0) {
            return rank;
        }
        return (
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
        );
    });
}

function statusBadgeClass(status: ContributorRow["status"]): string {
    switch (status) {
        case "pending_review":
            return "border-amber-500/35 bg-amber-950/40 text-amber-200";
        case "approved":
            return "border-emerald-500/35 bg-emerald-950/40 text-emerald-200";
        case "rejected":
            return "border-red-500/35 bg-red-950/40 text-red-200";
        case "cleared_to_resubmit":
            return "border-cyan-500/35 bg-cyan-950/40 text-cyan-200";
        default:
            return "border-white/15 bg-zinc-900/60 text-zinc-300";
    }
}

export function ClaAdminPage(): JSX.Element {
    const cla = useClaSession();
    const [admin, setAdmin] = useState<boolean | null>(null);
    const [data, setData] = useState<ContributorsPayload | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const load = useCallback(async () => {
        setErr(null);
        const meRes = await fetch("/api/gh/admin/me", {
            credentials: "include",
        });
        const me = (await meRes.json()) as {
            authenticated?: boolean;
            admin?: boolean;
        };
        if (!meRes.ok) {
            setErr("Could not load admin status");
            setAdmin(false);
            return;
        }
        if (!me.authenticated) {
            setAdmin(false);
            return;
        }
        if (!me.admin) {
            setAdmin(false);
            return;
        }
        setAdmin(true);
        const cRes = await fetch("/api/gh/admin/contributors", {
            credentials: "include",
        });
        if (!cRes.ok) {
            setErr("Could not load contributors");
            setData(null);
            return;
        }
        setData((await cRes.json()) as ContributorsPayload);
    }, []);

    useEffect(() => {
        if (cla.loading) {
            return;
        }
        void load();
    }, [cla.loading, load]);

    async function postAction(
        path: string,
        login: string,
        busy: string
    ): Promise<void> {
        setBusyKey(busy);
        setErr(null);
        try {
            const res = await fetch(path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ login }),
            });
            const j = (await res.json()) as { error?: string };
            if (!res.ok) {
                setErr(j.error ?? "Request failed");
                return;
            }
            await load();
        } catch {
            setErr("Network error");
        } finally {
            setBusyKey(null);
        }
    }

    function approve(login: string): void {
        void postAction("/api/gh/admin/approve", login, `approve:${login}`);
    }

    function reject(login: string): void {
        void postAction("/api/gh/admin/reject", login, `reject:${login}`);
    }

    function allowResubmit(login: string): void {
        void postAction(
            "/api/gh/admin/allow-resubmit",
            login,
            `allow:${login}`
        );
    }

    if (cla.loading || admin === null) {
        return (
            <RoutePanel splotch="status">
                <div className="inline-flex items-center gap-2 text-zinc-300">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                    Loading…
                </div>
            </RoutePanel>
        );
    }

    if (!cla.authenticated) {
        return (
            <RoutePanel splotch="status">
                <h1 className="mt-0 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                    CLA admin
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                    Sign in with a maintainer account to manage the CLA queue.
                </p>
                <a
                    href={GH_LOGIN_URL}
                    className="mt-6 inline-flex rounded-lg border border-white/20 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:border-white/40 hover:bg-zinc-800"
                >
                    Sign in with GitHub
                </a>
            </RoutePanel>
        );
    }

    if (!admin) {
        return (
            <RoutePanel splotch="status">
                <h1 className="mt-0 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                    CLA admin
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                    Your account ({cla.login}) is not authorized for this
                    dashboard. Configure{" "}
                    <code className="text-zinc-300">CLA_ADMIN_LOGINS</code> on
                    the server.
                </p>
            </RoutePanel>
        );
    }

    const rows = data?.contributors ?? [];
    const sortedRows = sortContributorRows(rows);

    return (
        <RoutePanel splotch="status">
            <article className="space-y-6">
                <header>
                    <h1 className="mt-0 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                        CLA queue
                    </h1>
                </header>

                {err ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                        {err}
                    </p>
                ) : null}

                {data === null ? (
                    <p className="text-zinc-500">Loading contributors…</p>
                ) : sortedRows.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-8 text-center text-zinc-500">
                        No contributors yet. When people sign on{" "}
                        <a href="/cla" className="text-red-300/90 underline">
                            /cla
                        </a>
                        , they&apos;ll show up here.
                    </p>
                ) : (
                    <section>
                        <div className="grid gap-3">
                            {sortedRows.map((row) => (
                                <div
                                    key={`${row.login}-${row.status}-${row.submittedAt}`}
                                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-4 sm:flex-row sm:items-start"
                                >
                                    <a
                                        href={`https://github.com/${encodeURIComponent(
                                            row.login
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0"
                                    >
                                        <img
                                            src={row.avatarUrl}
                                            alt=""
                                            width={56}
                                            height={56}
                                            className="h-14 w-14 rounded-full border border-white/10 bg-zinc-800 ring-2 ring-white/5"
                                            loading="lazy"
                                        />
                                    </a>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <a
                                                href={`https://github.com/${encodeURIComponent(
                                                    row.login
                                                )}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-base font-semibold text-zinc-100 hover:text-red-200"
                                            >
                                                @{row.login}
                                            </a>
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                                                    row.status
                                                )}`}
                                            >
                                                {row.statusLabel}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                {row.claVersionLabel}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400">
                                            <span className="text-zinc-500">
                                                Submitted
                                            </span>{" "}
                                            {formatDateTime(row.submittedAt)}
                                            <span className="text-zinc-600">
                                                {" "}
                                                ·{" "}
                                            </span>
                                            {formatRelativeTime(
                                                row.submittedAt
                                            )}
                                        </p>
                                        {row.decidedAt ? (
                                            <p className="text-sm text-zinc-400">
                                                <span className="text-zinc-500">
                                                    {row.status === "approved"
                                                        ? "Approved"
                                                        : row.status ===
                                                              "rejected" ||
                                                          row.status ===
                                                              "cleared_to_resubmit"
                                                        ? "Declined"
                                                        : "Updated"}
                                                </span>{" "}
                                                {formatDateTime(row.decidedAt)}
                                                {row.actorLogin ? (
                                                    <>
                                                        {" "}
                                                        <span className="text-zinc-600">
                                                            by
                                                        </span>{" "}
                                                        <a
                                                            href={`https://github.com/${encodeURIComponent(
                                                                row.actorLogin
                                                            )}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="font-mono text-zinc-300 hover:text-red-200"
                                                        >
                                                            @{row.actorLogin}
                                                        </a>
                                                    </>
                                                ) : null}
                                            </p>
                                        ) : null}
                                        {row.actions === "approve_reject" ? (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        busyKey ===
                                                        `approve:${row.login}`
                                                    }
                                                    onClick={() =>
                                                        approve(row.login)
                                                    }
                                                    className="rounded-lg border border-emerald-500/40 bg-emerald-950/35 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-900/45 disabled:opacity-50"
                                                >
                                                    {busyKey ===
                                                    `approve:${row.login}`
                                                        ? "…"
                                                        : "Approve"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        busyKey ===
                                                        `reject:${row.login}`
                                                    }
                                                    onClick={() =>
                                                        reject(row.login)
                                                    }
                                                    className="rounded-lg border border-red-500/35 bg-red-950/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-900/40 disabled:opacity-50"
                                                >
                                                    {busyKey ===
                                                    `reject:${row.login}`
                                                        ? "…"
                                                        : "Reject"}
                                                </button>
                                            </div>
                                        ) : null}
                                        {row.actions === "allow_resubmit" ? (
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        busyKey ===
                                                        `allow:${row.login}`
                                                    }
                                                    onClick={() =>
                                                        allowResubmit(row.login)
                                                    }
                                                    className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
                                                >
                                                    {busyKey ===
                                                    `allow:${row.login}`
                                                        ? "…"
                                                        : "Allow resubmit"}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </RoutePanel>
    );
}
