# Forma frontend

Next.js App Router, Tailwind CSS, Motion, React Hook Form, TanStack Query, and Zustand.

Copy `.env.example` to `.env.local`, start the backend, and run:

```sh
bun run --cwd apps/web dev
```

The frontend runs on port 3000. `NEXT_PUBLIC_API_URL` selects the backend origin, including WebSocket and auth connections. Provider keys belong in the backend environment.

Routes include the landing page, email/Google authentication, dashboard, setup, live interview, feedback, and history. The legacy `/session` route redirects to setup.

See [the root README](../../README.md) for complete setup, screenshots, and checks.
