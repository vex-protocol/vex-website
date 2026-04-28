import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
    CheckCircle2Icon,
    CheckIcon,
    CopyIcon,
    GithubIcon,
    LoaderCircleIcon,
    XCircleIcon,
} from "../components/Icons";
import { formatRelativeTime } from "../lib/relativeTime";
import { RoutePanel } from "../components/RoutePanel";
import {
    formatBucketDurationLabel,
    formatBucketWindowClock,
    getMonitorBucketPollCounts,
    parseTimeseriesPayload,
    SPIRE_GITHUB_API_URL,
    SPIRE_META_REFRESH_MS,
    SPIRE_UPTIME_SUMMARY_URL,
    SPIRE_UPTIME_TIMESERIES_URL,
    UPTIME_BLOCK_BUCKET_MINUTES,
    UPTIME_BLOCK_WINDOW_HOURS,
} from "../lib/spireMonitor";
import type {
    MonitorSummaryResponse,
    MonitorTimeseriesBlock,
} from "../lib/spireMonitor";

type GitHubWorkflowRunsResponse = {
    workflow_runs?: Array<{
        status: string;
        conclusion: string | null;
        html_url: string;
        updated_at: string;
    }>;
};

type GitHubCommitApiResponse = {
    sha: string;
    html_url: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    author: {
        login: string;
        avatar_url: string;
        html_url: string;
    } | null;
};

type SpireMeta = {
    apiReachable: boolean;
    buildStatus: string;
    buildUpdatedAt: string;
    buildUrl: string;
    healthVersion: string | null;
    healthCheckDurationMs: number | null;
    dbHealthy: boolean | null;
    runtimeCommitSha: string | null;
    uptimePercent: number | null;
    averageLatencyMs: number | null;
    maxLatencyMs: number | null;
    latestLatencyMs: number | null;
    monitorSampledAt: string | null;
    latestCommit: {
        sha: string;
        message: string;
        date: string;
        url: string;
        authorName: string;
        authorLogin: string | null;
        authorAvatarUrl: string | null;
        authorUrl: string | null;
    } | null;
};

const SPIRE_GITHUB_URL = "https://github.com/vex-protocol/spire";

function checkSuccessTone(percent: number): string {
    if (percent >= 99.5) return "text-emerald-300";
    if (percent >= 95) return "text-amber-200";
    return "text-red-300";
}

