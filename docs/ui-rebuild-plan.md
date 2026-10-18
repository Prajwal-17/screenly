# Screenly UI rebuild

## Approved scope

Replace the complete frontend presentation using the supplied Ferndesk palette and voice-first handoff. Preserve product behavior and the existing React/Next.js, Zustand, Tailwind, shadcn, Motion, and TanStack Query architecture. The user confirmed every screen should be rebuilt consistently.

## Tasks

- [x] Study the supplied style study, handoff, HTML mockup, incumbent screens, and functional contracts.
- [x] Remove the previous application presentation; retain functional infrastructure and base primitives. Commit this reset before rebuilding.
- [x] Establish semantic warm-paper/charcoal/fern tokens and customized shadcn primitives.
- [x] Build a rigid 240px desktop sidebar, anchored account area, mobile Radix drawer, and workspace breadcrumb bar.
- [x] Rebuild the real-data overview, role shortcuts, empty/loading/error states, searchable history, and deletion.
- [x] Rebuild controlled interview setup and a readable session summary.
- [x] Rebuild microphone/speaker preflight and recovery.
- [x] Center the live voice stage; show only current streaming/partial captions; collapse the full read-only transcript into a drawer; add mute/interruption/finish dock.
- [x] Rebuild feedback, evidence, next steps, export, and retry states.
- [x] Rebuild landing and authentication in the same visual system.
- [x] Verify types, lint, unit/integration tests, production build, browser journeys, keyboard controls, reduced motion, and 360/640/1280/1440px layouts.
- [x] Perform one batched visual review and one confirmation pass; document the shipped system and commit the rebuild.

## Direction contract

THESIS: A calm professional practice workspace with firm navigation and a voice conversation at its center. No large question panel or permanent transcript competing with voice.

OWN-WORLD: Warm paper canvas, cooler full-height sidebar, white working surfaces, charcoal text, fern actions, restrained semantic accents, local Geist, compact 6–8px controls and 12px panels.

STORY: Orient in overview, choose a practice focus, configure a session, check audio, speak and listen, then review evidence and practice again.

FIRST VIEWPORT: A 240px fixed sidebar with 64px brand row, aligned 44px navigation, bottom account. A 64px content bar precedes a 32px title. Overview leads with three real metrics, recent sessions, and compact role links. Live interview centers a 256px voice presence with attributed captions and a bottom dock; transcript opens from the top bar.

FORM: User-pinned Ferndesk-inspired professional application shell. The supplied mockup fixes the visual world; layout and details are refined in code to the handoff's production constraints.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Shipped outcome

Every frontend screen was rebuilt after the separate reset commit. Panels use the observed 16px `rounded-xl` radius, refining the planned 12px panels; controls remain compact. Selected text uses deep fern for contrast on all interaction surfaces.

Validation: `bun run check` passed (types, zero-warning lint, 20 shared/backend unit and integration checks, production build); all five Chromium journeys passed after the contrast correction. Browser coverage includes voice capture/playback, recovery, saved transcripts, feedback retry, exports/deletion, mobile navigation focus restoration, selected-control contrast, reduced motion, and reflow at 360/640/1280/1440/1536px. Controlled providers verify behavior without claiming live-provider or Google OAuth validation. The mechanical design detector returned no findings. The independent reviewer requested one selected-text contrast correction; the deep-fern token now measures 7.94:1, 7.22:1, and 5.95:1 across its base/hover/pressed surfaces.

Independent verdict: the selected-text contrast fix was scored resolved at screenshot/source scope. All other composition and capture checks had no material findings.
