# Screenly frontend

Next.js App Router, Tailwind CSS 4, shadcn/ui (Radix), React Hook Form, TanStack Query, and Zustand.

Copy `.env.example` to `.env.local`, start the backend, and run:

```sh
bun run --cwd apps/web dev
```

The frontend runs on port 3000. `NEXT_PUBLIC_API_URL` selects the backend origin, including WebSocket and auth connections. Provider keys belong in the backend environment.

Interviews use microphone answers and spoken agent replies, with read-only transcripts and feedback. Routes include the landing page, email/Google authentication, dashboard, setup, live interview, feedback, and history. The legacy `/session` route redirects to setup.

See [the root README](../../README.md) for complete setup, screenshots, and checks.

The UI uses the approved Jade light palette, a responsive workspace, and committed local Geist Sans/Mono fonts. No font downloads run during development, type checks, or builds. See the root README and DESIGN.md for provenance, tokens, and component states.

All presentation uses the shadcn primitives in `components/ui` and Tailwind utilities. Theme tokens and base typography live in `app/globals.css`; route-level CSS classes and inline static styling are not used. See `DESIGN.md` at the repository root for the component inventory and composition rules.
