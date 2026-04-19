import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { useEffect, useState } from "preact/hooks";

type ClaStatusOk = {
    authenticated: boolean;
    login: string | null;
    sourceRepo: string;
    clabotRepos: string[];
    claVersion: string;
    eligibility:
        | null
        | "can_submit"
        | "pending"
        | "rejected"
        | "completed";
    submittedAt?: string;
    rejectedAt?: string;
    canResubmit?: boolean;
    completedAt?: string;
    completedClaVersion?: string;
};

export function ClaPage(): JSX.Element {
    const cla = useClaSession();
    const [status, setStatus] = useState<ClaStatusOk | null>(null);
    const [body, setBody] = useState<string | null>(null);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);
    const [submitOk, setSubmitOk] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void fetch("/api/gh/cla-status", { credentials: "include" })
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${String(r.status)}`);
                }
                return r.json() as Promise<ClaStatusOk>;
            })
            .then((s) => {
                if (!cancelled) {
                    setStatus(s);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadErr("Could not load CLA configuration from the server.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!status?.sourceRepo) {
            return;
        }
        let cancelled = false;
        const url = `https://raw.githubusercontent.com/${status.sourceRepo}/main/CLA.md`;
        void fetch(url)
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${String(r.status)}`);
                }
                return r.text();
            })
            .then((t) => {
                if (!cancelled) {
                    setBody(t);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadErr("Could not load CLA text from GitHub.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [status?.sourceRepo]);

    const canSubmit =
        status &&
        status.authenticated &&
        status.login &&
        (status.eligibility === "can_submit" ||
            (status.eligibility === "rejected" && status.canResubmit === true));

    const blockedReason =
        status && status.authenticated && status.login && !canSubmit
            ? status.eligibility === "pending"
                ? "You already have a submission waiting for maintainers. You cannot sign again until it is approved or rejected."
                : status.eligibility === "rejected"
                ? "Your previous submission was rejected. A maintainer must allow you to submit again."
                : status.eligibility === "completed"
                ? "Your CLA was already approved for this program. Contact maintainers if you need changes."
                : null
            : null;

    async function onSubmit(e: Event): Promise<void> {
        e.preventDefault();
        setSubmitErr(null);
        setSubmitOk(false);
        if (!agreed) {
            setSubmitErr("Check the box to confirm you agree.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/gh/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ agreed: true }),
            });
            const data = (await res.json()) as {
                error?: string;
                message?: string;
            };
            if (!res.ok) {
                setSubmitErr(
                    data.message ?? data.error ?? "Request failed",
                );
                return;
            }
            setSubmitOk(true);
            await cla.refresh();
            const u = await fetch("/api/gh/cla-status", {
                credentials: "include",
            });
            if (u.ok) {
                setStatus((await u.json()) as ClaStatusOk);
            }
        } catch {
            setSubmitErr("Network error");
        } finally {
            setSubmitting(false);
        }
    }

    const sourceRepo = status?.sourceRepo ?? "vex-protocol/spire-js";
    const clabotRepos = status?.clabotRepos ?? [];
    const claSourceHref = `https://github.com/${sourceRepo}/blob/main/CLA.md`;

    return (
        <article className="space-y-8">
            <header>
                <h1 className="mt-0 text-3xl font-bold tracking-tight text-zinc-50">
                    Contributor License Agreement
                </h1>
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/35 px-4 py-3 text-sm leading-relaxed text-amber-100/95">
                    This flow applies to the{" "}
                    <strong className="font-semibold text-amber-50">
                        {sourceRepo}
                    </strong>{" "}
                    CLA and{" "}
                    {clabotRepos.length > 0 ? (
                        <>
                            separate{" "}
                            <code className="rounded bg-black/30 px-1 py-0.5">
                                .clabot
                            </code>{" "}
                            files in{" "}
                            <strong className="font-semibold text-amber-50">
                                {clabotRepos.join(", ")}
                            </strong>
                            . Each repo may have its own bot list.
                        </>
                    ) : (
                        <>
                            <code className="rounded bg-black/30 px-1 py-0.5">
                                .clabot
                            </code>{" "}
                            updates (configure{" "}
                            <code className="rounded bg-black/30 px-1 py-0.5">
                                CLA_BOT_REPOS
                            </code>{" "}
                            on the server to list repos).
                        </>
                    )}
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                    <p className="m-0 font-medium text-zinc-200">
                        Scope (this site)
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-400">
                        <li>
                            <span className="text-zinc-300">CLA document</span> —{" "}
                            <span className="font-mono text-zinc-200">
                                {sourceRepo}
                            </span>{" "}
                            (<code className="text-zinc-300">CLA.md</code> on{" "}
                            <code className="text-zinc-300">main</code>)
                        </li>
                        <li>
                            <span className="text-zinc-300">
                                Maintainer approval queue
                            </span>{" "}
                            — one shared queue; approvals add your GitHub username
                            to each configured repo&apos;s{" "}
                            <code className="text-zinc-300">.clabot</code>
                            {clabotRepos.length === 0
                                ? " (none configured yet)."
                                : "."}
                        </li>
                    </ul>
                </div>
                <p className="mt-4 max-w-2xl text-zinc-400">
                    Read the agreement below, sign in with GitHub, then confirm. Use
                    the link from your PR comment from{" "}
                    <strong className="text-zinc-300">cla-bot</strong> when
                    applicable.
                </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
                {loadErr ? (
                    <p className="text-red-300">{loadErr}</p>
                ) : body === null ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                        Loading CLA…
                    </div>
                ) : (
                    <pre className="max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300 sm:text-sm">
                        {body}
                    </pre>
                )}
                <p className="mt-4 text-xs text-zinc-500">
                    Source:{" "}
                    <a
                        href={claSourceHref}
                        className="text-red-300/90 underline underline-offset-2 hover:text-red-200"
                    >
                        {sourceRepo} — CLA.md
                    </a>
                </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
                {cla.loading ? (
                    <p className="text-zinc-400">Checking session…</p>
                ) : !cla.authenticated ? (
                    <div className="space-y-3">
                        <p className="text-zinc-300">
                            Sign in with GitHub to record your agreement.
                        </p>
                        <a
                            href={GH_LOGIN_URL}
                            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/35 hover:bg-zinc-700"
                        >
                            Sign in with GitHub
                        </a>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <p className="text-sm text-zinc-400">
                            Signed in as{" "}
                            <span className="font-medium text-zinc-200">
                                @{cla.login}
                            </span>
                        </p>
                        {blockedReason ? (
                            <p className="rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/95">
                                {blockedReason}
                            </p>
                        ) : null}
                        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) =>
                                    setAgreed((e.target as HTMLInputElement).checked)
                                }
                                disabled={!canSubmit}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 disabled:opacity-40"
                            />
                            <span>
                                I have read and agree to the Contributor License
                                Agreement above.
                            </span>
                        </label>
                        {submitErr ? (
                            <p className="text-sm text-red-300">{submitErr}</p>
                        ) : null}
                        {submitOk ? (
                            <p className="text-sm text-emerald-400">
                                Thanks — your acceptance is recorded. Maintainers will
                                add your username to{" "}
                                <code className="text-emerald-300/90">.clabot</code>{" "}
                                when ready.
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={submitting || !canSubmit}
                            className="rounded-lg border border-[#e70000]/50 bg-[#e70000]/15 px-4 py-2.5 text-sm font-medium text-[#ff6b6b] transition-colors hover:border-[#e70000]/70 hover:bg-[#e70000]/25 disabled:opacity-50"
                        >
                            {submitting ? "Submitting…" : "Submit acceptance"}
                        </button>
                        <p className="text-xs text-zinc-500">
                            Maintainers: use{" "}
                            <strong className="font-medium text-zinc-400">
                                Admin → CLA queue
                            </strong>{" "}
                            in the top navigation (when signed in with access).
                        </p>
                    </form>
                )}
            </section>
        </article>
    );
}