function UptimeStripPopoverPanel(props: {
    block: MonitorTimeseriesBlock;
}): JSX.Element {
    const { block } = props;
    const { total, online, offline } = getMonitorBucketPollCounts(block);
    const windowLabel = formatBucketWindowClock(block);
    const durationLabel = formatBucketDurationLabel(block);
    const hasSamples = block.status !== "no_data" && total > 0;
    const checkPct = hasSamples ? block.uptimePercent : null;
    const gap = Math.max(0, total - online - offline);

    return (
        <div
            className="w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-white/[0.12] bg-zinc-950/95 p-3.5 shadow-[0_0.75rem_2.5rem_-0.5rem_rgba(0,0,0,0.75)] ring-1 ring-white/[0.06] backdrop-blur-md"
            role="tooltip"
        >
            <div className="border-b border-white/[0.08] pb-2.5">
                <p className="font-mono text-[0.6875rem] leading-snug text-zinc-200">
                    {windowLabel}
                </p>
                <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.14em] text-zinc-500">
                    {durationLabel} window ·{" "}
                    {formatRelativeTime(block.bucketStart)}
                </p>
            </div>
            {!hasSamples ? (
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">
                    No monitor samples in this bucket.
                </p>
            ) : (
                <dl className="mt-2.5 space-y-2 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-zinc-500">Check health</dt>
                        <dd
                            className={`font-mono text-sm font-medium tabular-nums ${checkSuccessTone(
                                checkPct ?? 0
                            )}`}
                        >
                            {checkPct?.toFixed(1)}%
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-zinc-500">Monitor polls</dt>
                        <dd className="font-mono tabular-nums text-zinc-200">
                            {total.toLocaleString()}
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-zinc-500">Up / down</dt>
                        <dd className="font-mono tabular-nums text-zinc-200">
                            <span className="text-emerald-300/95">
                                {online.toLocaleString()}
                            </span>
                            <span className="text-zinc-600"> / </span>
                            <span className="text-red-300/95">
                                {offline.toLocaleString()}
                            </span>
                            {gap > 0 ? (
                                <span className="text-zinc-500">
                                    {" "}
                                    (+{gap} unknown)
                                </span>
                            ) : null}
                        </dd>
                    </div>
                    {block.serviceRequestsDelta != null ? (
                        <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-zinc-500">
                                Requests served (Δ)
                            </dt>
                            <dd className="font-mono tabular-nums text-zinc-200">
                                {block.serviceRequestsDelta.toLocaleString()}
                            </dd>
                        </div>
                    ) : null}
                    {block.avgLatencyMs != null ? (
                        <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-zinc-500">Latency (avg)</dt>
                            <dd className="font-mono tabular-nums text-zinc-200">
                                {Math.round(block.avgLatencyMs)}ms
                            </dd>
                        </div>
                    ) : null}
                    {block.p95LatencyMs != null ? (
                        <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-zinc-500">Latency (p95)</dt>
                            <dd className="font-mono tabular-nums text-zinc-200">
                                {Math.round(block.p95LatencyMs)}ms
                            </dd>
                        </div>
                    ) : null}
                    {block.maxLatencyMs != null ? (
                        <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-zinc-500">Latency (max)</dt>
                            <dd className="font-mono tabular-nums text-zinc-200">
                                {Math.round(block.maxLatencyMs)}ms
                            </dd>
                        </div>
                    ) : null}
                </dl>
            )}
        </div>
    );
}

function UptimeReliabilityStripBlock(props: {
    block: MonitorTimeseriesBlock;
}): JSX.Element {
    const { block } = props;
    const { total } = getMonitorBucketPollCounts(block);
    const shortTitle =
        block.status === "no_data" || total === 0
            ? `No samples · ${formatBucketWindowClock(block)}`
            : `${block.uptimePercent.toFixed(1)}% checks OK · ${total} polls`;

    return (
        <div
            className="group relative h-full min-h-[1.5rem] w-full min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            tabIndex={0}
            title={shortTitle}
        >
            <div className="invisible absolute left-1/2 top-full z-[75] flex -translate-x-1/2 translate-y-1 flex-col items-center pt-1.5 opacity-0 transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <UptimeStripPopoverPanel block={block} />
            </div>
            <UptimeReliabilityStripCell block={block} />
        </div>
    );
}

function UptimeReliabilityStripCell(props: {
    block: MonitorTimeseriesBlock;
}): JSX.Element {
    const { total, online, offline } = getMonitorBucketPollCounts(props.block);
    const gap = Math.max(0, total - online - offline);
    const orderedRuns = props.block.pollOkRuns;

    const barFrame = "block h-full min-h-[1.5rem] w-full min-w-0 rounded-sm";

    if (props.block.status === "no_data" || total === 0) {
        return <span className={`${barFrame} bg-zinc-600/80`} />;
    }

    if (
        orderedRuns &&
        orderedRuns.length > 0 &&
        pollRunsMatchCounts(orderedRuns, total, online, offline)
    ) {
        const runSum = orderedRuns.reduce((s, r) => s + r.count, 0);
        const tailGap = Math.max(0, total - runSum);
        return (
            <span className={`flex ${barFrame} overflow-hidden`}>
                {orderedRuns.map((run, i) => (
                    <span
                        key={i}
                        className={
                            run.ok
                                ? "min-w-0 bg-emerald-400/90"
                                : "min-w-0 bg-red-400/90"
                        }
                        style={{ flex: run.count }}
                    />
                ))}
                {tailGap > 0 ? (
                    <span
                        className="min-w-0 bg-zinc-600/80"
                        style={{ flex: tailGap }}
                    />
                ) : null}
            </span>
        );
    }

    if (gap === 0 && offline === 0) {
        return <span className={`${barFrame} bg-emerald-400/90`} />;
    }

    if (gap === 0 && online === 0) {
        return <span className={`${barFrame} bg-red-400/90`} />;
    }

    if (online === 0 && offline === 0 && gap === 0) {
        return <span className={`${barFrame} bg-zinc-600/80`} />;
    }

    return (
        <span className={`flex ${barFrame} overflow-hidden`}>
            {online > 0 ? (
                <span
                    className="min-w-0 bg-emerald-400/90"
                    style={{ flex: online }}
                />
            ) : null}
            {offline > 0 ? (
                <span
                    className="min-w-0 bg-red-400/90"
                    style={{ flex: offline }}
                />
            ) : null}
            {gap > 0 ? (
                <span
                    className="min-w-0 bg-zinc-600/80"
                    style={{ flex: gap }}
                />
            ) : null}
        </span>
    );
}

