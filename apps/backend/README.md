# Interview backend

Hono runs on Cloudflare Workers. D1 stores authentication, profiles, interviews, and transcripts through Drizzle. A Durable Object per interview owns native Cloudflare WebSockets, provider connections, the interview deadline, and feedback alarms. Bun manages packages and scripts; it is not the deployed server runtime.

## Local setup

Use Bun 1.3.5+ and Node.js 22+ for Wrangler. Copy `.env.example` to `.env`, set `BETTER_AUTH_SECRET` to at least 32 random characters, and configure the providers you need. The Bun wrapper reads `.env` and supplies private local bindings to Wrangler. Keep this file ignored.

```sh
bun install
bun run --cwd apps/backend dev
```

Local development uses Wrangler's Workers runtime on `127.0.0.1:8787`, local D1, and local Durable Objects. Committed migrations apply before startup. Data persists under `apps/backend/.wrangler/state`; override `D1_PERSIST_PATH` to isolate it. No Cloudflare account is needed for local development.

Google is the production sign-in method. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with `http://localhost:8787/api/auth/callback/google` as the local redirect URI. Email/password authentication is disabled. Set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` for replies, profile import, and feedback. Set `DEEPGRAM_API_KEY` for microphone transcription and spoken replies. Provider keys stay on the backend.

From the repository root:

```sh
bun run db:migrate:local
bun run db:migrate:remote
```

Both commands apply the committed SQL migrations through Wrangler. The history starts with one generated baseline, `drizzle/0000_init.sql`, for an empty database. Databases using the previous migration history must be moved to a fresh target: back up the data, apply the baseline there, then import reviewed data-only SQL. Do not apply this baseline over existing application tables or reuse their migration ledger. For a fresh local target, set `D1_PERSIST_PATH` to a new directory; existing local state is preserved.

The local command never touches remote D1. The remote command requires an existing `CLOUDFLARE_DATABASE_ID` and Wrangler authentication, such as `CLOUDFLARE_API_TOKEN` with D1 edit permission and `CLOUDFLARE_ACCOUNT_ID`. The previous `CLOUDFLARE_D1_TOKEN` variable remains a migration-only alias for `CLOUDFLARE_API_TOKEN`.

Generate new migrations after changing the Drizzle schema:

```sh
bun run --cwd apps/backend db:generate
```

Old `storage/local.sqlite` files are preserved and are not used by Workers. To carry existing data into D1, back up the old database, apply the committed migrations to an empty target, then review and import data-only SQL for the application tables in foreign-key order. Do not import the old schema or Drizzle migration ledger: Wrangler tracks D1 migrations separately. Legacy reports left in `generating` should be marked `failed` so users can retry them; they have no Durable Object job yet. Do not copy SQLite files into the Worker bundle. Local and remote D1 data are separate.

## Deployment

Create a D1 database once with Wrangler (for example, `bunx wrangler d1 create screenly` from this directory), then set its UUID as `CLOUDFLARE_DATABASE_ID` in `.env` or the deployment environment. Set `CLOUDFLARE_ACCOUNT_ID` when required and authenticate Wrangler. The checked-in zero UUID is a local placeholder; remote commands reject it.

Set `FRONTEND_URL` and `BETTER_AUTH_URL` to the production HTTPS origins. The deploy wrapper copies public settings into the Worker config, forces production mode, and disables development login. It rejects localhost production URLs. Configure provider model/base-URL overrides in the same environment.

Provision secrets in Cloudflare, using Wrangler's interactive prompts from `apps/backend`:

```sh
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put GOOGLE_CLIENT_ID
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put DEEPGRAM_API_KEY
bunx wrangler secret put LLM_API_KEY
```

Only provision providers you use. Local `.env` values do not upload as Worker secrets. Then, from the root:

```sh
bun run db:migrate:remote
bun run deploy:backend
```

Deployment creates the `INTERVIEWS` Durable Object binding and its SQLite-backed storage migration. D1 migrations remain an explicit deployment step. Register the production Google callback at `https://YOUR_BACKEND/api/auth/callback/google`. Deploy the frontend separately, built with `NEXT_PUBLIC_API_URL=https://YOUR_BACKEND`. Worker logs and traces are enabled in `wrangler.jsonc`.

