import type { JSX } from "preact";
import { useClaSession } from "../ClaSessionContext";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { useEffect, useState } from "preact/hooks";

const CLA_MARKDOWN_URL =
    "https://raw.githubusercontent.com/vex-protocol/spire-js/main/CLA.md";

export function ClaPage(): JSX.Element {
    const cla = useClaSession();
    const [body, setBody] = useState<string | null>(null);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);
    const [submitOk, setSubmitOk] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void fetch(CLA_MARKDOWN_URL)
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
    }, []);

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
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setSubmitErr(data.error ?? "Request failed");
                return;
            }
            setSubmitOk(true);
            await cla.refresh();
        } catch {
            setSubmitErr("Network error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <article className="space-y-8">
            <header>
                <h1 className="mt-0 text-3xl font-bold tracking-tight text-zinc-50">
                    Contributor License Agreement
                </h1>
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/35 px-4 py-3 text-sm leading-relaxed text-amber-100/95">
                    This page is for contributors who need to sign in response to a{" "}
                    <strong className="font-semibold text-amber-50">pull request</strong>
                    . Use the link from your PR comment from{" "}
                    <strong className="font-semibold">cla-bot</strong> — the CLA signing
                    flow is not linked from the public site navigation.
                </div>
                <p className="mt-4 max-w-2xl text-zinc-400">
                    Read the agreement below, sign in with GitHub, then confirm. Your
                    request is queued for maintainers to add you to the{" "}
                    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-200">
                        contributors
                    </code>{" "}
                    list in each repo&apos;s{" "}
                    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-200">
                        .clabot
                    </code>{" "}
                    file.
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
                        href="https://github.com/vex-protocol/spire-js/blob/main/CLA.md"
                        className="text-red-300/90 underline underline-offset-2 hover:text-red-200"
                    >
                        vex-protocol/spire-js — CLA.md
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
                        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) =>
                                    setAgreed((e.target as HTMLInputElement).checked)
                                }
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900"
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
                            disabled={submitting}
                            className="rounded-lg border border-[#e70000]/50 bg-[#e70000]/15 px-4 py-2.5 text-sm font-medium text-[#ff6b6b] transition-colors hover:border-[#e70000]/70 hover:bg-[#e70000]/25 disabled:opacity-50"
                        >
                            {submitting ? "Submitting…" : "Submit acceptance"}
                        </button>
                        <p className="text-xs text-zinc-500">
                            Maintainers: use{" "}
                            <strong className="font-medium text-zinc-400">
                                Admin → CLA approvals
                            </strong>{" "}
                            in the top navigation (when signed in with access).
                        </p>
                    </form>
                )}
            </section>
        </article>
    );
}