function pollRunsMatchCounts(
    runs: { ok: boolean; count: number }[],
    sampleCount: number,
    upCount: number,
    downCount: number
): boolean {
    const sum = runs.reduce((s, r) => s + r.count, 0);
    if (sum !== sampleCount) return false;
    let up = 0;
    let down = 0;
    for (const r of runs) {
        if (r.ok) up += r.count;
        else down += r.count;
    }
    return up === upCount && down === downCount;
}

function truncateCommitMessage(message: string, maxLength = 42): string {
    const singleLine = message.replace(/\s+/g, " ").trim();
    if (singleLine.length <= maxLength) return singleLine;
    return `${singleLine.slice(0, maxLength - 1)}…`;
}

function getBuildState(
    status: string
): "passing" | "failing" | "running" | "unknown" {
    const normalized = status.toLowerCase();
    if (normalized.includes("success")) return "passing";
    if (normalized.includes("failure") || normalized.includes("cancelled"))
        return "failing";
    if (normalized.includes("in_progress") || normalized.includes("queued"))
        return "running";
    return "unknown";
}

function VersionPill(props: { value: string; href?: string }): JSX.Element {
    const node = (
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.6875rem] font-mono text-zinc-200">
            v{props.value}
        </span>
    );
    if (!props.href) return node;
    return (
        <a
            href={props.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
            title={`Open version v${props.value}`}
        >
            {node}
        </a>
    );
}

