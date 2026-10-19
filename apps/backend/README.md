# Interview backend

Bun/Hono serves authentication, persistent interviews, and a real-time voice channel. SQLite migrations run on startup.

Copy `.env.example` to `.env`; set `BETTER_AUTH_SECRET` (32+ characters), `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`. Set `DEEPGRAM_API_KEY` for the required microphone transcription and spoken replies. Google is the only sign-in method. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and register `http://localhost:8787/api/auth/callback/google` as the redirect URI. Email/password authentication is disabled.

```sh
bun run --cwd apps/backend dev
bun run --cwd apps/backend check-types
bun run --cwd apps/backend lint
bun run --cwd apps/backend test
bun run --cwd apps/backend db:generate
```

## Local development authentication

Set `ENABLE_DEV_LOGIN=true` in the ignored `.env`, use localhost frontend/backend URLs, and run `bun run dev`. `POST /api/auth/sign-in/development` accepts `{ "email": "developer@example.com" }` and creates a normal Better Auth session. It validates email and origin, leaves email unverified, and reuses the local account on subsequent visits. This mode binds the backend to `127.0.0.1`.

`bun run start` forces `NODE_ENV=production`: this endpoint is absent even if `ENABLE_DEV_LOGIN=true`. Unset modes, test mode, and non-loopback origins also disable it. Use separate local data and credentials.

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
| POST /api/interviews/:id/finish   | Complete an active session and start feedback   |
| POST /api/interviews/:id/feedback | Retry failed feedback for a completed interview |
| GET /api/interviews/:id/ws        | Authenticated, owned session WebSocket          |

The WebSocket uses cookie authentication and shared JSON event contracts. The `start` event has no answer-mode flag. Candidate answers enter the session only through microphone PCM frames and finalized transcription turns; JSON text-answer events are rejected. Browser microphone frames are mono PCM16 at 16 kHz. Speaker frames use a 4-byte big-endian response ID followed by mono PCM16 at 24 kHz. See `packages/shared/src/index.ts`.

Provider keys remain on the backend. The LLM uses the OpenAI library against the configured Chat Completions endpoint. Deepgram uses /v2/listen and /v2/speak, with configurable Flux models and separate speech connections per reply.

Unit/integration tests use an in-memory database and test-only credentials. Browser tests use their own file database and local provider fixtures. `DEEPGRAM_WS_URL` is normally left at `wss://api.deepgram.com`; tests override it with a loopback fixture.

See [the root README](../../README.md) for setup and verification notes.

## Profile API

Authenticated profile endpoints: `GET /api/profile`, `PUT /api/profile` with `{ details, complete, onboarding? }`, `POST /api/profile/skip`, and `POST /api/profile/import`. Draft saves accept incomplete fields; complete saves validate the full profile. `onboarding` stores the current step and pending formatted suggestions. Import accepts multipart `resume` (PDF/DOCX/DOC/TXT) or JSON `{ url }` / `{ text }`. Mutations require the configured frontend Origin.

Import uses the existing LLM settings and reads documents in memory. `Accept: application/x-ndjson` streams progress, result, and error events; callers without it receive JSON. Errors after extraction can include ephemeral `extractedText` for inspection/retry. Public HTTPS destinations are validated and pinned (including proxy CONNECT); irrelevant profile URLs are rejected before analysis. Sources are untrusted and model suggestions pass the shared schema. Source files/text are never saved or logged. Pending formatted suggestions remain separate from profile details until approved. AI absence/failure leaves manual setup usable. Migrations preserve existing members and their saved details.
