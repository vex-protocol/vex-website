/**
 * Imported first from `local-api-server.ts` so `.env` is loaded before OAuth handlers read `process.env`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// `override: true` so vex.wtf/.env wins over stray shell vars (e.g. PUBLIC_SITE_URL from
// another project) — otherwise OAuth redirects to the wrong origin after GitHub login.
dotenv.config({
    path: path.resolve(__dirname, "..", ".env"),
    override: true,
});
