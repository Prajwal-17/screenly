# Screenly

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Screenly helps developers rehearse a spoken technical conversation and leave with an evidence-linked session review and one practice priority. The six presets are Frontend, Backend, Full-stack, Mobile Engineering, DevOps / Platform Engineering, and Data Engineering. Experience comes from the saved profile, remains separate from adaptive conversation depth, and is never inferred from missing facts or previous findings.

## Stack

React in Next.js App Router, TypeScript, Zustand, Tailwind CSS 4, shared customized shadcn/Radix primitives, TanStack Query, React Hook Form and shared Zod contracts. Shared UI uses the system-first sans stack backed by locally bundled Geist Sans; Geist Mono serves code. Overused Grotesk remains loaded for preserved live captions. Manrope, Bricolage Grotesque and IBM Plex assets/licenses remain on disk but are not loaded. The existing backend and configured providers remain the runtime.

## Capabilities and constraints

Preserve production Google authentication, development-only local email entry, real owned API data, onboarding/import approval and autosave, microphone preflight, voice interruption and cancellation, mute, pause, replay, audio devices, reconnect, server timing, review retry, transcript export, history, and deletion. No synthetic session or profile data enters production. New sessions require an explicit saved experience level and use a 20 minute duration; existing active sessions preserve their saved settings, clock and role snapshot. Legacy feedback is shown only as safe unscored session summary text.

Profile information is explicit saved context. Previous role-relevant practice findings guide exploration; they are not evidence for a new session's assessment. The memory layer remains small and first-party. Deleting a source session invalidates its derived findings; dismissing a memory finding does not delete its source interview. Session review uses the original transcript, exact contained quotes and real message anchors. Its labels are Demonstrated, Partially demonstrated, Needs work and Not assessed, with one practice priority and supplied limitations. There are no numeric scores, rankings, question cards, numbered answers or per-answer grading.

## Brand commitments

REQ-038 pins the user-supplied charcoal/Citron screenshot and authorizes polish only. Preserve its compact typography, neutral surfaces, olive selections, Citron actions and New interview proportions. The ultraviolet/lime redesign and enlarged display typography from REQ-037 are rejected. Root `DESIGN.md` and `.impeccable/design.json` record the active system; `plan/ui-revamp/DARK-POLISH.md` records the reference and scope.

Dark is the only user-visible appearance and is applied in server markup and before hydration. Saved Light/System preferences and OS theme changes cannot switch it. The light CSS palette, appearance preference machinery and selector component remain in source behind `appearanceSelectionEnabled = false`; no appearance choices render in Settings. Preserve the live orb/captions/dock and all audio/lifecycle behavior. All active fonts are local.

All non-landing routes retain the desktop boundary below 1024 CSS pixels, including authentication, onboarding and resized live sessions. The page remains mounted behind the wider-window guidance so session ownership and drafts survive resizing. The public landing remains responsive.

## Interface hierarchy

The compact black sidebar places one full-width Citron New interview action beneath the wordmark. Dashboard, Interviews and Practice memory use quiet main navigation with a neutral current state; My profile and Settings sit at the bottom with the avatar/account menu. That menu owns Settings and Sign out without a duplicate profile link. Resume interview appears only for a real active session. The normal sidebar has a pointer-operated toggle, ordinary keyboard-accessible links and no application navigation shortcuts or shortcut hints. Live navigation retains its drawer and exit confirmation. Live M/R/T/Space control shortcuts remain available.

Dashboard is a real-session task overview: saved-name greeting, Start/Resume, an active session when present, latest completed session/review, recent sessions and a next-practice region using an actual review priority. First use, missing review, empty collection and failed refresh are distinct states. Do not invent activity or a personal practice finding to fill the page.

New interview uses six compact descriptive role radios with olive selection and Citron text beside a charcoal session brief containing the selected role, saved/required experience, 20-minute voice context, optional profile goal, inline recovery and Continue to audio. The goal uses a bounded editor; loading states follow the same geometry. Short desktop windows compress the spacing while keeping the action reachable beside its settings. Explicit goal edits save through the existing profile API before session creation; unchanged goals cause no write. Read the fresh profile before merging only the edited goal, preserving other fields and onboarding state. Missing experience retains the minimal inline selection/save flow; useful background gaps and failures remain contextual. Continue to audio is the actual creation action. There is no topic, duration, difficulty or provider picker.

Audio preflight is an unboxed soundcheck with role, saved experience and actual duration, real input-level feedback, speaker testing and inline recovery. Draft sessions can return to role selection; active saved sessions preserve immutable context, real remaining time, Resume/transcript/finish actions and timing semantics. Keep permission denial, secure-context/device errors and retry. Access does not prove sound quality or that the user heard the speaker test. Media tracks, speaker nodes and audio contexts clean up on leaving or starting.

