import { useEffect, useState } from "preact/hooks";
import { RoutePanel } from "../components/RoutePanel";
import { renderQuickMarkdown } from "../lib/quickMarkdown";
import { formatRelativeTime } from "../lib/relativeTime";

const PRIVACY_POLICY_URL =
    "https://raw.githubusercontent.com/vex-chat/privacy-policy/main/PrivacyPolicy.md";
/** Cached via `api/gh/public/privacy-commits`. */
const PRIVACY_POLICY_COMMITS_URL = "/api/gh/public/privacy-commits";
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
        <RoutePanel splotch="soft">
            {status === "loading" && (
                <div className="inline-flex items-center gap-2 text-zinc-300">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                    <span>Loading policy…</span>
                </div>
            )}

            {status === "error" && (
                <p className="text-red-300">
                    Could not load policy from GitHub right now.
                </p>
            )}

            {status === "idle" ? (
                <>
                    <article
                        className="max-w-none [&>h1:first-of-type]:mt-0 [&>h1:first-of-type]:text-2xl [&>h1:first-of-type]:font-bold [&>h1:first-of-type]:tracking-tight sm:[&>h1:first-of-type]:text-3xl [&>p:first-child]:mt-0"
                    >
                        {renderQuickMarkdown(policyText)}
                    </article>

                    <h2
                        className="mt-6 border-t border-white/10 pt-6 text-lg font-semibold tracking-tight text-zinc-100"
                        id="policy-recent-updates"
                    >
                        Recent updates
                    </h2>
                    <div className="mt-3">
                        <PolicyUpdatesList commits={commits} />
                    </div>
                </>
            ) : null}
        </RoutePanel>
    );
}

function PolicyUpdatesList(props: { commits: CommitInfo[] }): JSX.Element {
    if (props.commits.length > 0) {
        return (
            <>
                <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                    {props.commits.map((commit) => (
                        <UpdateItem key={commit.sha} commit={commit} />
                    ))}
                </ul>
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
            </>
        );
    }
    return (
        <>
            <p className="rounded-lg border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-300">
                No update details found.
            </p>
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
        </>
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
