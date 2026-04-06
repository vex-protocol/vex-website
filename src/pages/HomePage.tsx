import type { JSX } from "preact";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "preact/hooks";
import {
    Check,
    CheckCircle2,
    Copy,
    Github,
    LoaderCircle,
    XCircle,
} from "lucide-preact";

type NpmPackageResponse = {
    "dist-tags"?: Record<string, string>;
    time?: Record<string, string>;
};

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

type MonitorSummaryResponse = {
    data?: {
        windowHours: number;
        totalSamples: number;
        upSamples: number;
        downSamples: number;
        uptimePercent: number;
        averageLatencyMs: number;
        maxLatencyMs: number;
        latest?: {
            sampledAt: string;
            ok: boolean;
            requestLatencyMs: number;
            serviceVersion: string;
            serviceCommitSha: string;
            statusCheckDurationMs: number;
            requestsTotal: number;
            dbHealthy: boolean;
        };
    };
};

type MonitorTimeseriesBlock = {
    bucketStart: string;
    bucketEnd: string;
    sampleCount: number;
    upCount: number;
    downCount: number;
    uptimePercent: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    maxLatencyMs: number | null;
    status: "up" | "down" | "no_data";
};

type MonitorTimeseriesResponse = {
    data?: {
        windowHours: number;
        bucketMinutes: number;
        blocks: MonitorTimeseriesBlock[];
    };
};

