# Backend

A small local backend built with Bun, Hono, Drizzle ORM, SQLite, and Better Auth.

## Setup

Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET`. Google OAuth is
optional; leave its two variables empty when using email and password only.

```bash
bun install
bun run --cwd apps/backend dev
```

The server runs on `http://localhost:8787` by default. It creates `local.sqlite`
and applies the migrations in `drizzle/` at startup.

## Commands

```bash
bun run --cwd apps/backend dev
bun run --cwd apps/backend check-types
bun run --cwd apps/backend lint
bun run --cwd apps/backend db:generate
```

## WebSocket

`GET /api/sessions/:id/ws` accepts browser WebSocket connections. Binary audio
frames are counted and acknowledged with an `audio-received` JSON message. The
backend intentionally does not perform transcription or connect to an AI API.
