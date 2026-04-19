import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { useCallback, useEffect, useState } from "preact/hooks";

type PendingRow = { login: string; at: string; claVersion: string };

type OrgDebugPayload = {
    org: string | null;
    tokenConfigured: boolean;
    members: string[] | null;
    memberCount: number | null;
    yourLoginInList: boolean | null;
    error: string | null;
};

export function ClaAdminPage(): JSX.Element {
    const cla = useClaSession();
    const [admin, setAdmin] = useState<boolean | null>(null);
    const [pending, setPending] = useState<PendingRow[] | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [orgDebug, setOrgDebug] = useState<OrgDebugPayload | null>(null);

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
        const [pRes, oRes] = await Promise.all([
            fetch("/api/gh/admin/pending", { credentials: "include" }),
            fetch("/api/gh/admin/org-debug", { credentials: "include" }),
        ]);
        if (!pRes.ok) {
            setErr("Could not load queue");
            return;
        }
        const data = (await pRes.json()) as { pending?: PendingRow[] };
        setPending(data.pending ?? []);
        if (oRes.ok) {
            setOrgDebug((await oRes.json()) as OrgDebugPayload);
        } else {
            setOrgDebug(null);
        }
    }, []);

    useEffect(() => {
        if (cla.loading) {
            return;
        }
        void load();
    }, [cla.loading, load]);

    async function approve(login: string): Promise<void> {
        setBusyKey(login);
        setErr(null);
        try {
            const res = await fetch("/api/gh/admin/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ login }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setErr(data.error ?? "Approve failed");
                return;
            }
            await load();
        } catch {
            setErr("Network error");
        } finally {
            setBusyKey(null);
        }
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

    return (
        <article className="space-y-6">
            <header>
                <h1 className="mt-0 text-3xl font-bold tracking-tight text-zinc-50">
                    CLA queue
                </h1>
                <p className="mt-2 max-w-2xl text-zinc-400">
                    Contributors who submitted acceptance on{" "}
                    <a href="/cla" className="text-red-300/90 underline">
                        /cla
                    </a>
                    . Approve to remove them from the queue and (if configured) add
                    their username to{" "}
                    <code className="text-zinc-300">.clabot</code> on GitHub.
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
                            <dt className="text-zinc-500">CLA_ADMIN_ORG</dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.org ?? "—"}
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
                            <dt className="text-zinc-500">Member count</dt>
                            <dd className="font-mono text-zinc-200">
                                {orgDebug.memberCount ?? "—"}
                            </dd>
                        </div>
                    </dl>
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

            {pending === null ? (
                <p className="text-zinc-500">Loading queue…</p>
            ) : pending.length === 0 ? (
                <p className="text-zinc-500">No pending signers.</p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
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
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pending.map((row) => (
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
                                        <button
                                            type="button"
                                            disabled={busyKey === row.login}
                                            onClick={() => void approve(row.login)}
                                            className="rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-emerald-300/95 hover:bg-emerald-900/40 disabled:opacity-50"
                                        >
                                            {busyKey === row.login
                                                ? "…"
                                                : "Approve"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}
