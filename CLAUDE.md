# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
A marketing operations SaaS. A single-page dashboard where specialized workflows analyze a website/product and generate cold-email campaigns, SEO reports, copywriting, content, social posts, and CRO/schema reports.

## Tech stack
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + shadcn/ui (New York) + Framer Motion + Lucide
- **Prisma 6 + SQLite** (`db/custom.db`) — arrays stored as JSON strings
- **LLM** via any OpenAI-compatible API (env-configured — `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`; default Groq)
- **NextAuth** (credentials + bcrypt); email via Nodemailer (SMTP) or Web3Forms

## Commands
Scripts assume **Bun**, but **bun is not installed here — use `npm`** (Node 24). C: drive is full; keep npm cache/temp on E: (`npm_config_cache`, `TMP`/`TEMP`).
```bash
npm install --legacy-peer-deps      # zod v3/v4 peer conflict requires this flag
npx prisma generate                 # no postinstall — run after install & schema edits
npx prisma db push                  # sync schema.prisma -> SQLite
node node_modules/next/dist/bin/next dev -p 3000   # dev (npm run dev fails: `tee` missing in Windows cmd)
npm run build                       # next build (standalone output)
npm run lint                        # eslint
```
No test suite is configured. Dev server is **port 3000 only**.

## Architecture
- **Single route** (`src/app/page.tsx`): shows a landing page, then renders `AppShell` + one section per `SectionId` via `useState` (no router). Feature UIs are in `src/components/sections/*`.
- **API layer** (`src/app/api/**`): one folder per feature; handlers persist via Prisma and invoke AI agents. AI routes set `export const runtime = "nodejs"` and a long `maxDuration`.
- **AI agents** (`src/lib/ai/*`): a class per capability (`WebsiteAnalyst`, `EmailCopywriter`, `SeoStrategist`, …) exposing a `run()` pipeline. All model calls go through `src/lib/ai/zai.ts` (`llm`, `describeImage`, `readPage`, `webSearch`, `extractJson`).
- **Agent orchestration** is handled directly in the feature routes and specialized agent classes; no LangGraph/RAG workflow is shipped in this build.
- **Data** (`prisma/schema.prisma`): SQLite has no array columns — every list/object field is a JSON string. `JSON.stringify` on write, `JSON.parse` on read.
- **Auth** (`src/lib/auth.ts`): demo mode when zero users exist; enforced once a user is created. Tiers/limits in `SUBSCRIPTION_TIERS`.
- **Client fetch**: always use `apiFetch` (`src/lib/api-fetch.ts`) — handles retries + HTML "server down" responses. Guard routes with `rateLimit(req, type)` (`src/lib/rate-limit.ts`).
- **Email** (`src/lib/email.ts`, `/api/campaigns/[id]/send`): SMTP (Nodemailer, server-side — the reliable path) or Web3Forms (client-side only; blocked server-side).

## Code style
- 2-space indent, double quotes, semicolons; lint config = `eslint-config-next` (`npm run lint`).
- Path alias **`@/*` -> `src/*`**; import UI primitives from `@/components/ui/*`.
- Files **kebab-case** (`email-campaigns.tsx`), components **PascalCase**, functions/vars **camelCase**.
- React function components + hooks; add `"use client"` only for client components (server components/routes are the default).
- API handlers return `NextResponse.json(...)`, wrapped in try/catch, returning `{ error }` with a proper HTTP status.
- Validate input with **zod**; avoid `any` — prefer explicit types/interfaces.
- `z-ai-web-dev-sdk` is **backend-only** — never import it into a client component.
- `next.config.ts` sets `ignoreBuildErrors: true`, so TS errors don't fail the build — rely on `npm run lint`.

## Gotchas
- `.env` `DATABASE_URL` must be `file:../db/custom.db` (originally an old Linux sandbox path).
- After editing `schema.prisma`, run `npx prisma generate`; `src/lib/db.ts` auto-refreshes a stale client.
- AI features need `LLM_API_KEY` in `.env` (any OpenAI-compatible provider; `LLM_BASE_URL`/`LLM_MODEL` pick it). Without it, AI routes return a clear "not configured" 500 while the rest of the app runs. `src/lib/ai/zai.ts` is the single provider seam (`llm`, `describeImage`, `readPage`, `webSearch`); it replaced the sandbox-only `z-ai-web-dev-sdk`. Env changes require a dev-server restart.