function BuildCommitPill(props: {
    status: string;
    buildHref?: string;
    commit: {
        sha: string;
        message: string;
        date: string;
        url: string;
        authorName: string;
        authorLogin: string | null;
        authorAvatarUrl: string | null;
        authorUrl: string | null;
    };
    maxMessageLength?: number;
}): JSX.Element {
    const { status, buildHref, commit } = props;
    const state = getBuildState(status);
    const label = commit.authorLogin ?? commit.authorName;
    const shortSha = commit.sha.slice(0, 7);
    const message = truncateCommitMessage(
        commit.message,
        props.maxMessageLength ?? 30
    );
    const toneClasses =
        state === "passing"
            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
            : state === "failing"
            ? "border-red-500/35 bg-red-500/10 text-red-200"
            : state === "running"
            ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
            : "border-white/20 bg-white/5 text-zinc-300";

    return (
        <a
            href={buildHref ?? commit.url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex max-w-[19.375rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] transition-colors hover:brightness-110 sm:max-w-[26.875rem] ${toneClasses}`}
            title={`${commit.message} · ${label} · ${formatRelativeTime(
                commit.date
            )}`}
        >
            {state === "passing" ? (
                <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0" />
            ) : state === "failing" ? (
                <XCircleIcon className="h-3.5 w-3.5 shrink-0" />
            ) : state === "running" ? (
                <LoaderCircleIcon className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
            )}
            <span className="shrink-0 font-mono text-[0.75rem] font-thin leading-none">
                {shortSha}
            </span>
            <span className="max-w-[14ch] truncate text-[0.75rem] font-semibold leading-none text-zinc-100 sm:max-w-[20ch]">
                {message}
            </span>
            <span className="shrink-0 text-[0.625rem] text-zinc-400/80">
                {label}
            </span>
            {commit.authorAvatarUrl ? (
                <img
                    src={commit.authorAvatarUrl}
                    alt={`${label} avatar`}
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20"
                />
            ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-white/20" />
            )}
        </a>
    );
}

const DOC_SOURCE_LINK_CLASS =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-zinc-950 px-4 py-2.5 text-sm font-semibold tracking-tight text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0.5rem_1.5rem_rgba(0,0,0,0.4)] transition hover:border-white/35 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export function StatusPage(_: { path?: string }): JSX.Element {
    const [spireMeta, setSpireMeta] = useState<SpireMeta | null>(null);
    const [spireUptimeBlocks, setSpireUptimeBlocks] = useState<
        MonitorTimeseriesBlock[]
    >([]);
    const [copiedSpireApi, setCopiedSpireApi] = useState(false);

    const spireApiUrl = "https://api.vex.wtf";

    function handleCopySpireApi(): void {
        void navigator.clipboard.writeText(spireApiUrl).then(() => {
            setCopiedSpireApi(true);
            window.setTimeout(() => setCopiedSpireApi(false), 1400);
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function loadSpireMeta(includeGithubMeta: boolean) {
            try {
                const timeseriesUrl = new URL(SPIRE_UPTIME_TIMESERIES_URL);
                timeseriesUrl.searchParams.set(
                    "windowHours",
                    String(UPTIME_BLOCK_WINDOW_HOURS)
                );
                timeseriesUrl.searchParams.set(
                    "bucketMinutes",
                    String(UPTIME_BLOCK_BUCKET_MINUTES)
                );

                const [uptimeResponse, timeseriesResponse] = await Promise.all([
                    fetch(SPIRE_UPTIME_SUMMARY_URL, { cache: "no-store" }),
                    fetch(timeseriesUrl.toString(), { cache: "no-store" }),
                ]);
                if (!uptimeResponse.ok) return;

                let uptimeBlocks: MonitorTimeseriesBlock[] = [];
                if (timeseriesResponse.ok) {
                    try {
                        const timeseriesJson: unknown = await timeseriesResponse.json();
                        uptimeBlocks = parseTimeseriesPayload(timeseriesJson);
                    } catch {
                        uptimeBlocks = [];
                    }
                }

                const uptimeData = (await uptimeResponse.json()) as MonitorSummaryResponse;
                const summary = uptimeData.data;
                const latestSample = summary?.latest;
                const runtimeSha =
                    latestSample &&
                    latestSample.serviceCommitSha &&
                    latestSample.serviceCommitSha !== "unknown"
                        ? latestSample.serviceCommitSha.slice(0, 12)
                        : null;
                let latestRun:
                    | {
                          status: string;
                          conclusion: string | null;
                          html_url: string;
                          updated_at: string;
                      }
                    | undefined;
                let latestCommit: GitHubCommitApiResponse | undefined;
                if (includeGithubMeta) {
                    try {
                        const ghResponse = await fetch(SPIRE_GITHUB_API_URL);
                        if (ghResponse.ok) {
                            const ghJson = (await ghResponse.json()) as {
                                runs: GitHubWorkflowRunsResponse;
                                commits: GitHubCommitApiResponse[];
                            };
                            latestRun = ghJson.runs.workflow_runs?.[0];
                            latestCommit = ghJson.commits[0];
                        }
                    } catch {
                        // keep previous build metadata when GitHub is unavailable/rate-limited
                    }
                }

                if (!cancelled) {
                    setSpireUptimeBlocks(uptimeBlocks);
                    setSpireMeta((prev) => ({
                        apiReachable: latestSample?.ok ?? false,
                        buildStatus: latestRun
                            ? `${latestRun.status}${
                                  latestRun.conclusion
                                      ? ` / ${latestRun.conclusion}`
                                      : ""
                              }`
                            : prev?.buildStatus ?? "unknown",
                        buildUpdatedAt:
                            latestRun?.updated_at ?? prev?.buildUpdatedAt ?? "",
                        buildUrl: latestRun?.html_url ?? prev?.buildUrl ?? "",
                        healthVersion: latestSample?.serviceVersion ?? null,
                        healthCheckDurationMs:
                            latestSample?.statusCheckDurationMs ?? null,
                        dbHealthy: latestSample?.dbHealthy ?? null,
                        runtimeCommitSha: runtimeSha,
                        uptimePercent: summary?.uptimePercent ?? null,
                        averageLatencyMs: summary?.averageLatencyMs ?? null,
                        maxLatencyMs: summary?.maxLatencyMs ?? null,
                        latestLatencyMs: latestSample?.requestLatencyMs ?? null,
                        monitorSampledAt: latestSample?.sampledAt ?? null,
                        latestCommit: latestCommit
                            ? {
                                  sha: latestCommit.sha.slice(0, 12),
                                  message: latestCommit.commit.message,
                                  date: latestCommit.commit.author.date,
                                  url: latestCommit.html_url,
                                  authorName: latestCommit.commit.author.name,
                                  authorLogin:
                                      latestCommit.author?.login ?? null,
                                  authorAvatarUrl:
                                      latestCommit.author?.avatar_url ?? null,
                                  authorUrl:
                                      latestCommit.author?.html_url ?? null,
                              }
                            : prev?.latestCommit ?? null,
                    }));
                }
            } catch {
                // silent fallback to static view
            }
        }

        void loadSpireMeta(true);
        const refreshTimer = window.setInterval(() => {
            void loadSpireMeta(false);
        }, SPIRE_META_REFRESH_MS);
        return () => {
            cancelled = true;
            window.clearInterval(refreshTimer);
        };
    }, []);

    const totalUptimeBlockSlots = Math.max(
        1,
        Math.ceil(
            (UPTIME_BLOCK_WINDOW_HOURS * 60) / UPTIME_BLOCK_BUCKET_MINUTES
        )
    );
    const visibleUptimeBlocks = spireUptimeBlocks.slice(-totalUptimeBlockSlots);
    const missingUptimeBlockSlots = Math.max(
        0,
        totalUptimeBlockSlots - visibleUptimeBlocks.length
    );
    const paddedUptimeBlocks: Array<MonitorTimeseriesBlock | null> = [
        ...Array.from({ length: missingUptimeBlockSlots }, () => null),
        ...visibleUptimeBlocks,
    ];
    const runtimeRef =
        spireMeta?.runtimeCommitSha ??
        spireMeta?.latestCommit?.sha ??
        "unknown";
    const runtimeRefShort =
        runtimeRef === "unknown" ? runtimeRef : runtimeRef.slice(0, 7);
    const endpointStatusToneClass =
        spireMeta === null
            ? "text-zinc-400"
            : spireMeta.apiReachable
            ? "text-emerald-300"
            : "text-amber-300";
    const endpointStatusLabel =
        spireMeta === null
            ? "checking"
            : spireMeta.apiReachable
            ? "online"
            : "degraded";
    const endpointStatusDotClass =
        spireMeta !== null && spireMeta.apiReachable
            ? "h-2 w-2 rounded-full bg-current animate-pulse"
            : "h-2 w-2 rounded-full bg-current";

    return (
        <RoutePanel splotch="status" cardOverflowVisible>
            <h1 className="mt-0 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                Reference server status
            </h1>

            <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/90 px-3.5 py-3 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                        Endpoint
                    </p>
                    {spireMeta ? (
                        <div className="hidden items-center gap-2 lg:flex">
                            {spireMeta.healthVersion ? (
                                <VersionPill value={spireMeta.healthVersion} />
                            ) : null}
                            {spireMeta.latestCommit ? (
                                <BuildCommitPill
                                    status={spireMeta.buildStatus}
                                    buildHref={spireMeta.buildUrl}
                                    commit={spireMeta.latestCommit}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="overflow-x-auto whitespace-nowrap font-mono text-base text-zinc-100 sm:text-lg">
                            {spireApiUrl}
                        </p>
                        <span
                            className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${endpointStatusToneClass}`}
                        >
                            <span className={endpointStatusDotClass} />
                            {endpointStatusLabel}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopySpireApi}
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-white/10 p-2 text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-zinc-100"
                        aria-label="Copy Spire API URL"
                        title={copiedSpireApi ? "Copied" : "Copy endpoint"}
                    >
                        {copiedSpireApi ? (
                            <CheckIcon className="h-5 w-5" />
                        ) : (
                            <CopyIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>
                {spireMeta ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-zinc-500 lg:hidden">
                        {spireMeta.healthVersion ? (
                            <VersionPill value={spireMeta.healthVersion} />
                        ) : null}
                        {spireMeta.latestCommit ? (
                            <BuildCommitPill
                                status={spireMeta.buildStatus}
                                buildHref={spireMeta.buildUrl}
                                commit={spireMeta.latestCommit}
                                maxMessageLength={30}
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/80 px-3.5 py-3 sm:p-5">
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
                            Availability (24h)
                        </p>
                        <p className="mt-1 min-h-[1.75rem] font-mono text-lg text-zinc-100">
                            {spireMeta == null
                                ? null
                                : spireMeta.uptimePercent != null
                                ? `${spireMeta.uptimePercent.toFixed(2)}%`
                                : "n/a"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
                            Avg latency
                        </p>
                        <p className="mt-1 min-h-[1.75rem] font-mono text-lg text-zinc-100">
                            {spireMeta == null
                                ? null
                                : spireMeta.averageLatencyMs != null
                                ? `${Math.round(spireMeta.averageLatencyMs)}ms`
                                : "n/a"}
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="mb-2 text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
                        Reliability
                    </p>
                    <div className="relative z-20 flex w-full gap-0.5 overflow-visible pb-1 sm:gap-[0.1875rem]">
                        {paddedUptimeBlocks.map((block, index) => {
                            const slotClass =
                                "h-6 min-w-[0.3125rem] flex-1 basis-0";
                            if (!block) {
                                return (
                                    <div
                                        key={`uptime-empty-${index}`}
                                        className={slotClass}
                                    >
                                        <span className="block h-full w-full rounded-sm bg-zinc-700/60" />
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={`${block.bucketStart}-${index}`}
                                    className={slotClass}
                                >
                                    <UptimeReliabilityStripBlock
                                        block={block}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[0.6875rem] text-zinc-500">
                        <span>{UPTIME_BLOCK_WINDOW_HOURS}h ago</span>
                        <span>hourly blocks</span>
                        <span>now</span>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {spireMeta?.monitorSampledAt && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-zinc-400">
                            sampled
                            <span className="text-zinc-300">
                                {formatRelativeTime(spireMeta.monitorSampledAt)}
                            </span>
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-zinc-400">
                        runtime
                        <span className="font-mono text-zinc-200">
                            {runtimeRefShort}
                        </span>
                    </span>
                    {spireMeta && spireMeta.dbHealthy !== null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-zinc-400">
                            DB
                            <span
                                className={
                                    spireMeta.dbHealthy
                                        ? "text-emerald-300"
                                        : "text-amber-300"
                                }
                            >
                                {spireMeta.dbHealthy ? "healthy" : "degraded"}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <a
                    href={SPIRE_GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={DOC_SOURCE_LINK_CLASS}
                >
                    <GithubIcon
                        className="h-4 w-4 shrink-0 opacity-90"
                        aria-hidden
                    />
                    Source Code
                </a>
            </div>
        </RoutePanel>
    );
}
