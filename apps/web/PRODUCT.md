# Screenly

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Candidates practice technical interviews by speaking, then review saved feedback grounded in their answers. Frontend, Backend, and Full-stack roles support selectable experience, topics, and duration.

## Stack

React in Next.js App Router, TypeScript, Zustand, Tailwind CSS 4, customized shadcn/Radix primitives, Motion, TanStack Query, React Hook Form, and shared Zod validation. Fonts are bundled locally.

## Capabilities and constraints

Preserve Google-only production authentication through Better Auth, an opt-in local email entry excluded from production, real API data, ownership, microphone preflight, spoken responses, interruption, mute, reconnect, server timing, feedback/retry, transcript export, history, and deletion. Answers are voice-only. No fabricated sessions, metrics, or feedback in production. The static landing example is explicitly labeled.

## Brand commitments

Screenly uses a text-only wordmark: local Geist Sans at 20px, weight 600, and -0.03em tracking. There is no brand icon or favicon. The user approved a full frontend replacement with a professional Cal.com-inspired white and neutral visual system, charcoal actions, and the classic shadcn/Radix inset sidebar. Normal workspace pages always show the full sidebar; only an active live interview uses a navigation drawer. The app requires a window at least 1024 CSS pixels wide and keeps an active session mounted during a narrower resize. This supersedes the earlier paper-and-fern direction. Every screen uses the same semantic tokens and shared primitives. Keep the existing live-interview composition and behavior: orb, persistent question, candidate caption, default-open transcript, and microphone/replay/audio/finish dock.

## Evidence on hand

The implementation in `lib`, `store`, shared schemas, backend, the root `UI_IMPLEMENTATION_PLAN.md`, and checked-in `tests/e2e` journeys. Runtime tokens in `app/globals.css` and shared components define the shipped visual system; the approved Cal.com reference and classic shadcn sidebar direction establish its identity. Generate current captures with `bun run test:e2e`; screenshots and traces attach to the ignored Playwright report. Older local mockups are historical references, not shipping code or durable evidence.

## Accessibility

Visible keyboard focus, labeled controls, Radix focus management, reduced motion, readable contrast, desktop text reflow, and a clear wider-window boundary. Meaningful voice state is announced; partial spoken words are not repeatedly announced.

## Navigation previews

The user authorized additional preview pages to evaluate the navigation. Question library, Practice plans, Progress, and Saved answers are now single coming-soon screens that describe what each will contain and point to a real action. They do not fabricate personal session data or results. Settings and Help expose real local preferences and documented behavior.

## Profile onboarding

Six compact steps cover optional import, background/about, personal and extra links, repeatable projects, practice focus, and final review. Shared shadcn/Radix controls replace native selects. The action footer remains visible; short desktop windows scroll the working area. PDF/DOCX/DOC/TXT imports stream extraction/analysis status, then show selectable formatted AI fields and JSON for explicit approval. Irrelevant or unsafe URLs and unreadable documents have actionable errors. Sources are sent to the configured AI provider but never stored. Unfinished fields, projects, current step, and unapproved formatted suggestions autosave per account, with device recovery and visible sync/retry status. Manual entry and skip remain available. Settings edits the full profile; role/experience seed interview setup. Existing accounts retain workspace access.

## Workspace hierarchy

Practice choices lead Overview; empty statistics are omitted. Setup uses an open form, and feedback brings next practice steps before detailed scores. The main navigation is Overview, New interview, and Interviews. Help and Settings sit above the account menu. Planned features are grouped under Coming soon and remain accessible through workspace search. The compact workspace header names the page; avoid redundant page titles, slogans, and decorative labels. Keep meaningful errors, constraints, consent, confirmation, and recovery guidance.

## Shared implementation and agent operation

Use the adapted shadcn primitives, semantic runtime tokens, and existing domain components. Preserve the expanded sidebar, live-only drawer, keyboard shortcuts, route focus, dialog behavior, and live-session navigation guards. Controls retain accessible names, explicit form labels, radio-group semantics, current-page state, and meaningful asynchronous status so keyboard users and automation can operate the same interface. Style changes must preserve auth, API, shared-schema, ownership, audio-engine, session-state, profile import, and autosave contracts. `DESIGN.md` and `.impeccable/design.json` describe the implemented system together.

## Verification and recovery

The tracked Playwright harness intercepts synthetic HTTP and WebSocket contracts, runs a desktop project across supported widths and short laptop windows, and verifies the narrow-window boundary. Fixtures stay outside production bundles. Provider/device checks remain separate: deterministic UI success does not verify Google OAuth, physical microphone/speakers, real speech interruption, output-device routing, or provider feedback. Route errors and unknown addresses use provider-independent `PageRecovery`; `app/global-error.tsx` carries a self-contained recovery document that does not depend on providers, external fonts, or error details. See the [browser-verification guide](tests/e2e/README.md) for the recorded checks, independent finish review, and outstanding manual/integration gates.