## Local development authentication

Set `ENABLE_DEV_LOGIN=true` in the ignored `.env`, use localhost frontend/backend URLs, and run `bun run dev`. `POST /api/auth/sign-in/development` accepts `{ "email": "developer@example.com" }` and creates a normal Better Auth session. It validates email and origin, leaves email unverified, and reuses the local account on subsequent visits.

`bun run --cwd apps/backend start` runs local Workers emulation with production authentication semantics: the development endpoint is absent even if the flag is set. Unset modes, test mode, and non-loopback URLs also disable it. Use separate local data and credentials.

## API

| Endpoint                          | Behavior                                        |
| --------------------------------- | ----------------------------------------------- |
| GET /                             | Health                                          |
| GET /api/capabilities             | Provider readiness flags, without secret values |
| GET/POST /api/auth/*              | Better Auth                                     |
| GET /api/interviews               | Signed-in user's interviews                     |
| POST /api/interviews              | Validate settings and create a draft            |
| GET /api/interviews/:id           | Owned interview and ordered transcript          |
| DELETE /api/interviews/:id        | Delete owned interview and messages             |
| POST /api/interviews/:id/finish   | Complete an active session; optional feedback   |
| POST /api/interviews/:id/feedback | Retry failed feedback for a completed interview |
| GET /api/interviews/:id/ws        | Authenticated, owned session WebSocket          |

`POST /api/interviews/:id/finish` accepts optional JSON `{ "generateFeedback": false }` to complete without a report. An empty body preserves the default feedback flow. WebSocket `finish` accepts the same optional flag. Skipped feedback is persisted, its alarm is canceled, and repeated finish calls never queue a report. Only a separate explicit `POST /api/interviews/:id/feedback` requests generation later.

The WebSocket uses cookie authentication, frontend Origin checks, and shared JSON event contracts. Only one client connects per interview. Candidate answers enter through bounded microphone PCM frames and finalized transcription turns; JSON text-answer events are rejected. Microphone frames are mono PCM16 at 16 kHz. Speaker frames use a 4-byte big-endian response ID followed by mono PCM16 at 24 kHz. See `packages/shared/src/index.ts`.

The LLM uses the OpenAI library against the configured Chat Completions endpoint. Deepgram uses outbound Workers WebSocket upgrades to `/v2/listen` and `/v2/speak`, with configurable Flux models and separate speech connections per reply. Live provider sockets use the standard Durable Object WebSocket API. Interview deadlines and feedback work persist as Durable Object alarms, including after client disconnect.

## Profile API

Authenticated endpoints: `GET /api/profile`, `PUT /api/profile` with `{ details, complete, onboarding? }`, `POST /api/profile/skip`, and `POST /api/profile/import`. Mutations require the configured frontend Origin.

Drafts retain incomplete fields, projects, the current step, and pending AI suggestions; completion validates the full profile. Import accepts multipart `resume` (PDF/DOCX/DOC/TXT) or JSON `{ url }` / `{ text }`. Documents are read in memory. Public HTTPS destinations and DNS addresses are validated at every redirect; native Workers fetch preserves hostname routing and TLS identity. Body size, time, redirects, per-user concurrency, and attempts are bounded. D1 stores the import lease/rate counter so limits apply across Worker instances. Source instructions are untrusted, and suggestions pass the shared schema. Original files/text are never saved; only profile details and formatted suggestions sent to PUT persist. NDJSON clients receive extraction and analysis progress, results, and recoverable errors with ephemeral extracted text. Suggestions stay separate until approved. AI absence/failure leaves manual setup usable. When importing existing members without profiles, preserve their onboarding choice by importing a skipped profile where appropriate.

## Verification

```sh
bun run --cwd apps/backend cf:types
bun run --cwd apps/backend check-types
bun run --cwd apps/backend lint
bun run --cwd apps/backend test
bun run --cwd apps/backend build
```

Wrangler generates Worker bindings/runtime types from `wrangler.jsonc` and `.dev.vars.example`; the latter declares secret names without values. Build performs a dry run and does not deploy. Bun runs three database baseline tests covering fresh setup, defaults, uniqueness, and ownership cascades. The shared package keeps four validation and timing tests.
