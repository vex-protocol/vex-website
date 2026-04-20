import fs from "node:fs/promises";
import path from "node:path";

import { getLatestApproveForLogin } from "./claAudit";

export type PendingCla = {
    login: string;
    at: string;
    claVersion: string;
};

export type RejectedCla = {
    login: string;
    /** When they originally submitted (from pending). */
    submittedAt: string;
    rejectedAt: string;
    claVersion: string;
};

export type CompletedCla = {
    login: string;
    /** Original submission time while pending. */
    at: string;
    claVersion: string;
};

export type QueueFile = {
    pending: PendingCla[];
    rejected: RejectedCla[];
    /** Lowercase logins allowed to submit again after rejection. */
    resubmitAllowed: string[];
    /** Users who completed the maintainer approval step. */
    completed: CompletedCla[];
};

function queuePath(): string {
    const p = process.env.CLA_QUEUE_PATH?.trim();
    if (p) {
        return path.resolve(p);
    }
    return path.join(process.cwd(), "data", "cla-pending.json");
}

async function ensureDirForFile(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function normalizeQueueFile(raw: unknown): QueueFile {
    const empty: QueueFile = {
        pending: [],
        rejected: [],
        resubmitAllowed: [],
        completed: [],
    };
    if (!raw || typeof raw !== "object") {
        return empty;
    }
    const o = raw as Record<string, unknown>;

    const pending: PendingCla[] = [];
    if (Array.isArray(o.pending)) {
        for (const row of o.pending) {
            if (
                row &&
                typeof row === "object" &&
                typeof (row as { login?: string }).login === "string" &&
                typeof (row as { at?: string }).at === "string" &&
                typeof (row as { claVersion?: string }).claVersion === "string"
            ) {
                const r = row as PendingCla;
                pending.push({
                    login: r.login,
                    at: r.at,
                    claVersion: r.claVersion,
                });
            }
        }
    }

    const rejected: RejectedCla[] = [];
    if (Array.isArray(o.rejected)) {
        for (const row of o.rejected) {
            if (
                row &&
                typeof row === "object" &&
                typeof (row as { login?: string }).login === "string" &&
                typeof (row as { submittedAt?: string }).submittedAt ===
                    "string" &&
                typeof (row as { rejectedAt?: string }).rejectedAt ===
                    "string" &&
                typeof (row as { claVersion?: string }).claVersion === "string"
            ) {
                const r = row as RejectedCla;
                rejected.push({
                    login: r.login,
                    submittedAt: r.submittedAt,
                    rejectedAt: r.rejectedAt,
                    claVersion: r.claVersion,
                });
            }
        }
    }

    const resubmitAllowed: string[] = [];
    if (Array.isArray(o.resubmitAllowed)) {
        for (const x of o.resubmitAllowed) {
            if (typeof x === "string" && x.trim()) {
                resubmitAllowed.push(x.trim().toLowerCase());
            }
        }
    }

    const completed: CompletedCla[] = [];
    if (Array.isArray(o.completed)) {
        for (const row of o.completed) {
            if (
                row &&
                typeof row === "object" &&
                typeof (row as { login?: string }).login === "string" &&
                typeof (row as { at?: string }).at === "string" &&
                typeof (row as { claVersion?: string }).claVersion === "string"
            ) {
                const r = row as CompletedCla;
                completed.push({
                    login: r.login,
                    at: r.at,
                    claVersion: r.claVersion,
                });
            }
        }
    }

    return { pending, rejected, resubmitAllowed, completed };
}

async function writeQueue(q: QueueFile): Promise<void> {
    const fp = queuePath();
    await ensureDirForFile(fp);
    await fs.writeFile(fp, JSON.stringify(q, null, 2) + "\n", "utf8");
}

export async function readQueue(): Promise<QueueFile> {
    const fp = queuePath();
    try {
        const rawText = await fs.readFile(fp, "utf8");
        const parsed = JSON.parse(rawText) as unknown;
        return normalizeQueueFile(parsed);
    } catch {
        return normalizeQueueFile(null);
    }
}

export type ClaEligibility =
    | { state: "can_submit" }
    | { state: "pending"; submittedAt: string }
    | {
          state: "rejected";
          submittedAt: string;
          rejectedAt: string;
          canResubmit: boolean;
      }
    | {
          state: "completed";
          completedAt: string;
          claVersion: string;
          /** From audit log when available. */
          approvedByLogin: string | null;
          approvedAt: string | null;
      };

export async function getClaEligibility(
    login: string
): Promise<ClaEligibility> {
    const q = await readQueue();
    const lower = login.toLowerCase();

    const pend = q.pending.find((p) => p.login.toLowerCase() === lower);
    if (pend) {
        return { state: "pending", submittedAt: pend.at };
    }

    const rej = q.rejected.find((r) => r.login.toLowerCase() === lower);
    if (rej) {
        const canResubmit = q.resubmitAllowed.includes(lower);
        return {
            state: "rejected",
            submittedAt: rej.submittedAt,
            rejectedAt: rej.rejectedAt,
            canResubmit,
        };
    }

    const done = q.completed.find((c) => c.login.toLowerCase() === lower);
    if (done) {
        const approval = await getLatestApproveForLogin(done.login);
        return {
            state: "completed",
            completedAt: done.at,
            claVersion: done.claVersion,
            approvedByLogin: approval?.actor ?? null,
            approvedAt: approval?.at ?? null,
        };
    }

    return { state: "can_submit" };
}

export async function addPending(entry: PendingCla): Promise<void> {
    const q = await readQueue();
    const lower = entry.login.toLowerCase();

    if (q.pending.some((p) => p.login.toLowerCase() === lower)) {
        return;
    }
    if (q.completed.some((c) => c.login.toLowerCase() === lower)) {
        return;
    }

    const rejIdx = q.rejected.findIndex((r) => r.login.toLowerCase() === lower);
    if (rejIdx >= 0) {
        if (!q.resubmitAllowed.includes(lower)) {
            return;
        }
        q.rejected.splice(rejIdx, 1);
        q.resubmitAllowed = q.resubmitAllowed.filter((l) => l !== lower);
    }

    q.pending.push(entry);
    await writeQueue(q);
}

export async function removePending(login: string): Promise<boolean> {
    const q = await readQueue();
    const lower = login.toLowerCase();
    const before = q.pending.length;
    q.pending = q.pending.filter((p) => p.login.toLowerCase() !== lower);
    if (q.pending.length === before) {
        return false;
    }
    await writeQueue(q);
    return true;
}

/** Returns the removed pending row when rejected (for audit logging). */
export async function rejectPending(login: string): Promise<PendingCla | null> {
    const q = await readQueue();
    const lower = login.toLowerCase();
    const idx = q.pending.findIndex((p) => p.login.toLowerCase() === lower);
    if (idx < 0) {
        return null;
    }
    const row = q.pending[idx];
    q.pending.splice(idx, 1);
    q.rejected.push({
        login: row.login,
        submittedAt: row.at,
        rejectedAt: new Date().toISOString(),
        claVersion: row.claVersion,
    });
    await writeQueue(q);
    return row;
}

export async function allowResubmit(login: string): Promise<boolean> {
    const q = await readQueue();
    const lower = login.toLowerCase();
    if (!q.rejected.some((r) => r.login.toLowerCase() === lower)) {
        return false;
    }
    if (!q.resubmitAllowed.includes(lower)) {
        q.resubmitAllowed.push(lower);
    }
    await writeQueue(q);
    return true;
}

export async function addCompleted(entry: CompletedCla): Promise<void> {
    const q = await readQueue();
    const lower = entry.login.toLowerCase();
    if (!q.completed.some((c) => c.login.toLowerCase() === lower)) {
        q.completed.push(entry);
    }
    await writeQueue(q);
}
