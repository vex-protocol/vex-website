import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { githubLoginUrl } from "../lib/githubAuth";
import { CheckCircle2Icon } from "../components/Icons";
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
        let cancelled = false;
        void fetch("/api/gh/cla-markdown")
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${String(r.status)}`);
                }
                return r.json() as Promise<{ text?: string }>;
            })
            .then((j) => {
                if (!cancelled && typeof j.text === "string") {
                    setBody(j.text);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadErr(
                        "Could not load CLA text (server could not fetch from GitHub).",
                    );
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const canSubmit =
        status &&
        status.authenticated &&
        status.login &&
        (status.eligibility === "can_submit" ||
            (status.eligibility === "rejected" &&
                status.canResubmit === true));

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

    const showJustSignedFlash = submitOk && status?.eligibility === "pending";

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
                    <p className="text-sm text-red-300">{loadErr}</p>
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
                            href={githubLoginUrl("/cla")}
                            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/35 hover:bg-zinc-700"
                        >
                            Sign in with GitHub
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-zinc-400">
                            Signed in as{" "}
                            <span className="font-medium text-zinc-200">
                                @{cla.login}
                            </span>
                        </p>

                        {showJustSignedFlash ? (
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/80 via-zinc-950/40 to-zinc-950 p-6 shadow-[0_0_2.5rem_-0.5rem_rgba(16,185,129,0.35)]">
                                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
                                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
                                        <CheckCircle2Icon className="h-7 w-7" />
                                    </span>
                                    <div>
                                        <h2 className="m-0 text-lg font-semibold text-emerald-100">
                                            Agreement recorded
                                        </h2>
                                        <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
                                            Your CLA acceptance is saved. You&apos;re
                                            in the maintainer queue — no need to sign
                                            again until they approve or ask you to
                                            resubmit.
                                        </p>
                                        <a
                                            href="/"
                                            className="mt-4 inline-flex rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:border-emerald-400/60 hover:bg-emerald-900/50"
                                        >
                                            Back to home
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {status?.eligibility === "pending" && !showJustSignedFlash ? (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-100/95">
                                <p className="m-0 font-semibold text-emerald-50">
                                    In the review queue
                                </p>
                                <p className="mt-1 text-emerald-100/85">
                                    Your signed CLA is already with maintainers
                                    {status.submittedAt
                                        ? ` (submitted ${status.submittedAt}).`
                                        : "."}{" "}
                                    You don&apos;t need to sign again while it&apos;s
                                    pending.
                                </p>
                            </div>
                        ) : null}

                        {status?.eligibility === "completed" ? (
                            <div className="rounded-xl border border-sky-500/25 bg-sky-950/30 px-4 py-3 text-sm text-sky-100/95">
                                <p className="m-0 font-semibold text-sky-50">
                                    Already approved
                                </p>
                                <p className="mt-1 text-sky-100/85">
                                    Your GitHub account is on the approved
                                    contributors list for this program (CLA version{" "}
                                    {status.completedClaVersion ?? "—"}). You
                                    don&apos;t need to sign again unless maintainers
                                    ask you to.
                                </p>
                            </div>
                        ) : null}

                        {status?.eligibility === "rejected" ? (
                            status.canResubmit ? (
                                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 px-4 py-3 text-sm text-cyan-100/95">
                                    <p className="m-0 font-semibold text-cyan-50">
                                        You can submit again
                                    </p>
                                    <p className="mt-1 text-cyan-100/85">
                                        A maintainer cleared you to sign the CLA
                                        again after a previous decline. Read the
                                        agreement below and submit when ready.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100/95">
                                    <p className="m-0 font-semibold text-red-100">
                                        Previous submission was not accepted
                                    </p>
                                    <p className="mt-1 text-red-100/85">
                                        Your last CLA submission was{" "}
                                        <strong className="text-red-50">
                                            declined by maintainers
                                        </strong>
                                        . This is{" "}
                                        <strong className="text-red-50">not</strong>{" "}
                                        the same as an approved contributor. You
                                        cannot sign again until a maintainer allows
                                        another attempt from the CLA admin queue.
                                    </p>
                                    {status.rejectedAt ? (
                                        <p className="mt-2 text-xs text-red-200/70">
                                            Recorded {status.rejectedAt}
                                        </p>
                                    ) : null}
                                </div>
                            )
                        ) : null}

                        {canSubmit ? (
                            <form className="space-y-4" onSubmit={onSubmit}>
                                <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={agreed}
                                        onChange={(e) =>
                                            setAgreed(
                                                (e.target as HTMLInputElement)
                                                    .checked,
                                            )
                                        }
                                        disabled={!canSubmit}
                                        className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 disabled:opacity-40"
                                    />
                                    <span>
                                        I have read and agree to the Contributor
                                        License Agreement above.
                                    </span>
                                </label>
                                {submitErr ? (
                                    <p className="text-sm text-red-300">
                                        {submitErr}
                                    </p>
                                ) : null}
                                <button
                                    type="submit"
                                    disabled={submitting || !canSubmit}
                                    className="rounded-lg border border-[#e70000]/50 bg-[#e70000]/15 px-4 py-2.5 text-sm font-medium text-[#ff6b6b] transition-colors hover:border-[#e70000]/70 hover:bg-[#e70000]/25 disabled:opacity-50"
                                >
                                    {submitting
                                        ? "Submitting…"
                                        : "Submit acceptance"}
                                </button>
                                <p className="text-xs text-zinc-500">
                                    Maintainers: use{" "}
                                    <strong className="font-medium text-zinc-400">
                                        Admin → CLA queue
                                    </strong>{" "}
                                    in the top navigation (when signed in with
                                    access).
                                </p>
                            </form>
                        ) : null}
                    </div>
                )}
            </section>
        </article>
    );
}
