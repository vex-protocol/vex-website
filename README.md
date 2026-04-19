website for vex.wtf

## Local development

The site is **Vite + Preact** (`npm run dev`). That **only** serves the frontend; files under `api/` are plain Node HTTP handlers and are **not** started by Vite.

**Full stack (frontend + GitHub OAuth API):**

1. Copy `.env.example` to `.env` and set `SITE_ORIGIN=http://localhost:5173`, `SESSION_SECRET` (or `CLA_SESSION_SECRET`), and GitHub OAuth credentials. Register a [GitHub OAuth app](https://github.com/settings/developers) with callback URL **`http://localhost:5173/api/gh/callback`** (add your production URL too, e.g. `https://vex.wtf/api/gh/callback`).
2. Run **`npm run dev:all`** — starts Vite (port **5173**) and the local API server (default **8787**). Vite **proxies** `/api/*` to that port (`vite.config.ts` reads **`CLA_API_PORT`** from `.env`).

If you see **`EADDRINUSE`** on 8787, another dev server is still running — quit it, or set **`CLA_API_PORT`** (e.g. `8788`) in `.env` and restart (Vite picks it up for the proxy). On macOS: `lsof -i :8787` then `kill <pid>`.

**Frontend only:** `npm run dev` (pages work; `/api/...` fetches fail unless you also run `npm run dev:api`).

**API only:** `npm run dev:api` (for debugging the handlers on `http://127.0.0.1:8787`).

## Pages

-   **`/licensing`** — Commercial licensing: contact **yuki@vex.wtf**.

## API (`api/`)

Server routes under `api/` use plain **Node.js** [`IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) / [`ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) so they are not tied to Vercel. Wire them in your host’s router (Express `app.use`, nginx `proxy_pass`, Cloudflare Workers adapter, etc.).

**GitHub OAuth** — `api/gh/*` expects env: `SITE_ORIGIN` or `PUBLIC_SITE_URL` (public `https://…` site URL), `SESSION_SECRET` or `CLA_SESSION_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, optional `CLA_SDK_VERSION`.

## Notes

-   Inline SVG icon components in `src/components/Icons.tsx` were extracted from `lucide-preact` (Lucide) to reduce runtime bundle size and avoid shipping the full icon library.
