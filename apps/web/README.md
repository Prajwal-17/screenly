# Screenly frontend

React in Next.js App Router, Tailwind CSS 4, customized shadcn/ui (Radix), Motion, React Hook Form, TanStack Query, and Zustand.

Copy `.env.example` to `.env.local`, start the backend, and run:

```sh
bun run --cwd apps/web dev
```

The frontend runs on port 3000. `NEXT_PUBLIC_API_URL` selects the backend origin, including WebSocket and auth connections. Provider keys belong in the backend environment.

Interviews use microphone answers and spoken agent replies, with read-only transcripts and feedback. Production sign-in uses Google through Better Auth. The email entry is an explicitly enabled, loopback-only development bypass, excluded from the production frontend. Routes include landing, sign-in, six-step onboarding, dashboard, setup, live interview, feedback, history, settings, and Help. Library, plans, progress, saved answers, and team workspaces state their future availability. The legacy `/session` route redirects to setup. Root, route-error, and not-found surfaces offer safe recovery without exposing server details.

See [the root README](../../README.md) for complete setup and check commands.

The UI uses white surfaces, neutral navigation, charcoal primary actions, and vivid semantic status colors. The classic shadcn inset sidebar stays expanded on normal workspace pages; the live interview uses a drawer. Windows narrower than 1024 CSS pixels show guidance while the underlying session remains mounted. Geist Sans/Mono fonts are bundled locally; development, type checks, and builds need no font downloads.

All presentation extends the customized shadcn primitives in `components/ui`; do not reinitialize them. `Workspace` owns auth/profile gates, the main landmark, route focus, and the compact page title. `WorkspaceSidebar` uses `ui/sidebar.tsx` and the transient `store/uiStore.ts` overlay state. `WorkspaceSearch` and navigation retain live-session exit protection.

Runtime tokens and typography live in `app/globals.css`. `LiveInterview` and `live-interview.module.css` own the preserved live composition; `PorcelainOrb` and `lib/porcelain-shader.ts` own its material. Session orchestration, capture/playback, and profile drafts remain in their existing libraries and stores. See [DESIGN.md](../../DESIGN.md), its [tracked sidecar](../../.impeccable/design.json), and [PRODUCT.md](PRODUCT.md).

Run deterministic browser checks from the repository root:

```sh
bun install
bun run --cwd apps/web test:e2e:install
bun run test:e2e
```

The harness starts its own frontend and intercepts synthetic API/socket responses. See [tests/e2e/README.md](tests/e2e/README.md) for selective commands, screenshots, state coverage, and real-provider verification requirements.
