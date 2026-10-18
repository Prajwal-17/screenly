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

## Requested refinements

- [x] Remove the top-bar voice-first tagline and decorative logo/active-navigation dots.
- [x] Keep the route title once, as the top-bar h1; retain contextual descriptions and actions.
- [x] Replace the enclosing preflight card with open audio-check rows on the canvas.
- [x] Expand the read-only transcript inline beside the voice stage, stacking and scrolling to it on mobile.
- [x] Install and adapt Beautiful UI Streaming Text to real interviewer and candidate tokens, preserving the current caption through message persistence/audio playback.
- [x] Replace the local preview’s test-provider endpoints with the existing real provider settings in ignored local configuration. Verify real synthesis: 47 PCM frames, 3.68 seconds, nonzero RMS 0.1213.
- [x] Verify the complete real-provider browser path: a generated question produced 224 scheduled PCM buffers, 17.84 seconds of speech, RMS 0.1224, with the playback context running. The saved caption remained visible after playback. This checks browser output, not physical speaker audibility.
- [x] Defer initial session connection until React’s development mount cleanup has completed. A fresh direct route reached ready state without the false duplicate-tab error.

The previous preview voice fixture emitted a 100ms test tone; it did not synthesize speech. Browser fixtures remain isolated for automated checks. No provider credentials are committed.

Refinement validation: all five browser journeys pass, including non-silent PCM, saved AI captions, candidate partial captions, inline transcript toggling/focus restoration, recovery, and mobile reflow. The independent finish reviewer returned `ship` with no material fixes.

## Continuous speech and full-text highlight

- [x] Remove the phrase splitting/buffering introduced for caption pacing.
- [x] Stream LLM tokens into one Deepgram turn and forward every audio frame immediately, unchanged. Flush once after the complete response, including replay.
- [x] Display the full generated question below the orb. Use a visual highlight while speaking; retain readable text after interruption.
- [x] Remove phrase-duration events, word timing estimates, and the 38-word limit.
- [x] Preserve safe interruption, playback acknowledgement, microphone cleanup, and disconnection recovery.
- [x] Keep Screenly on port 3000 and the backend on 8787, with the requested provider-side 1.2 speech rate.

Verification includes byte-for-byte PCM forwarding before generation finishes, one synthesis flush per response, full-text visibility, speaking highlight state, replay, interruption, and disconnect recovery. No visual caption effect changes audio playback.

Validation: 21 unit/integration tests and six browser journeys pass, together with types, zero-warning lint, formatting, and the production build. A real Deepgram passthrough check forwarded all 142 frames / 541,440 bytes (11.28 seconds) immediately and byte-for-byte unchanged, with one final flush. First audio arrived after 1.365 seconds.
