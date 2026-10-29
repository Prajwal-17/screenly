# Screenly

Screenly is a voice-based technical interview practice app. Choose a role, experience level, topics, and duration, then review your saved transcript and feedback.

## Requirements

- Bun 1.3.5+
- Node.js 22+
- Google OAuth credentials, an OpenAI-compatible Chat Completions provider, and a Deepgram account

## Setup

```sh
bun install
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
```

Configure `apps/backend/.env`:

- `BETTER_AUTH_SECRET`: a random string of at least 32 characters.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: register `http://localhost:8787/api/auth/callback/google` as the callback URL and `http://localhost:3000` as an authorized JavaScript origin.
- `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`: your Chat Completions provider settings.
- `DEEPGRAM_API_KEY` and `DEEPGRAM_PROJECT_ID`: a management key with `keys:write` and `usage:write` permissions in that project.

For local sign-in without Google, set `ENABLE_DEV_LOGIN=true` with localhost URLs. See the [backend guide](apps/backend/README.md) for configuration and deployment details.

## Development

```sh
bun run dev
```

Starts the web app at [localhost:3000](http://localhost:3000) and the backend at [localhost:8787](http://localhost:8787). Local database migrations apply automatically.

Interviews require microphone access, configured voice and LLM providers, and a browser window at least 1024 CSS pixels wide.

## Build and checks

```sh
bun run build
bun run check
```

`check` runs type checks, lint, tests, and builds. For browser tests, see the [test guide](apps/web/tests/e2e/README.md).

## Applications

- [Web](apps/web/README.md): Next.js frontend.
- [Backend](apps/backend/README.md): Hono on Cloudflare Workers, D1, and Durable Objects.
- [Shared](packages/shared): validation schemas and types.
