import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "preact/hooks";
import { renderQuickMarkdown } from "../lib/quickMarkdown";

const PRIVACY_POLICY_URL =
    "https://raw.githubusercontent.com/vex-chat/privacy-policy/main/PrivacyPolicy.md";
const PRIVACY_POLICY_COMMITS_URL =
    "https://api.github.com/repos/vex-chat/privacy-policy/commits?sha=main&per_page=3";
const PRIVACY_POLICY_HISTORY_URL =
    "https://github.com/vex-chat/privacy-policy/commits/main";

type CommitInfo = {
    sha: string;
    html_url: string;
    commit: {
        message: string;
        author: {
            date: string;
        };
    };
};

function formatRelativeTime(value: string): string {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function PrivacyPolicyPage(_: { path?: string }): JSX.Element {
    const [policyText, setPolicyText] = useState("");
    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

    useEffect(() => {
        let cancelled = false;

        async function loadPolicy() {
            try {
                setStatus("loading");
                const response = await fetch(PRIVACY_POLICY_URL);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch policy: ${response.status}`
                    );
                }
                const commitsResponse = await fetch(PRIVACY_POLICY_COMMITS_URL);
                if (!commitsResponse.ok) {
                    throw new Error(
                        `Failed to fetch commits: ${commitsResponse.status}`
                    );
                }

                const [text, commitsData] = await Promise.all([
                    response.text(),
                    commitsResponse.json() as Promise<CommitInfo[]>,
                ]);

                if (!cancelled) {
                    setPolicyText(text);
                    setCommits(commitsData.slice(0, 3));
                    setStatus("idle");
                }
            } catch {
                if (!cancelled) {
                    setStatus("error");
                }
            }
        }

        loadPolicy();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-6 sm:p-10">
            <h1 className="text-4xl font-bold tracking-tight text-red-200 sm:text-5xl">
                Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-zinc-300 sm:text-base">
                How your data is handled, with recent policy updates below.
            </p>

            {status === "loading" && (
                <p className="mt-4 text-zinc-300">Loading policy...</p>
            )}

            {status === "error" && (
                <p className="mt-4 text-red-300">
                    Could not load policy from GitHub right now.
                </p>
            )}

            {status === "idle" ? (
                <>
                    <div className="mt-8">
                        {commits.length > 0 ? (
                            <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                                {commits.map((commit) => (
                                    <UpdateItem
                                        key={commit.sha}
                                        commit={commit}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <p className="rounded-lg border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-300">
                                No update details found.
                            </p>
                        )}
                    </div>

                    <p className="mt-4 text-sm text-zinc-300">
                        <a
                            href={PRIVACY_POLICY_HISTORY_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-200 underline decoration-red-400/60 underline-offset-4 hover:text-red-100"
                        >
                            View full update history
                        </a>
                    </p>

                    <article className="mt-10 border-t border-white/10 pt-8">
                        {renderQuickMarkdown(policyText)}
                    </article>
                </>
            ) : null}
        </section>
    );
}

function UpdateItem(props: { commit: CommitInfo }): JSX.Element {
    const { commit } = props;
    return (
        <li className="px-4 py-3 transition-colors hover:bg-white/[0.03] sm:px-5">
            <p className="text-sm font-medium text-zinc-100 sm:text-base">
                {commit.commit.message}
            </p>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                <span className="font-mono text-zinc-200">
                    {commit.sha.slice(0, 12)}
                </span>{" "}
                - {formatRelativeTime(commit.commit.author.date)} -{" "}
                <a
                    href={commit.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-200 underline decoration-red-400/50 underline-offset-2 hover:text-red-100"
                >
                    View details
                </a>
            </p>
        </li>
    );
}
