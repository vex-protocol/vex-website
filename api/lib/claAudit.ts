import fs from "node:fs/promises";
import path from "node:path";

export type ClaAuditEvent =
    | {
          kind: "submit";
          at: string;
          login: string;
          claVersion: string;
      }
    | {
          kind: "approve";
          at: string;
          login: string;
          actor: string;
          claVersion: string;
      }
    | {
          kind: "reject";
          at: string;
          login: string;
          actor: string;
          claVersion: string;
      }
    | {
          kind: "allow_resubmit";
          at: string;
          login: string;
          actor: string;
      };

function auditPath(): string {
    const p = process.env.CLA_AUDIT_PATH?.trim();
    if (p) {
        return path.resolve(p);
    }
    return path.join(process.cwd(), "data", "cla-audit.jsonl");
}

async function ensureDirForFile(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function appendClaAuditEvent(event: ClaAuditEvent): Promise<void> {
    const fp = auditPath();
    await ensureDirForFile(fp);
    const line = JSON.stringify(event) + "\n";
    await fs.appendFile(fp, line, "utf8");
}

/** Newest first. */
export async function readClaAuditEvents(): Promise<ClaAuditEvent[]> {
    const fp = auditPath();
    try {
        const raw = await fs.readFile(fp, "utf8");
        const lines = raw.split("\n").filter((l) => l.trim() !== "");
        const events: ClaAuditEvent[] = [];
        for (const line of lines) {
            try {
                events.push(JSON.parse(line) as ClaAuditEvent);
            } catch {
                // skip bad lines
            }
        }
        return events.reverse();
    } catch {
        return [];
    }
}
