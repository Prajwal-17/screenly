# Screenly

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Screenly helps developers rehearse a spoken technical conversation and leave with an evidence-linked session review and one practice priority. The six presets are Frontend, Backend, Full-stack, Mobile Engineering, DevOps / Platform Engineering, and Data Engineering. Experience comes from the saved profile, not a session setup guess.

## Stack

React in Next.js App Router, TypeScript, Zustand, Tailwind CSS 4, customized shadcn/Radix primitives, TanStack Query, React Hook Form, shared Zod contracts, and locally bundled Geist. The existing Hono/Durable Objects/D1/Drizzle backend and configured providers remain the runtime.

## Capabilities and constraints

Preserve production Google authentication, local development email entry, real owned API data, onboarding/import approval and autosave, microphone preflight, voice interruption and cancellation, mute, pause, replay, audio devices, reconnect, server timing, review retry, transcript export, history, and deletion. No synthetic session or profile data enters production. New sessions require an explicit saved experience level and use a 20 minute duration. Legacy feedback is shown only as safe unscored session summary text.

## Brand commitments

The text-only wordmark and neutral white/gray/charcoal shadcn system remain. No new brand icon, ornament, or decorative live stage. Normal workspace pages show the inset sidebar; a live session uses the existing navigation drawer. Authenticated workspace and onboarding keep the 1024 CSS pixel desktop boundary, including when a live session is resized narrower. The public landing remains responsive.

## Interface hierarchy

New interview selects one of six roles and shows saved experience and meaningful profile warnings. The live page leads with one continuous transcript and keeps voice status and essential controls visible. Completed sessions show a short synthesis, qualitative findings linked to exact transcript messages, one practice priority, limits, and the original transcript. History shows real sessions, status and review availability without scores. Settings contains profile editing, active practice memory, playback preference and account access. Navigation contains only New interview, Interviews and Settings. Help remains in the account menu. Retired workspace routes redirect to New interview.

## Public presentation

The public example is explicitly illustrative. Six role tabs show a transcript excerpt and qualitative review. It requests no microphone or interview API and never implies a personal result. The landing links to `/interviews/new` and states the desktop and microphone requirements for real sessions.

## Accessibility and recovery

Use visible focus, named semantic controls, current-page state, Radix focus management, readable contrast, reduced-motion support, and responsive text. Announce meaningful voice status without repeatedly announcing partial words. Keep loading, empty, error, retry, and destructive confirmation states. The live transcript follows latest only while the reader is at the bottom and offers Jump to latest. Preserve provider-independent route recovery.

## Verification boundary

The tracked Playwright harness uses synthetic HTTP/WebSocket contracts and desktop widths. Its result is deterministic UI evidence, not proof of Google OAuth, physical devices, provider quality, or real interruption timing. See `tests/e2e/README.md` for the remaining manual and integration gates.
