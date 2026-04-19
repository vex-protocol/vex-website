import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { useCallback, useEffect, useState } from "preact/hooks";

type PendingRow = { login: string; at: string; claVersion: string };

type RejectedRow = {
    login: string;
    submittedAt: string;
    rejectedAt: string;
    claVersion: string;
};

type QueuePayload = {
    pending: PendingRow[];
    rejected: RejectedRow[];
    resubmitAllowed: string[];
    sourceRepo: string;
    clabotRepos: string[];
    claVersion: string;
};

type OrgDebugPayload = {
    org: string | null;
    /** True if `CLA_ADMIN_ORG` was set in env (else org is the default). */
    orgFromEnv?: boolean;
    tokenConfigured: boolean;
    members: string[] | null;
    memberCount: number | null;
    publicMemberCount?: number | null;
    patOwnerLogin?: string | null;
    hint?: string | null;
    yourLoginInList: boolean | null;
    error: string | null;
};

type ClaAuditEvent =
    | {
          kind: "submit";
          at: string;
          login: string;
          claVersion: string;
      }
    | {
          kind: "approve";
          at: string;
          login: string;
          actor: string;
          claVersion: string;
      }
    | {
          kind: "reject";
          at: string;
          login: string;
          actor: string;
          claVersion: string;
      }
    | {
          kind: "allow_resubmit";
          at: string;
          login: string;
          actor: string;
      };

type AuditLogPayload = {
    events: ClaAuditEvent[];
    completedSnapshot: Array<{
        login: string;
        at: string;
        claVersion: string;
    }>;
    note?: string;
};

