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

Screenly; a temporary Lucide AudioLines icon. The user approved a full frontend replacement based on the supplied Ferndesk study and voice-first handoff. Light theme, warm paper, charcoal, fern actions, a fixed structured desktop sidebar with a collapsible icon rail, and mobile navigation drawer. Every screen follows one consistent system.

## Evidence on hand

The implementation in `lib`, `store`, shared schemas, backend, `docs/implementation.md`, existing browser journeys, and the user-supplied design study, handoff, and HTML mockup. The HTML is inspiration, with explicit permission to refine.

## Accessibility

Visible keyboard focus, labeled controls, Radix focus management, reduced motion, 44px touch targets, readable contrast, and reflow at 360px and wider. Meaningful voice state is announced; partial spoken words are not repeatedly announced.

## Navigation previews

The user authorized additional preview pages to evaluate the navigation. Question library and Practice plans use clearly labeled sample content; Progress and Saved answers show honest preview states. They do not fabricate personal session data or results. Settings and Help expose real local preferences and documented behavior.

## Profile onboarding

Six compact steps cover optional import, background/about, personal and extra links, repeatable projects, practice focus, and final review. Shared shadcn/Radix controls replace native selects. The action footer remains visible; small screens scroll only the working area. PDF/DOCX/DOC/TXT imports stream extraction/analysis status, then show selectable formatted AI fields and JSON for explicit approval. Irrelevant or unsafe URLs and unreadable documents have actionable errors. Sources are sent to the configured AI provider but never stored. Unfinished fields, projects, current step, and unapproved formatted suggestions autosave per account, with device recovery and visible sync/retry status. Manual entry and skip remain available. Settings edits the full profile; role/experience seed interview setup. Existing accounts retain workspace access.
