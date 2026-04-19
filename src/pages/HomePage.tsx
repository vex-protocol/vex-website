import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
    BookOpenIcon,
    CheckCircle2Icon,
    CheckIcon,
    CopyIcon,
    GithubIcon,
    LoaderCircleIcon,
    XCircleIcon,
} from "../components/Icons";
import { formatRelativeTime } from "../lib/relativeTime";

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

/** Consecutive polls with the same outcome, oldest sample first (left in the strip). */
type PollOkRun = { ok: boolean; count: number };

type MonitorTimeseriesBlock = {
    bucketStart: string;
    bucketEnd: string;
    /** Monitor polls in the bucket (alias of sampleCount when provided by API). */
    total?: number;
    /** Polls where the target was up (alias of upCount). */
    online?: number;
    /** Polls where the target was down / error (alias of downCount). */
    offline?: number;
    sampleCount: number;
    upCount: number;
    downCount: number;
    /**
     * Strip segments in chronological order (left = earliest). Derived from
     * `samples`/`polls` with timestamps, or from `poll_ok_runs` / `samples_ok`.
     */
    pollOkRuns?: PollOkRun[];
    /** Max − min of requests_total in the bucket, or null if unavailable. */
    serviceRequestsDelta?: number | null;
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
/** Cached GitHub metadata via `api/gh/public/*` (see `api/lib/githubPublicCache.ts`). */
const LIBVEX_GITHUB_API_URL = "/api/gh/public/libvex-github";
const SPIRE_GITHUB_API_URL = "/api/gh/public/spire-github";
const SPIRE_UPTIME_SUMMARY_URL = "https://monitor.vex.wtf/spire/summary";
const SPIRE_UPTIME_TIMESERIES_URL = "https://monitor.vex.wtf/spire/timeseries";
const SPIRE_DOCS_URL = "https://spire.vex.wtf";
const DOCS_URL = "https://lib.vex.wtf";
const LIBVEX_NPM_URL = "https://www.npmjs.com/package/@vex-chat/libvex";
const LIBVEX_GITHUB_URL = "https://github.com/vex-protocol/libvex-js";
const SPIRE_GITHUB_URL = "https://github.com/vex-protocol/spire";
const UPTIME_BLOCK_WINDOW_HOURS = 24;
const UPTIME_BLOCK_BUCKET_MINUTES = 60;
const SPIRE_META_REFRESH_MS = 60_000;
const BUCKET_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});
const BUCKET_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

function coerceNonNegInt(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
    }
    return 0;
}

function coerceNullableNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function pickRecordField(
    row: Record<string, unknown>,
    keys: string[]
): unknown {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
}

function pickNonEmptyString(
    row: Record<string, unknown>,
    keys: string[]
): string {
    for (const key of keys) {
        const v = row[key];
        if (typeof v === "string" && v.length > 0) return v;
    }
    return "";
}

/** ISO string from field: non-empty string or unix epoch (seconds or ms). */
function pickIsoInstant(row: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const v = row[key];
        if (typeof v === "string" && v.length > 0) return v;
        if (typeof v === "number" && Number.isFinite(v)) {
            const ms = v < 1e12 ? v * 1000 : v;
            const d = new Date(ms);
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    }
    return "";
}

function coerceSampleBool(value: unknown): boolean | null {
    if (value === true || value === 1 || value === "1" || value === "true") {
        return true;
    }
    if (value === false || value === 0 || value === "0" || value === "false") {
        return false;
    }
    return null;
}

function booleansToRuns(values: boolean[]): PollOkRun[] {
    if (values.length === 0) return [];
    const runs: PollOkRun[] = [];
    let cur = values[0];
    let n = 1;
    for (let i = 1; i < values.length; i++) {
        if (values[i] === cur) n++;
        else {
            runs.push({ ok: cur, count: n });
            cur = values[i];
            n = 1;
        }
    }
    runs.push({ ok: cur, count: n });
    return runs;
}

function mergeAdjacentPollRuns(runs: PollOkRun[]): PollOkRun[] {
    const out: PollOkRun[] = [];
    for (const r of runs) {
        if (r.count <= 0) continue;
        const last = out[out.length - 1];
        if (last && last.ok === r.ok) last.count += r.count;
        else out.push({ ok: r.ok, count: r.count });
    }
    return out;
}

