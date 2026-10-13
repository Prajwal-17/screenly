# Interview backend

Bun/Hono serves authentication, persistent interviews, and a real-time voice channel. SQLite migrations run on startup.

Copy `.env.example` to `.env`; set `BETTER_AUTH_SECRET` (32+ characters), `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`. Add `DEEPGRAM_API_KEY` for voice. Google credentials are optional.

```sh
bun run --cwd apps/backend dev
bun run --cwd apps/backend check-types
bun run --cwd apps/backend lint
bun run --cwd apps/backend test
bun run --cwd apps/backend db:generate
```

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

The WebSocket uses cookie authentication and shared JSON event contracts. Browser microphone frames are mono PCM16 at 16 kHz. Speaker frames use a 4-byte big-endian response ID followed by mono PCM16 at 24 kHz. See `packages/shared/src/index.ts`.

Provider keys remain on the backend. The LLM uses the OpenAI library against the configured Chat Completions endpoint. Deepgram uses /v2/listen and /v2/speak, with configurable Flux models and separate speech connections per reply.

Unit/integration tests use an in-memory database and test-only credentials. Browser tests use their own file database and local provider fixtures. `DEEPGRAM_WS_URL` is normally left at `wss://api.deepgram.com`; tests override it with a loopback fixture.

See [the root README](../../README.md) for setup and verification notes.