The live page preserves the reactive orb, centered interviewer/candidate captions, timer and control dock, with the continuous speaker-labelled transcript open alongside it. Its toggle returns focus; follow-latest applies only while the reader is at the bottom, with Jump to latest otherwise. Preserve streaming/partial reconciliation, interruption markers, nonrepetitive announcements, pause/replay/mute, device routing, reconnect, ownership, finish/leave choices, last-answer warnings, unload guards and short-window control reachability.

Completed sessions show synthesis, qualitative findings and exact transcript evidence, one practice priority, supplied limits and the original transcript. Pending/generating review keeps the transcript available; failed/skipped/missing-result states keep the appropriate retry/generate action. Legacy reports expose safe summary text without guessed labels or evidence. History shows real sessions, saved experience, dates, lifecycle and review availability, with real search/status filters, result count, empty/no-match distinction, export and confirmed deletion. Role links and delete controls remain separate targets.

My profile separates readable background/projects/links from compact practice context. Each field, project and custom link has an independent inline Save/Cancel flow. Preserve name (80), headline/location (120), about (1500), goal (500), stack (30 entries of 40 characters), projects (10) and custom links (8) limits, and every existing project/link field. Profile edits read fresh data, merge only explicit changes, serialize queued mutations, refuse stale-target/collection overwrites, retain failed drafts and return focus. External links retain safe handling. Ordinary editing never reopens first-time onboarding; completed/skipped legacy edit URLs return to My profile.

First-time setup uses Background, Practice and Review with the existing saved-step mapping: legacy 0–3 to Background, 4 to Practice, 5 to Review. Background leads with real resume import while retaining manual fields, optional projects/links, URL and pasted-text sources. Resume formats remain PDF/DOCX/DOC/TXT up to 5MB. Import retains provider consent, actual progress, cancellation, retry, extracted-text/JSON inspection, selective approval and explicit apply/discard. Pending suggestions and approval choices remain distinct from approved facts. Keep owner-scoped device drafts and autosave; name, role and experience are explicit before completion. Save & exit/Skip retains its current path.

Practice memory exposes dated, role/source-linked owned findings and confirmed removal with mutation progress and retry. Settings retains browser appearance, stored playback speed and owned account details; device changes stay in the connected live audio menu. Three clearly labelled future-feature previews are authorized: Practice plan on dashboard/review, Tailor to a job on setup, and Practice reminders in Settings. Their dialogs explain future capability and requirements, restore trigger focus, perform no production mutation and never claim anything was created, saved or scheduled. They add no placeholder routes or permanent navigation destinations.

Help remains removed and `/help` redirects to Settings. `/session`, `/library`, `/plans`, `/progress` and `/saved` continue to redirect to New interview. Not-found and route/root errors retain recovery; the root error document stays self-contained outside providers.

## Public presentation

The landing uses one clear technical-practice proposition, desktop/microphone requirements beside the decision, the six-role product example, three real steps and FAQ. The example is explicitly illustrative: role tabs show a transcript excerpt and qualitative review without requesting microphone/provider access or implying a personal result. The main entry points to `/interviews/new`. Signed-in visitors see Go to app in the header/footer; signed-out visitors retain sign-in/get-started entry. Initial account resolution does not flash signed-out actions; successful logout restores them. No invented testimonials, trust claims, personal scores or fake progress charts are shown.

## Accessibility and recovery

Use visible focus, named semantic controls, current-page state, skip navigation, Radix focus management, readable contrast, reduced-motion support and responsive text. Shared components own hover, focus, pressed/selected, disabled, busy and invalid states where applicable. Compact desktop controls retain at least 44px coarse-pointer targets. Announce meaningful voice status without repeatedly announcing partial words. Preserve real loading, empty, error, retry and destructive confirmation states.

Loading skeletons match their destination and retain the workspace/onboarding frame. Busy actions retain visible labels and lock duplicate activation. Cold errors have stable inline retry; failed refreshes keep the last real content; session-check failures remain recoverable without falsely signing the user out. Keep field validation beside the field, action failure near the action and live recovery in its notice region. Do not use toasts or render unavailable data as an empty success. Long names, prose, code and URLs must wrap or truncate safely without hiding essential actions.

## Verification boundary

The tracked Playwright harness uses synthetic owned HTTP/WebSocket contracts and fake browser media devices. Its results are deterministic frontend evidence, not proof of Google OAuth, physical microphone/output routing, real provider quality/latency or human assessment calibration. REQ-037 has passing evidence for all 71 unique browser cases across the recorded runs; this is not one uninterrupted 71-case pass. Types/lint and the final web production build passed after the foreground corrections. The full presentation review inspected 37 captures; 16 affected recaptures resolved its one grouped foreground finding, with a SHIP verdict at that correction scope. Exact counts, reports and limits are in `plan/ui-revamp/VERIFICATION.md` and `plan/ui-revamp/HIGH-CHROMA-REVIEW.md`. No deployment or remote migration occurred. See `tests/e2e/README.md` for the remaining manual and integration gates.