export function ClaAdminPage(): JSX.Element {
    const cla = useClaSession();
    const [admin, setAdmin] = useState<boolean | null>(null);
    const [queue, setQueue] = useState<QueuePayload | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [orgDebug, setOrgDebug] = useState<OrgDebugPayload | null>(null);
    const [audit, setAudit] = useState<AuditLogPayload | null>(null);

    const load = useCallback(async () => {
        setErr(null);
        const meRes = await fetch("/api/gh/admin/me", { credentials: "include" });
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
        const [pRes, oRes, aRes] = await Promise.all([
            fetch("/api/gh/admin/pending", { credentials: "include" }),
            fetch("/api/gh/admin/org-debug", { credentials: "include" }),
            fetch("/api/gh/admin/audit-log", { credentials: "include" }),
        ]);
        if (!pRes.ok) {
            setErr("Could not load queue");
            return;
        }
        const data = (await pRes.json()) as QueuePayload;
        setQueue({
            pending: data.pending ?? [],
            rejected: data.rejected ?? [],
            resubmitAllowed: data.resubmitAllowed ?? [],
            sourceRepo: data.sourceRepo ?? "vex-protocol/spire-js",
            clabotRepos: data.clabotRepos ?? [],
            claVersion: data.claVersion ?? "1",
        });
        if (oRes.ok) {
            setOrgDebug((await oRes.json()) as OrgDebugPayload);
        } else {
            setOrgDebug(null);
        }
        if (aRes.ok) {
            setAudit((await aRes.json()) as AuditLogPayload);
        } else {
            setAudit(null);
        }
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
        busy: string,
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
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setErr(data.error ?? "Request failed");
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
            `allow:${login}`,
        );
    }

    if (cla.loading || admin === null) {
        return (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
                <div className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                    Loading…
                </div>
            </section>
        );
    }

    if (!cla.authenticated) {
        return (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <h1 className="mt-0 text-2xl font-semibold text-zinc-100">
                    CLA admin
                </h1>
                <p className="mt-2 text-zinc-400">
                    Sign in with a maintainer account to manage the CLA queue.
                </p>
                <a
                    href={GH_LOGIN_URL}
                    className="mt-4 inline-flex rounded-lg border border-white/20 px-4 py-2.5 text-sm text-zinc-100 hover:border-white/40"
                >
                    Sign in with GitHub
                </a>
            </section>
        );
    }

    if (!admin) {
        return (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <h1 className="mt-0 text-2xl font-semibold text-zinc-100">
                    CLA admin
                </h1>
                <p className="mt-2 text-zinc-400">
                    Your account ({cla.login}) is not authorized for this dashboard.
                    Configure{" "}
                    <code className="text-zinc-300">CLA_ADMIN_LOGINS</code> or GitHub
                    repo access checks on the server.
                </p>
            </section>
        );
    }

    const sourceRepo = queue?.sourceRepo ?? "vex-protocol/spire-js";
    const clabotRepos = queue?.clabotRepos ?? [];

    return (
        <article className="space-y-6">
            <header>
                <h1 className="mt-0 text-3xl font-bold tracking-tight text-zinc-50">
                    CLA queue
                </h1>
                <div className="mt-3 max-w-3xl rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
                    <p className="m-0 font-medium text-zinc-200">
                        Repository scope
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-400">
                        <li>
                            <span className="text-zinc-300">CLA text</span> —{" "}
                            <span className="font-mono text-zinc-200">
                                {sourceRepo}
                            </span>{" "}
                            (<code className="text-zinc-300">CLA.md</code>, branch{" "}
                            <code className="text-zinc-300">main</code>; override with{" "}
                            <code className="text-zinc-300">CLA_SOURCE_REPO</code>)
                        </li>
                        <li>
                            <span className="text-zinc-300">
                                <code className="text-zinc-300">.clabot</code> targets
                            </span>{" "}
                            —{" "}
                            {clabotRepos.length > 0 ? (
                                <span className="font-mono text-zinc-200">
                                    {clabotRepos.join(", ")}
                                </span>
                            ) : (
                                <span className="text-amber-200/90">
                                    none configured (
                                    <code className="text-zinc-300">
                                        CLA_BOT_REPOS
                                    </code>
                                    )
                                </span>
                            )}
                        </li>
                        <li>
                            <span className="text-zinc-300">Queue version</span> —{" "}
                            <span className="font-mono text-zinc-200">
                                {queue?.claVersion ?? "—"}
                            </span>{" "}
                            (<code className="text-zinc-300">CLA_SDK_VERSION</code>)
                        </li>
                    </ul>
                </div>
                <p className="mt-3 max-w-2xl text-zinc-400">
                    Contributors who submitted on{" "}
                    <a href="/cla" className="text-red-300/90 underline">
                        /cla
                    </a>
                    . Approve adds them to each listed repo&apos;s{" "}
                    <code className="text-zinc-300">.clabot</code> (when the bot token
                    is configured). Reject blocks resubmission until you allow it.
                </p>
            </header>

            {err ? (
                <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {err}
                </p>
            ) : null}

            {orgDebug ? (
                <section className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                    <h2 className="mt-0 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                        Org membership (debug)
                    </h2>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-zinc-500">Admin org</dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.org ?? "—"}
                                {orgDebug.orgFromEnv === false ? (
                                    <span className="ml-2 text-xs font-normal text-zinc-500">
                                        (default — set{" "}
                                        <code className="text-zinc-400">
                                            CLA_ADMIN_ORG
                                        </code>{" "}
                                        in{" "}
                                        <code className="text-zinc-400">
                                            vex.wtf/.env
                                        </code>{" "}
                                        to override)
                                    </span>
                                ) : null}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-zinc-500">
                                GITHUB_ORG_MEMBERSHIP_TOKEN
                            </dt>
                            <dd className="text-zinc-200">
                                {orgDebug.tokenConfigured ? (
                                    <span className="text-emerald-300/95">
                                        set
                                    </span>
                                ) : (
                                    <span className="text-amber-300/95">
                                        not set
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-zinc-500">Your login in list</dt>
                            <dd className="text-zinc-200">
                                {orgDebug.yourLoginInList === null
                                    ? "—"
                                    : orgDebug.yourLoginInList
                                    ? (
                                          <span className="text-emerald-300/95">
                                              yes
                                          </span>
                                      )
                                    : (
                                          <span className="text-amber-300/95">
                                              no
                                          </span>
                                      )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-zinc-500">
                                Member count (full list API)
                            </dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.memberCount ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-zinc-500">
                                Public members (API)
                            </dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.publicMemberCount ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-zinc-500">PAT owner (GET /user)</dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.patOwnerLogin ? (
                                    <>@{orgDebug.patOwnerLogin}</>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                    </dl>
                    {orgDebug.hint ? (
                        <p className="mt-3 rounded-lg border border-sky-500/25 bg-sky-950/30 px-3 py-2 text-xs leading-relaxed text-sky-100/95">
                            {orgDebug.hint}
                        </p>
                    ) : null}
                    {orgDebug.error ? (
                        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 font-mono text-xs text-amber-100/95">
                            {orgDebug.error}
                        </p>
                    ) : null}
                    {orgDebug.members && orgDebug.members.length > 0 ? (
                        <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3">
                            <ul className="columns-1 gap-x-6 text-sm sm:columns-2">
                                {orgDebug.members.map((login) => (
                                    <li
                                        key={login}
                                        className={`mb-1 break-all font-mono ${
                                            cla.login &&
                                            login.toLowerCase() ===
                                                cla.login.toLowerCase()
                                                ? "text-emerald-300/95"
                                                : "text-zinc-300"
                                        }`}
                                    >
                                        @{login}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {audit ? (
                <section className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                    <h2 className="mt-0 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                        CLA audit log
                    </h2>
                    <p className="mt-2 text-xs text-zinc-500">
                        Append-only record on the API server (
                        <code className="text-zinc-400">data/cla-audit.jsonl</code>
                        ). New events appear after submits and admin actions.
                    </p>
                    {audit.note ? (
                        <p className="mt-2 text-sm text-amber-200/90">{audit.note}</p>
                    ) : null}
                    {audit.events.length > 0 ? (
                        <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
                            <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 bg-zinc-900/80">
                                        <th className="px-3 py-2 font-medium text-zinc-400">
                                            Event
                                        </th>
                                        <th className="px-3 py-2 font-medium text-zinc-400">
                                            When
                                        </th>
                                        <th className="px-3 py-2 font-medium text-zinc-400">
                                            Login
                                        </th>
                                        <th className="px-3 py-2 font-medium text-zinc-400">
                                            Actor
                                        </th>
                                        <th className="px-3 py-2 font-medium text-zinc-400">
                                            CLA
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audit.events.map((ev, i) => (
                                        <tr
                                            key={`${ev.kind}-${ev.at}-${String(i)}`}
                                            className="border-b border-white/5"
                                        >
                                            <td className="px-3 py-2 font-mono text-zinc-200">
                                                {ev.kind}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-500">
                                                {ev.at}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-zinc-200">
                                                @{ev.login}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-zinc-400">
                                                {"actor" in ev
                                                    ? `@${ev.actor}`
                                                    : "—"}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-500">
                                                {"claVersion" in ev
                                                    ? ev.claVersion
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                    {audit.completedSnapshot.length > 0 ? (
                        <div className="mt-4">
                            <p className="text-xs font-medium text-zinc-500">
                                Approved contributors (from queue file)
                            </p>
                            <ul className="mt-2 space-y-1 font-mono text-xs text-zinc-400">
                                {audit.completedSnapshot.map((c) => (
                                    <li key={`${c.login}-${c.at}`}>
                                        @{c.login} · submitted {c.at} · CLA{" "}
                                        {c.claVersion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {queue === null ? (
                <p className="text-zinc-500">Loading queue…</p>
            ) : (
                <>
                    {queue.pending.length === 0 ? (
                        <p className="text-zinc-500">No pending signers.</p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-white/10">
                            <p className="border-b border-white/10 bg-zinc-900/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Pending approval
                            </p>
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-zinc-900/80">
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            GitHub
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            Submitted
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            CLA ver
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queue.pending.map((row) => (
                                        <tr
                                            key={row.login}
                                            className="border-b border-white/5 last:border-0"
                                        >
                                            <td className="px-4 py-3 font-mono text-zinc-200">
                                                @{row.login}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-500">
                                                {row.at}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-500">
                                                {row.claVersion}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            busyKey ===
                                                            `approve:${row.login}`
                                                        }
                                                        onClick={() =>
                                                            approve(row.login)
                                                        }
                                                        className="rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-emerald-300/95 hover:bg-emerald-900/40 disabled:opacity-50"
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
                                                        className="rounded-md border border-red-500/35 bg-red-950/25 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-red-300/95 hover:bg-red-900/35 disabled:opacity-50"
                                                    >
                                                        {busyKey ===
                                                        `reject:${row.login}`
                                                            ? "…"
                                                            : "Reject"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {queue.rejected.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-white/10">
                            <p className="border-b border-white/10 bg-zinc-900/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Rejected — cannot resubmit until allowed
                            </p>
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-zinc-900/80">
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            GitHub
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            Rejected
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            CLA ver
                                        </th>
                                        <th className="px-4 py-3 font-medium text-zinc-300">
                                            Resubmit
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queue.rejected.map((row) => {
                                        const allowed =
                                            queue.resubmitAllowed.includes(
                                                row.login.toLowerCase(),
                                            );
                                        return (
                                            <tr
                                                key={row.login}
                                                className="border-b border-white/5 last:border-0"
                                            >
                                                <td className="px-4 py-3 font-mono text-zinc-200">
                                                    @{row.login}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500">
                                                    {row.rejectedAt}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500">
                                                    {row.claVersion}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {allowed ? (
                                                        <span className="text-xs text-emerald-300/95">
                                                            Allowed — user can
                                                            submit again
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                busyKey ===
                                                                `allow:${row.login}`
                                                            }
                                                            onClick={() =>
                                                                allowResubmit(
                                                                    row.login,
                                                                )
                                                            }
                                                            className="rounded-md border border-amber-500/35 bg-amber-950/25 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-amber-200/95 hover:bg-amber-900/35 disabled:opacity-50"
                                                        >
                                                            {busyKey ===
                                                            `allow:${row.login}`
                                                                ? "…"
                                                                : "Allow resubmit"}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </>
            )}
        </article>
    );
}
