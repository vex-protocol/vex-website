/**
 * Small helpers for plain Node.js `http` handlers (no Vercel / platform-specific types).
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export function redirect(
    res: ServerResponse,
    location: string,
    statusCode: number = 302
): void {
    res.writeHead(statusCode, { Location: location });
    res.end();
}

export function sendJson(
    res: ServerResponse,
    statusCode: number,
    body: unknown
): void {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

export function sendText(
    res: ServerResponse,
    statusCode: number,
    body: string,
    contentType: string = "text/plain; charset=utf-8"
): void {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", contentType);
    res.end(body);
}

/** Read JSON body from a Node HTTP request (no pre-parsed `req.body`). */
export function readJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on("end", () => {
            try {
                const raw = Buffer.concat(chunks).toString("utf8");
                if (raw.length === 0) {
                    resolve({});
                    return;
                }
                resolve(JSON.parse(raw) as unknown);
            } catch (err) {
                reject(err);
            }
        });
        req.on("error", reject);
    });
}

/** True when cookies should use the `Secure` flag (HTTPS). */
export function useSecureCookies(): boolean {
    return (
        process.env.NODE_ENV === "production" ||
        process.env.FORCE_SECURE_COOKIES === "1"
    );
}