type LibvexMeta = {
    rcVersion: string;
    latestVersion: string;
    publishedAt: string;
    buildStatus: string;
    buildUpdatedAt: string;
    buildUrl: string;
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
    totalRequests: number | null;
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

const NPM_PACKAGE_URL = "https://registry.npmjs.org/@vex-chat/libvex";
const LIBVEX_COMMITS_API_URL =
    "https://api.github.com/repos/vex-protocol/libvex-js/commits?per_page=1";
const LIBVEX_RUNS_API_URL =
    "https://api.github.com/repos/vex-protocol/libvex-js/actions/runs?per_page=1";
const SPIRE_RUNS_API_URL =
    "https://api.github.com/repos/vex-protocol/spire/actions/runs?per_page=1";
const SPIRE_COMMITS_API_URL =
    "https://api.github.com/repos/vex-protocol/spire/commits?per_page=1";
const SPIRE_UPTIME_SUMMARY_URL = "https://extrahash.ddns.net/api/summary";
const SPIRE_UPTIME_TIMESERIES_URL = "https://extrahash.ddns.net/api/timeseries";
const SPIRE_DOCS_URL = "https://spire.vex.wtf";
const DOCS_URL = "https://lib.vex.wtf";
const LIBVEX_NPM_URL = "https://www.npmjs.com/package/@vex-chat/libvex";
const LIBVEX_GITHUB_URL = "https://github.com/vex-protocol/libvex-js";
const SPIRE_GITHUB_URL = "https://github.com/vex-protocol/spire";
const UPTIME_BLOCK_WINDOW_HOURS = 24;
const UPTIME_BLOCK_BUCKET_MINUTES = 60;

function formatRelativeTime(value: string): string {
    return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
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
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-zinc-200">
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
            className={`inline-flex max-w-[310px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:brightness-110 sm:max-w-[430px] ${toneClasses}`}
            title={`${commit.message} · ${label} · ${formatRelativeTime(
                commit.date
            )}`}
        >
            {state === "passing" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : state === "failing" ? (
                <XCircle className="h-3.5 w-3.5 shrink-0" />
            ) : state === "running" ? (
                <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
            )}
            <span className="shrink-0 font-mono text-[12px] font-thin leading-none">
                {shortSha}
            </span>
            <span className="max-w-[14ch] truncate text-[12px] font-semibold leading-none text-zinc-100 sm:max-w-[20ch]">
                {message}
            </span>
            <span className="shrink-0 text-[10px] text-zinc-400/80">
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

export function HomePage(_: { path?: string; default?: boolean }): JSX.Element {
    const [libvexMeta, setLibvexMeta] = useState<LibvexMeta | null>(null);
    const [spireMeta, setSpireMeta] = useState<SpireMeta | null>(null);
    const [spireUptimeBlocks, setSpireUptimeBlocks] = useState<
        MonitorTimeseriesBlock[]
    >([]);
    const [copied, setCopied] = useState(false);
    const [copiedSpireApi, setCopiedSpireApi] = useState(false);

    const installCommand = "npm install @vex-chat/libvex";
    const spireApiUrl = "https://api.vex.wtf";

    useEffect(() => {
        let cancelled = false;

        async function loadLibvexMeta() {
            try {
                const [
                    npmResponse,
                    runsResponse,
                    commitsResponse,
                ] = await Promise.all([
                    fetch(NPM_PACKAGE_URL),
                    fetch(LIBVEX_RUNS_API_URL),
                    fetch(LIBVEX_COMMITS_API_URL),
                ]);
                if (!npmResponse.ok || !runsResponse.ok || !commitsResponse.ok)
                    return;

                const npmData = (await npmResponse.json()) as NpmPackageResponse;
                const runsData = (await runsResponse.json()) as GitHubWorkflowRunsResponse;
                const commitsData = (await commitsResponse.json()) as GitHubCommitApiResponse[];
                const latestRun = runsData.workflow_runs?.[0];
                const latestCommit = commitsData[0];
                const rcVersion = npmData["dist-tags"]?.rc ?? "n/a";
                const latestVersion = npmData["dist-tags"]?.latest ?? "n/a";
                const publishedAt = npmData.time?.[rcVersion] ?? "";

                if (!cancelled) {
                    setLibvexMeta({
                        rcVersion,
                        latestVersion,
                        publishedAt,
                        buildStatus: latestRun
                            ? `${latestRun.status}${
                                  latestRun.conclusion
                                      ? ` / ${latestRun.conclusion}`
                                      : ""
                              }`
                            : "unknown",
                        buildUpdatedAt: latestRun?.updated_at ?? "",
                        buildUrl: latestRun?.html_url ?? "",
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
                            : null,
                    });
                }
            } catch {
                // silent fallback to static view
            }
        }

        loadLibvexMeta();
        return () => {
            cancelled = true;
        };
    }, []);

    function handleCopyInstall(): void {
        void navigator.clipboard.writeText(installCommand).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        });
    }

    function handleCopySpireApi(): void {
        void navigator.clipboard.writeText(spireApiUrl).then(() => {
            setCopiedSpireApi(true);
            window.setTimeout(() => setCopiedSpireApi(false), 1400);
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function loadSpireMeta() {
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

                const [
                    runsResponse,
                    commitsResponse,
                    uptimeResponse,
                    timeseriesResponse,
                ] = await Promise.all([
                    fetch(SPIRE_RUNS_API_URL),
                    fetch(SPIRE_COMMITS_API_URL),
                    fetch(SPIRE_UPTIME_SUMMARY_URL, { cache: "no-store" }),
                    fetch(timeseriesUrl.toString(), { cache: "no-store" }),
                ]);
                if (
                    !runsResponse.ok ||
                    !commitsResponse.ok ||
                    !uptimeResponse.ok ||
                    !timeseriesResponse.ok
                )
                    return;

                const runsData = (await runsResponse.json()) as GitHubWorkflowRunsResponse;
                const commitsData = (await commitsResponse.json()) as GitHubCommitApiResponse[];
                const uptimeData = (await uptimeResponse.json()) as MonitorSummaryResponse;
                const timeseriesData = (await timeseriesResponse.json()) as MonitorTimeseriesResponse;
                const latestRun = runsData.workflow_runs?.[0];
                const latestCommit = commitsData[0];
                const summary = uptimeData.data;
                const latestSample = summary?.latest;
                const blocks = timeseriesData.data?.blocks ?? [];
                const runtimeSha =
                    latestSample &&
                    latestSample.serviceCommitSha &&
                    latestSample.serviceCommitSha !== "unknown"
                        ? latestSample.serviceCommitSha.slice(0, 12)
                        : null;

                if (!cancelled) {
                    setSpireUptimeBlocks(blocks);
                    setSpireMeta({
                        apiReachable: latestSample?.ok ?? false,
                        buildStatus: latestRun
                            ? `${latestRun.status}${
                                  latestRun.conclusion
                                      ? ` / ${latestRun.conclusion}`
                                      : ""
                              }`
                            : "unknown",
                        buildUpdatedAt: latestRun?.updated_at ?? "",
                        buildUrl: latestRun?.html_url ?? "",
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
                        totalRequests: latestSample?.requestsTotal ?? null,
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
                            : null,
                    });
                }
            } catch {
                // silent fallback to static view
            }
        }

        loadSpireMeta();
        return () => {
            cancelled = true;
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

    return (
        <section className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-10">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#e70000]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#e70000]/10 blur-3xl" />
                <div className="relative">
                    <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                        Add private chat anywhere.
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
                        libvex is a toolkit to integrate end to end encrypted
                        messaging into your product.
                    </p>
                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/90 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                                Install
                            </p>
                            {libvexMeta ? (
                                <div className="hidden items-center gap-2 sm:flex">
                                    <VersionPill
                                        value={libvexMeta.latestVersion}
                                        href={LIBVEX_NPM_URL}
                                    />
                                    {libvexMeta.latestCommit ? (
                                        <BuildCommitPill
                                            status={libvexMeta.buildStatus}
                                            buildHref={libvexMeta.buildUrl}
                                            commit={libvexMeta.latestCommit}
                                        />
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="overflow-x-auto whitespace-nowrap font-mono text-base sm:text-lg">
                                <span className="text-[#00b887]">$</span>{" "}
                                <span className="text-zinc-100">npm</span>{" "}
                                <span className="text-zinc-300">install</span>{" "}
                                <span className="text-[#e70000]">
                                    @vex-chat/libvex
                                </span>
                            </p>
                            <button
                                type="button"
                                onClick={handleCopyInstall}
                                className="inline-flex shrink-0 items-center justify-center rounded-md border border-white/10 p-2 text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-zinc-100"
                                aria-label="Copy install command"
                                title={copied ? "Copied" : "Copy command"}
                            >
                                {copied ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Copy className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {libvexMeta ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 sm:hidden">
                                <VersionPill
                                    value={libvexMeta.latestVersion}
                                    href={LIBVEX_NPM_URL}
                                />
                                {libvexMeta.latestCommit ? (
                                    <BuildCommitPill
                                        status={libvexMeta.buildStatus}
                                        buildHref={libvexMeta.buildUrl}
                                        commit={libvexMeta.latestCommit}
                                        maxMessageLength={30}
                                    />
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <p className="mt-4 inline-flex items-center gap-2 text-sm">
                        <a
                            href={DOCS_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-[#e70000] underline decoration-[#e70000] underline-offset-2 hover:text-[#ff2a2a]"
                        >
                            Read docs
                        </a>
                        <span className="text-zinc-600">·</span>
                        <a
                            href={LIBVEX_GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#e70000] underline decoration-[#e70000] underline-offset-2 hover:text-[#ff2a2a]"
                        >
                            <Github className="h-3.5 w-3.5 align-middle" />
                            View libvex source
                        </a>
                    </p>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-10">
                <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-[#e70000]/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 right-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative">
                    <h2 className="max-w-4xl text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                        Run on Spire with confidence.
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
                        Production-grade backend for libvex clients. Verified
                        uptime and latency are published live.
                    </p>
                    <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/90 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                                Endpoint
                            </p>
                            {spireMeta ? (
                                <div className="hidden items-center gap-2 sm:flex">
                                    {spireMeta.healthVersion ? (
                                        <VersionPill
                                            value={spireMeta.healthVersion}
                                        />
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
                                    className={
                                        spireMeta?.apiReachable
                                            ? "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-300"
                                            : "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber-300"
                                    }
                                >
                                    <span className="h-2 w-2 rounded-full bg-current" />
                                    {spireMeta?.apiReachable
                                        ? "online"
                                        : "degraded"}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopySpireApi}
                                className="inline-flex shrink-0 items-center justify-center rounded-md border border-white/10 p-2 text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-zinc-100"
                                aria-label="Copy Spire API URL"
                                title={
                                    copiedSpireApi ? "Copied" : "Copy endpoint"
                                }
                            >
                                {copiedSpireApi ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Copy className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {spireMeta ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 sm:hidden">
                                {spireMeta.healthVersion ? (
                                    <VersionPill
                                        value={spireMeta.healthVersion}
                                    />
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

                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/80 p-4 sm:p-5">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                    Availability (24h)
                                </p>
                                <p className="mt-1 font-mono text-lg text-zinc-100">
                                    {spireMeta?.uptimePercent !== null
                                        ? `${spireMeta?.uptimePercent}%`
                                        : "n/a"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                    Avg latency
                                </p>
                                <p className="mt-1 font-mono text-lg text-zinc-100">
                                    {spireMeta?.averageLatencyMs !== null
                                        ? `${Math.round(
                                              spireMeta?.averageLatencyMs ?? 0
                                          )}ms`
                                        : "n/a"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                    Total requests served
                                </p>
                                <p className="mt-1 font-mono text-lg text-zinc-100">
                                    {spireMeta &&
                                    spireMeta.totalRequests !== null
                                        ? spireMeta.totalRequests.toLocaleString()
                                        : "n/a"}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                Reliability strip
                            </p>
                            <div
                                className="grid w-full gap-[3px]"
                                style={{
                                    gridTemplateColumns: `repeat(${totalUptimeBlockSlots}, minmax(0, 1fr))`,
                                }}
                            >
                                {paddedUptimeBlocks.map((block, index) => {
                                    if (!block) {
                                        return (
                                            <span
                                                key={`uptime-empty-${index}`}
                                                className="h-6 rounded-[2px] bg-zinc-700/60"
                                            />
                                        );
                                    }
                                    const barClass =
                                        block.status === "up"
                                            ? "bg-emerald-400/90"
                                            : block.status === "down"
                                            ? "bg-red-400/90"
                                            : "bg-zinc-600/80";
                                    const hoverTitle =
                                        block.status === "no_data"
                                            ? undefined
                                            : [
                                                  formatRelativeTime(
                                                      block.bucketStart
                                                  ),
                                                  `avg latency ${Math.round(
                                                      block.avgLatencyMs ?? 0
                                                  )}ms`,
                                                  `${block.sampleCount} requests handled`,
                                              ].join(" · ");
                                    return (
                                        <span
                                            key={block.bucketStart}
                                            className={`h-6 rounded-[2px] ${barClass}`}
                                            title={hoverTitle}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
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
                                        {formatRelativeTime(
                                            spireMeta.monitorSampledAt
                                        )}
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
                                        {spireMeta.dbHealthy
                                            ? "healthy"
                                            : "degraded"}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="mt-4 inline-flex items-center gap-2 text-sm">
                        <a
                            href={SPIRE_DOCS_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-[#e70000] underline decoration-[#e70000] underline-offset-2 hover:text-[#ff2a2a]"
                        >
                            View docs
                        </a>
                        <span className="text-zinc-600">·</span>
                        <a
                            href={SPIRE_GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#e70000] underline decoration-[#e70000] underline-offset-2 hover:text-[#ff2a2a]"
                        >
                            <Github className="h-3.5 w-3.5 align-middle" />
                            View Spire source
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