function parsePollRunEntry(raw: unknown): PollOkRun | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const countRaw = o.n ?? o.count ?? o.samples;
    const count =
        countRaw === undefined || countRaw === null
            ? 1
            : coerceNonNegInt(countRaw);
    if (count <= 0) return null;
    let ok: boolean | null = null;
    if (typeof o.ok === "boolean") ok = o.ok;
    else if (o.ok === 1 || o.ok === "1" || o.ok === "true") ok = true;
    else if (o.ok === 0 || o.ok === "0" || o.ok === "false") ok = false;
    else if (typeof o.up === "boolean") ok = o.up;
    else if (o.status === "up" || o.status === "online" || o.status === "ok") {
        ok = true;
    } else if (
        o.status === "down" ||
        o.status === "offline" ||
        o.status === "error"
    ) {
        ok = false;
    }
    if (ok === null) return null;
    return { ok, count };
}

function pollRunsMatchCounts(
    runs: PollOkRun[],
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

function extractTimestampMsFromValue(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) {
        const ms = v < 1e12 ? v * 1000 : v;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return ms;
        return null;
    }
    if (typeof v === "string" && v.length > 0) {
        const parsed = Date.parse(v);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
}

function coerceOkFromSampleRecord(o: Record<string, unknown>): boolean | null {
    if (typeof o.ok === "boolean") return o.ok;
    if (o.ok === 1 || o.ok === "1" || o.ok === "true") return true;
    if (o.ok === 0 || o.ok === "0" || o.ok === "false") return false;
    if (typeof o.up === "boolean") return o.up;
    if (o.status === "up" || o.status === "online" || o.status === "ok") {
        return true;
    }
    if (o.status === "down" || o.status === "offline" || o.status === "error") {
        return false;
    }
    return null;
}

function sampleRecordTimeMs(o: Record<string, unknown>): number | null {
    const timeKeys = [
        "sampledAt",
        "sampled_at",
        "timestamp",
        "time",
        "ts",
        "at",
        "createdAt",
        "created_at",
        "t",
    ];
    for (const tk of timeKeys) {
        const ms = extractTimestampMsFromValue(o[tk]);
        if (ms !== null) return ms;
    }
    return null;
}

function extractPollOkRunsFromTimestampedSamples(
    row: Record<string, unknown>,
    sampleCount: number,
    upCount: number,
    downCount: number
): PollOkRun[] | undefined {
    const arrayKeys = [
        "samples",
        "polls",
        "checks",
        "points",
        "sample_points",
        "bucket_samples",
    ];
    for (const key of arrayKeys) {
        const arr = row[key];
        if (!Array.isArray(arr) || arr.length !== sampleCount) continue;
        const items: { t: number; ok: boolean; i: number }[] = [];
        let bad = false;
        for (let i = 0; i < arr.length; i++) {
            const raw = arr[i];
            if (!raw || typeof raw !== "object") {
                bad = true;
                break;
            }
            const o = raw as Record<string, unknown>;
            const t = sampleRecordTimeMs(o);
            const ok = coerceOkFromSampleRecord(o);
            if (t === null || ok === null) {
                bad = true;
                break;
            }
            items.push({ t, ok, i });
        }
        if (bad) continue;
        items.sort((a, b) => a.t - b.t || a.i - b.i);
        const runs = booleansToRuns(items.map((x) => x.ok));
        if (pollRunsMatchCounts(runs, sampleCount, upCount, downCount)) {
            return runs;
        }
    }
    return undefined;
}

function extractPollOkRuns(
    row: Record<string, unknown>,
    sampleCount: number,
    upCount: number,
    downCount: number
): PollOkRun[] | undefined {
    if (sampleCount === 0) return undefined;

    const fromTimestamps = extractPollOkRunsFromTimestampedSamples(
        row,
        sampleCount,
        upCount,
        downCount
    );
    if (fromTimestamps) return fromTimestamps;

    const runArrayKeys = [
        "pollOkRuns",
        "poll_ok_runs",
        "okRuns",
        "ok_runs",
        "sampleRuns",
        "sample_runs",
        "outcomeRuns",
        "outcome_runs",
    ];
    for (const key of runArrayKeys) {
        const arr = row[key];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const runs = mergeAdjacentPollRuns(
            arr.map(parsePollRunEntry).filter((r): r is PollOkRun => r !== null)
        );
        if (
            runs.length > 0 &&
            pollRunsMatchCounts(runs, sampleCount, upCount, downCount)
        ) {
            return runs;
        }
    }

    const boolArrayKeys = [
        "samplesOk",
        "samples_ok",
        "sampleOutcomes",
        "sample_outcomes",
        "outcomes",
        "pollsOk",
        "polls_ok",
    ];
    for (const key of boolArrayKeys) {
        const arr = row[key];
        if (!Array.isArray(arr) || arr.length !== sampleCount) continue;
        const bools: boolean[] = [];
        let valid = true;
        for (const v of arr) {
            const b = coerceSampleBool(v);
            if (b === null) {
                valid = false;
                break;
            }
            bools.push(b);
        }
        if (!valid) continue;
        const runs = booleansToRuns(bools);
        if (pollRunsMatchCounts(runs, sampleCount, upCount, downCount)) {
            return runs;
        }
    }

    return undefined;
}

function normalizeTimeseriesBlock(raw: unknown): MonitorTimeseriesBlock | null {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    const requestsRow =
        row.requests && typeof row.requests === "object"
            ? (row.requests as Record<string, unknown>)
            : null;
    const bucketStart = pickIsoInstant(row, [
        "bucketStart",
        "bucket_start",
        "start",
        "from",
        "startTime",
        "start_time",
        "tStart",
        "t_start",
    ]);
    const bucketEnd = pickIsoInstant(row, [
        "bucketEnd",
        "bucket_end",
        "end",
        "to",
        "endTime",
        "end_time",
        "tEnd",
        "t_end",
    ]);
    if (!bucketStart || !bucketEnd) return null;

    const sampleCount = coerceNonNegInt(
        pickRecordField(row, ["sampleCount", "sample_count", "total"]) ??
            requestsRow?.total
    );
    const upCount = coerceNonNegInt(
        pickRecordField(row, ["upCount", "up_count", "online"]) ??
            requestsRow?.online
    );
    const downCount = coerceNonNegInt(
        pickRecordField(row, ["downCount", "down_count", "offline"]) ??
            requestsRow?.offline
    );

    const uptimeRaw = pickRecordField(row, ["uptimePercent", "uptime_percent"]);
    let uptimePercent =
        typeof uptimeRaw === "number" && Number.isFinite(uptimeRaw)
            ? uptimeRaw
            : sampleCount > 0
            ? (upCount / sampleCount) * 100
            : 0;

    const statusRaw = row.status;
    let status: MonitorTimeseriesBlock["status"];
    if (statusRaw === "up" || statusRaw === "down" || statusRaw === "no_data") {
        status = statusRaw;
    } else if (sampleCount === 0) {
        status = "no_data";
    } else if (downCount === 0) {
        status = "up";
    } else if (upCount === 0) {
        status = "down";
    } else {
        status = upCount >= downCount ? "up" : "down";
    }

    const deltaRaw = pickRecordField(row, [
        "serviceRequestsDelta",
        "service_requests_delta",
    ]);
    let serviceRequestsDelta: number | null = null;
    if (deltaRaw !== undefined && deltaRaw !== null) {
        const d = coerceNullableNumber(deltaRaw);
        serviceRequestsDelta = d;
    }

    const pollOkRuns = extractPollOkRuns(row, sampleCount, upCount, downCount);

    return {
        bucketStart,
        bucketEnd,
        total: sampleCount,
        online: upCount,
        offline: downCount,
        sampleCount,
        upCount,
        downCount,
        ...(pollOkRuns && pollOkRuns.length > 0 ? { pollOkRuns } : {}),
        serviceRequestsDelta,
        uptimePercent,
        avgLatencyMs: coerceNullableNumber(
            pickRecordField(row, ["avgLatencyMs", "avg_latency_ms"])
        ),
        p95LatencyMs: coerceNullableNumber(
            pickRecordField(row, ["p95LatencyMs", "p95_latency_ms"])
        ),
        maxLatencyMs: coerceNullableNumber(
            pickRecordField(row, ["maxLatencyMs", "max_latency_ms"])
        ),
        status,
    };
}

const TS_BLOCK_ARRAY_KEYS = [
    "blocks",
    "buckets",
    "series",
    "hourly",
    "rows",
    "items",
] as const;

const TS_NESTED_ROOT_KEYS = [
    "data",
    "payload",
    "result",
    "response",
    "body",
] as const;

function extractTimeseriesBlockList(payload: unknown): unknown[] | undefined {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return undefined;
    const root = payload as Record<string, unknown>;

    for (const nk of TS_NESTED_ROOT_KEYS) {
        const inner = root[nk];
        if (inner && typeof inner === "object" && !Array.isArray(inner)) {
            const o = inner as Record<string, unknown>;
            for (const ak of TS_BLOCK_ARRAY_KEYS) {
                if (Array.isArray(o[ak])) return o[ak] as unknown[];
            }
        }
    }

    for (const ak of TS_BLOCK_ARRAY_KEYS) {
        if (Array.isArray(root[ak])) return root[ak] as unknown[];
    }

    for (const nk of TS_NESTED_ROOT_KEYS) {
        const inner = root[nk];
        if (Array.isArray(inner)) return inner;
    }

    return undefined;
}

function parseTimeseriesPayload(payload: unknown): MonitorTimeseriesBlock[] {
    const list = extractTimeseriesBlockList(payload);
    if (!list?.length) return [];
    return list
        .map(normalizeTimeseriesBlock)
        .filter((b): b is MonitorTimeseriesBlock => b !== null);
}

function getMonitorBucketPollCounts(
    block: MonitorTimeseriesBlock
): {
    total: number;
    online: number;
    offline: number;
} {
    return {
        total: coerceNonNegInt(block.total ?? block.sampleCount),
        online: coerceNonNegInt(block.online ?? block.upCount),
        offline: coerceNonNegInt(block.offline ?? block.downCount),
    };
}

function formatBucketWindowClock(block: MonitorTimeseriesBlock): string {
    const start = new Date(block.bucketStart);
    const end = new Date(block.bucketEnd);
    return `${BUCKET_DATE_TIME_FORMATTER.format(
        start
    )} -> ${BUCKET_TIME_FORMATTER.format(end)}`;
}

function formatBucketDurationLabel(block: MonitorTimeseriesBlock): string {
    const ms =
        new Date(block.bucketEnd).getTime() -
        new Date(block.bucketStart).getTime();
    const mins = Math.max(0, Math.round(ms / 60000));
    if (mins >= 60 && mins % 60 === 0) {
        const h = mins / 60;
        return h === 1 ? "1 hour" : `${h} hours`;
    }
    return mins === 1 ? "1 minute" : `${mins} minutes`;
}

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
            {/* pt-1.5 bridges the gap under the bar so hover/focus is not lost before the panel */}
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

function DocsSourceLinkRow(props: {
    docsHref: string;
    sourceHref: string;
}): JSX.Element {
    return (
        <div className="mt-4 flex flex-wrap gap-2">
            <a
                href={props.docsHref}
                target="_blank"
                rel="noreferrer"
                className={DOC_SOURCE_LINK_CLASS}
            >
                <BookOpenIcon
                    className="h-4 w-4 shrink-0 opacity-90"
                    aria-hidden
                />
                Docs
            </a>
            <a
                href={props.sourceHref}
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
                const [npmResponse, ghResponse] = await Promise.all([
                    fetch(NPM_PACKAGE_URL),
                    fetch(LIBVEX_GITHUB_API_URL),
                ]);
                if (!npmResponse.ok || !ghResponse.ok) return;

                const npmData = (await npmResponse.json()) as NpmPackageResponse;
                const ghJson = (await ghResponse.json()) as {
                    runs: GitHubWorkflowRunsResponse;
                    commits: GitHubCommitApiResponse[];
                };
                const runsData = ghJson.runs;
                const commitsData = ghJson.commits;
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
        <section className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-3 sm:p-10">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#e70000]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#e70000]/10 blur-3xl" />
                <div className="relative">
                    <h1 className="max-w-4xl text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                        Add private chat anywhere.
                    </h1>
                    <p className="hero-lede mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
                        We believe privacy is a fundamental human right.{" "}
                        <code>libvex</code> is an open source javascript library
                        and server enabling end to end encrypted messaging to
                        nearly anything.
                    </p>
                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/90 px-3.5 py-3 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                                Install
                            </p>
                            {libvexMeta ? (
                                <div className="hidden items-center gap-2 lg:flex">
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
                                    <CheckIcon className="h-5 w-5" />
                                ) : (
                                    <CopyIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {libvexMeta ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-zinc-500 lg:hidden">
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
                    <DocsSourceLinkRow
                        docsHref={DOCS_URL}
                        sourceHref={LIBVEX_GITHUB_URL}
                    />
                </div>
            </div>

            <div className="relative overflow-visible rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-3 sm:p-10">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute -left-20 -top-24 h-52 w-52 rounded-full bg-[#e70000]/20 blur-3xl" />
                    <div className="absolute -bottom-28 right-16 h-56 w-56 rounded-full bg-[#e70000]/10 blur-3xl" />
                </div>
                <div className="relative">
                    <h2 className="max-w-4xl text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                        Reliable and resilient.
                    </h2>
                    <p className="hero-lede mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
                        Use our hosted API or deploy your own to control your
                        communications stack.
                    </p>
                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/90 px-3.5 py-3 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                                Endpoint
                            </p>
                            {spireMeta ? (
                                <div className="hidden items-center gap-2 lg:flex">
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
                                title={
                                    copiedSpireApi ? "Copied" : "Copy endpoint"
                                }
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

                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/80 px-3.5 py-3 sm:p-5">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
                                    Availability (24h)
                                </p>
                                <p className="mt-1 font-mono text-lg text-zinc-100">
                                    {spireMeta?.uptimePercent !== null
                                        ? `${spireMeta?.uptimePercent?.toFixed(
                                              2
                                          )}%`
                                        : "n/a"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
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
                                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-500">
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

                    <DocsSourceLinkRow
                        docsHref={SPIRE_DOCS_URL}
                        sourceHref={SPIRE_GITHUB_URL}
                    />
                </div>
            </div>
        </section>
    );
}
