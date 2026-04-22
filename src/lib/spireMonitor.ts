/** Types and parsing for `monitor.vex.wtf` Spire summary + timeseries APIs. */

export type MonitorSummaryResponse = {
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
            dbHealthy: boolean;
        };
    };
};

/** Consecutive polls with the same outcome, oldest sample first (left in the strip). */
export type PollOkRun = { ok: boolean; count: number };

export type MonitorTimeseriesBlock = {
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

export const SPIRE_UPTIME_SUMMARY_URL = "https://monitor.vex.wtf/spire/summary";
export const SPIRE_UPTIME_TIMESERIES_URL =
    "https://monitor.vex.wtf/spire/timeseries";
export const SPIRE_GITHUB_API_URL = "/api/gh/public/spire-github";
export const UPTIME_BLOCK_WINDOW_HOURS = 24;
export const UPTIME_BLOCK_BUCKET_MINUTES = 60;
export const SPIRE_META_REFRESH_MS = 60_000;

export const BUCKET_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});
export const BUCKET_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

export function coerceNonNegInt(value: unknown): number {
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

export function parseTimeseriesPayload(
    payload: unknown
): MonitorTimeseriesBlock[] {
    const list = extractTimeseriesBlockList(payload);
    if (!list?.length) return [];
    return list
        .map(normalizeTimeseriesBlock)
        .filter((b): b is MonitorTimeseriesBlock => b !== null);
}

export function getMonitorBucketPollCounts(
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

export function formatBucketWindowClock(block: MonitorTimeseriesBlock): string {
    const start = new Date(block.bucketStart);
    const end = new Date(block.bucketEnd);
    return `${BUCKET_DATE_TIME_FORMATTER.format(
        start
    )} -> ${BUCKET_TIME_FORMATTER.format(end)}`;
}

export function formatBucketDurationLabel(
    block: MonitorTimeseriesBlock
): string {
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
