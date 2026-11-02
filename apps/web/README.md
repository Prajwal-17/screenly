# Screenly frontend

React in Next.js App Router, Tailwind CSS 4, customized shadcn/ui (Radix), Motion, React Hook Form, TanStack Query, and Zustand.

Copy `.env.example` to `.env.local`, start the backend, and run:

```sh
bun run --cwd apps/web dev
```

The frontend runs on port 3000. `NEXT_PUBLIC_API_URL` selects the backend origin, including WebSocket and auth connections. Provider keys belong in the backend environment.

Interviews use microphone answers and spoken agent replies, with read-only transcripts and feedback. Production sign-in uses Google through Better Auth. The email entry is an explicitly enabled, loopback-only development bypass, excluded from the production frontend. Routes include landing, sign-in, three-phase onboarding and independent profile editing, a blank Dashboard, New interview, live interview, review, history, My profile, Practice memory and Settings. Retired workspace routes redirect to New interview; Help redirects to Settings. The legacy `/session` route redirects to setup. Root, route-error, and not-found surfaces offer safe recovery without exposing server details.

See [the root README](../../README.md) for complete setup and check commands.

The UI follows Fanout-inspired light styling: a pale gray canvas, white surfaces, soft dividers, charcoal primary actions, and restrained semantic tints. The classic 240px shadcn inset sidebar has a primary New interview button beneath the wordmark and compact navigation rows. Normal pages have a sidebar toggle with no keyboard binding; the live interview retains its drawer. My profile and Settings are bottom utilities, followed by the avatar/account menu with sign-out. Resume interview uses real active session data. Windows narrower than 1024 CSS pixels show guidance while the underlying session remains mounted. Overused Grotesk, IBM Plex Sans and Geist Mono are bundled locally with source/license records; development, type checks, and builds need no font downloads.

All presentation extends the customized shadcn primitives in `components/ui`; do not reinitialize them. `Workspace` owns auth/profile gates, the main landmark, route focus, and the compact page title. `WorkspaceSidebar` uses `ui/sidebar.tsx` and the transient `store/uiStore.ts` overlay state. Navigation links support standard keyboard interaction and live-session exit protection. Interview M/R/T/Space bindings remain unchanged.

Settings uses the shared Radix-backed Select, and account and audio menus share the dropdown-menu primitives. Application actions and labels use the shared Button and Label components. The hidden file input remains native for file selection, and the root error fallback stays self-contained so it can render if the application shell fails.

`components/loading-state.tsx` owns screen-shaped skeletons and the initial workspace frame. `common.tsx` owns consistent inline errors, retry controls and non-blocking refresh notices. Keep cached content visible during background fetch failures and distinguish session-check failure from signed-out status. Busy button labels stay visible; errors do not use toasts.

Runtime tokens and semantic `type-*` typography roles live in `app/globals.css`. The local Overused Grotesk variable family uses deliberate 450/500/550/600 weights for navigation, labels, sections and page/display headings; prose stays 16px with a comfortable measure and leading. Semantic type classes use the `type-` prefix to coexist with Tailwind text-color utilities and class merging. Live caption fitting and font delivery remain local. `LiveInterview` and `live-interview.module.css` own the preserved live composition; `PorcelainOrb` and `lib/porcelain-shader.ts` own its material. Session orchestration, capture/playback, and profile drafts remain in their existing libraries and stores. See [DESIGN.md](../../DESIGN.md), its [tracked sidecar](../../.impeccable/design.json), and [PRODUCT.md](PRODUCT.md).

Run deterministic browser checks from the repository root:

```sh
bun install
bun run --cwd apps/web test:e2e:install
bun run test:e2e
```

The harness starts its own frontend and intercepts synthetic API/socket responses. See [tests/e2e/README.md](tests/e2e/README.md) for selective commands, screenshots, state coverage, and real-provider verification requirements.

The approved setup layout is owned by `app/interviews/new/page.tsx` and the shared RadioGroup
row variant: flat role selection, selected session brief, optional saved profile goal and one
Continue to audio action. Explicit goal edits merge into fresh profile data through the existing
profile API before creation; unchanged goals do not write. `components/preflight.tsx` and its CSS
module own the unboxed audio check. Its waveform follows real input levels, with versioned
media cleanup, speaker progress/recovery, draft navigation and existing active-session actions.
Entry and audio skeletons in loading-state.tsx follow these shapes. The standalone approved
reference remains in `design/mockups/interview-setup.html`; it is not imported by the app.

REQ-034 implements the approved profile/onboarding design with a scoped sage palette and local
IBM Plex Sans. My profile edits one field or item at a time with explicit Save/Cancel; fresh-read,
serialized mutations preserve other data and reject stale targets. Import pending suggestions
and choices stay separate from approved facts. Onboarding presents Background / Practice /
Review while retaining the existing saved step values, autosave and owner-scoped device drafts.
Resume import is a prominent real picker (PDF/DOC/DOCX/TXT, 5 MB), with existing link/text
sources, provider consent, streaming progress, cancellation, retry and selective approval.
Legacy completed-profile edit URLs redirect to My profile. Other routes/live styling stay intact.
