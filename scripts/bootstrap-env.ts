/**
 * Imported first from `local-api-server.ts` so `.env` is loaded before OAuth handlers read `process.env`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
