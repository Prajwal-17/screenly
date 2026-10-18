# Screenly UI rebuild

## Approved scope

Replace the complete frontend presentation using the supplied Ferndesk palette and voice-first handoff. Preserve product behavior and the existing React/Next.js, Zustand, Tailwind, shadcn, Motion, and TanStack Query architecture. The user confirmed every screen should be rebuilt consistently.

## Tasks

- [x] Study the supplied style study, handoff, HTML mockup, incumbent screens, and functional contracts.
- [x] Remove the previous application presentation; retain functional infrastructure and base primitives. Commit this reset before rebuilding.
- [ ] Establish semantic warm-paper/charcoal/fern tokens and customized shadcn primitives.
- [ ] Build a rigid 240px desktop sidebar, anchored account area, mobile Radix drawer, and workspace breadcrumb bar.
- [ ] Rebuild the real-data overview, role shortcuts, empty/loading/error states, searchable history, and deletion.
- [ ] Rebuild controlled interview setup and a readable session summary.
- [ ] Rebuild microphone/speaker preflight and recovery.
- [ ] Center the live voice stage; show only current streaming/partial captions; collapse the full read-only transcript into a drawer; add mute/interruption/finish dock.
- [ ] Rebuild feedback, evidence, next steps, export, and retry states.
- [ ] Rebuild landing and authentication in the same visual system.
- [ ] Verify types, lint, unit/integration tests, production build, browser journeys, keyboard controls, reduced motion, and 360/640/1280/1440px layouts.
- [ ] Perform one batched visual review and one confirmation pass; document the shipped system and commit the rebuild.

## Direction contract

THESIS: A calm professional practice workspace with firm navigation and a voice conversation at its center. No large question panel or permanent transcript competing with voice.

OWN-WORLD: Warm paper canvas, cooler full-height sidebar, white working surfaces, charcoal text, fern actions, restrained semantic accents, local Geist, compact 6–8px controls and 12px panels.

STORY: Orient in overview, choose a practice focus, configure a session, check audio, speak and listen, then review evidence and practice again.

FIRST VIEWPORT: A 240px fixed sidebar with 64px brand row, aligned 44px navigation, bottom account. A 64px content bar precedes a 32px title. Overview leads with three real metrics, recent sessions, and compact role links. Live interview centers a 256px voice presence with attributed captions and a bottom dock; transcript opens from the top bar.

FORM: User-pinned Ferndesk-inspired professional application shell. The supplied mockup fixes the visual world; layout and details are refined in code to the handoff's production constraints.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
