import fs from "node:fs/promises";
import path from "node:path";

export type PendingCla = {
    login: string;
    at: string;
    claVersion: string;
};

type QueueFile = { pending: PendingCla[] };

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

export async function readQueue(): Promise<QueueFile> {
    const fp = queuePath();
    try {
        const raw = await fs.readFile(fp, "utf8");
        const parsed = JSON.parse(raw) as QueueFile;
        if (!parsed.pending || !Array.isArray(parsed.pending)) {
            return { pending: [] };
        }
        return parsed;
    } catch {
        return { pending: [] };
    }
}

export async function addPending(entry: PendingCla): Promise<void> {
    const fp = queuePath();
    await ensureDirForFile(fp);
    const q = await readQueue();
    const lower = entry.login.toLowerCase();
    if (q.pending.some((p) => p.login.toLowerCase() === lower)) {
        return;
    }
    q.pending.push(entry);
    await fs.writeFile(fp, JSON.stringify(q, null, 2) + "\n", "utf8");
}

export async function removePending(login: string): Promise<boolean> {
    const fp = queuePath();
    const q = await readQueue();
    const lower = login.toLowerCase();
    const before = q.pending.length;
    q.pending = q.pending.filter((p) => p.login.toLowerCase() !== lower);
    if (q.pending.length === before) {
        return false;
    }
    await ensureDirForFile(fp);
    await fs.writeFile(fp, JSON.stringify(q, null, 2) + "\n", "utf8");
    return true;
}
