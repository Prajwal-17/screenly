# AI Interviewer

A Bun workspace containing a Next.js frontend and a local Hono backend.

## Requirements

- Bun 1.3.5 or newer

## Setup

```sh
bun install
cp apps/backend/.env.example apps/backend/.env
bun run dev
```

The frontend runs at `http://localhost:3000` and the backend runs at
`http://localhost:8787` by default.

## Workspace commands

```sh
bun run dev
bun run build
bun run lint
bun run check-types
bun run format
```

Run a command for one app with Bun's `--cwd` option:

```sh
bun run --cwd apps/backend dev
bun run --cwd apps/web dev
```

See `apps/backend/README.md` for the local API and WebSocket behavior.
