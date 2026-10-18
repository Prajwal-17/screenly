# Screenly frontend

React in Next.js App Router, Tailwind CSS 4, customized shadcn/ui (Radix), Motion, React Hook Form, TanStack Query, and Zustand.

Copy `.env.example` to `.env.local`, start the backend, and run:

```sh
bun run --cwd apps/web dev
```

The frontend runs on port 3000. `NEXT_PUBLIC_API_URL` selects the backend origin, including WebSocket and auth connections. Provider keys belong in the backend environment.

Interviews use microphone answers and spoken agent replies, with read-only transcripts and feedback. Routes include the landing page, email/Google authentication, dashboard, setup, live interview, feedback, and history. The legacy `/session` route redirects to setup.

See [the root README](../../README.md) for complete setup, screenshots, and checks.

The UI uses the approved warm-paper / fern light palette, a fixed desktop sidebar and mobile drawer, and committed local Geist Sans/Mono fonts. No font downloads run during development, type checks, or builds. See the root README and DESIGN.md for provenance, tokens, and component states.

All presentation uses the shadcn primitives in `components/ui` and Tailwind utilities. Theme tokens and base typography live in `app/globals.css`; the voice orb’s state-driven animation is scoped to `components/voice-visual.module.css`. See `DESIGN.md` at the repository root for the component inventory and composition rules.
