# Implementation and verification

## Product scope

Technical interview practice for frontend, backend, and full-stack roles. Experience and topics shape the interview; the LLM uses previous answers to choose follow-ups. A separate request evaluates the finalized transcript after completion. No agent framework or additional data service is required.

## Voice lifecycle

1. Prepare a draft interview without starting the clock.
2. Check microphone input and speaker output.
3. Connect the authenticated session socket; start the voice interview.
4. The server marks the session active and opens with a question, leaving `startedAt` unset and the timer at zero.
5. The browser captures 16 kHz mono PCM16 in recommended 80 ms chunks in an AudioWorklet.
6. Deepgram Flux emits partial transcripts and finalized end-of-turn events. Interim words forward synchronously without D1 reads; recognition receives vocabulary hints for the selected technical topics. Capture stays at 80 ms and natural turn-detection confidence stays unchanged. The configurable silence backstop defaults to three seconds rather than the provider's five; increase it for longer thinking pauses.
7. Finalized turns enter an ordered persistence queue; source keys and turn indices suppress duplicates and stale partials. Interruption stops playback immediately while its durable writes complete. A pending final write cannot clear the next turn's partial words, and finish waits for already accepted answers.
8. LLM text streams independently of the synthesis handshake. Pending speech tokens retain their exact order and whitespace, then enter one continuous synthesis turn. Audio frames are forwarded immediately and unchanged; a single Flush completes the entire response in parallel with saving the question.
9. Response-tagged 24 kHz PCM16 frames reach browser playback in order. The browser acknowledges the first non-silent processed output from the playback AudioWorklet, after its render timestamp. The server persists `startedAt` once and schedules the full interview duration from it. Text generation, speech connection, buffering, and suspended playback do not consume interview time.
10. On interruption, cancel generation, stop synthesis/playback, save interrupted output, and ignore late frames.
11. A playback acknowledgement distinguishes completed synthesis from speech the browser is still playing.
12. Finish saves the interview and releases audio resources. The user can request validated feedback or end without it. Skipping persists `feedbackStatus=skipped` and cancels the deadline/alarm; only a later explicit feedback request queues a report.

Connection loss stops local audio and retains the transcript; reconnect and resume within the session's original time budget. D1 retains finalized data across Worker restarts. A Durable Object per interview persists the deadline and feedback job; alarms complete expired sessions even after disconnect and retry interrupted jobs.

Live generation can select `LLM_INTERVIEW_MODEL` independently from the feedback model in `LLM_MODEL`. Reasoning effort and output-token limits are optional live-only settings; they are omitted for compatibility unless explicitly configured. Feedback requests do not inherit them. Fixture tests clear local overrides so a developer's model routing cannot change test behavior.

## Storage

A migration extends the original interview table with settings, state, timing, and feedback. A new message table stores ordered, finalized speaker turns. Message source keys are unique per interview; deletion cascades to messages.

Feedback uses a 0–10 scale with one decimal place. Saved 0–100 reports are converted on read; new reports store their scale explicitly. Feedback validation checks rubric dimensions, score ranges, next steps, and referenced candidate IDs. Overall scores are suppressed for interviews with fewer than two candidate answers. A Durable Object serializes feedback jobs for each interview. Its persisted alarm survives restarts; failed provider requests set a retryable status.

## Ownership and resource boundaries

Every interview request and socket upgrade checks the signed-in user and session owner. Only one active socket is allowed per interview. Resource owners close microphone tracks, worklets, audio contexts, provider sockets, playback queues, deadlines, and generation requests.

The frontend's status is based on socket/provider events. Query caches are refreshed on finish and feedback completion so reports/history do not retain a draft snapshot.

## Design

Screenly uses the approved Ferndesk-inspired warm-paper / charcoal / fern light design system, locally bundled Geist, semantic Tailwind CSS 4 tokens, and customized shadcn/Radix primitives. All routes share the same presentation vocabulary. The 240px desktop sidebar has aligned navigation, a bordered selected state, and bottom-anchored account actions; below 768px it becomes a Radix navigation drawer. The 64px workspace bar owns the single page heading; content does not repeat the route name. Audio preflight uses open rows on the canvas rather than an enclosing card. Zustand owns mobile navigation UI state; TanStack Query continues to own server data.

The live interview centers a responsive voice orb, meaningful session status, and actual microphone activity. Full assistant text appears as generated and remains readable below the orb; candidate text follows live transcription. AI Elements MessageResponse renders the streaming question and interviewer messages; Message and MessageContent wrap transcript turns, with candidate speech kept as literal text. AI Elements Conversation handles internal history scrolling and the jump-to-latest action. A fern Shimmer marks thinking and becomes static with reduced motion. There is no phrase segmentation, phrase buffering, duration-weighted reveal, or trailing-word truncation. The live session fills the dynamic viewport, hides the workspace top bar and rail, and keeps navigation in a compact drawer trigger. The transcript starts open beside the stage on desktop or within a bounded lower panel on mobile; very short mobile windows switch between conversation and transcript. Mute, playback speed, and finish form a compact group directly on the paper canvas, centered beneath the orb in the conversation column. The grid lets the desktop transcript extend to the bottom independently, with no shared footer band. On phones the controls remain below the bounded transcript. The group stays stable across conversation states and remains visible without document scrolling. Replay and pause/resume actions are omitted; speaking naturally interrupts the interviewer. Shadcn tooltips label the icon controls, and short press, microphone-state, and menu transitions respect reduced motion. The elapsed/total timer sits at the far right of the live toolbar; badges, separators, buttons, menus, drawer, and finish confirmation use shared shadcn components.

Active interviews use a shared exit confirmation for links, workspace search, and sign-out. Candidates can stay, leave without ending (saved turns remain and the running timer continues), or end with feedback before continuing to the chosen destination. Untranscribed words may be lost when leaving. Native Navigation API traversal is cancelled before URL/route changes while awaiting the same confirmation; refresh, tab close, and full document departures use `beforeunload`. The Navigation API history path is feature-detected for current browsers; older browsers retain the link/command guard and native document-exit warning. No history entries or Next.js router methods are patched. Normal finish redirects bypass the guard, and exit completion suppresses late socket redirects to honor the original destination.

Playback keeps PCM at its original 24 kHz sample rate. A bounded WSOLA processor (`@soundtouchjs/core` Stretch) changes tempo on the audio thread while preserving vocal pitch at 1×, 1.25×, 1.5×, and 2×. It processes one window at a time, carries overlap across provider packets, and flushes/crops its lookahead on synthesis completion. Pause suspends the context; interruption clears the queue and advances a generation token so stale start/end events cannot affect a later response. The output analyser remains downstream of the processor. `build:audio` bundles the same-origin worklet and its license before web dev/build.

Microphone metering stays outside React's page subscriptions. Saved transcript rows and streaming responses are memoized; finding the current transcript question takes one pass per render. The Porcelain shader uses a centered square drawing buffer sized by ResizeObserver, avoiding per-frame layout reads and shading the empty sides of its column. It retains its original apparent size, voice response, reduced-motion behavior, and graphics fallback.

The previous presentation was removed in a separate reset commit before rebuilding. Routing, authentication, API contracts, server timing, microphone ownership/cleanup, reconnect, persistence, feedback, exports, and deletion are retained. Dashboard metrics use real query data; example landing content is explicitly labeled. No simulated audio or mock interview loop is part of the production UI. See [the design system](../DESIGN.md) and [the rebuild plan](ui-rebuild-plan.md).

Microphone capture uses a self-hosted Silero v5 ONNX model in a dedicated worker, with mono 16 kHz / 512-sample analysis frames. Three positive frames confirm an onset; a bounded 256 ms pre-roll preserves the beginning. Confirmed speech streams in 80 ms PCM16 packets with up to 256 ms of tail padding. A one-second quiet interval sends `speech-end`, which maps to Flux `ForceEndTurn` after the last packet has time to decode; natural provider end-of-turn detection and barge-in remain enabled. Muting/pausing discards local buffers, advances an epoch to reject stale worker output, and sends no silent PCM. Model load/inference failure closes capture without a continuous-upload fallback. Inference backlog and provider-handshake buffering are bounded. All microphone tracks, contexts and workers are released on departure.

Flux does not support the v1 `KeepAlive` message. STT sockets retire after five idle seconds and reconnect on demand, preserving PCM packet order and remapping restarted provider turn indices so subsequent answers are accepted. Socket handshakes are attached to the interview's background-work lifetime. Build scripts copy version-locked runtime/model assets and license notices from dependencies; no CDN or third-party browser request is needed.

## Validation

- Shared schema/audio framing tests.
- Disabled email/password endpoints, fixture-authenticated API, invalid settings, cross-user isolation, and draft-finish rejection.
- Duplicate answer suppression, persisted interrupted output, stale generation rejection, idempotent finish, and ownership/deletion.
- Local WebSocket transport test for JSON and binary speech frames.
- Voice latency regressions for synchronous interim transcription, pending persistence, speech handshakes, interruption, exact token ordering, and selected-topic vocabulary. A Chromium microphone fixture measures React commits, orb layout reads, drawing-buffer pixels, and received-partial-to-paint latency; these are app measurements, not real-provider transcription benchmarks.
- Chromium journey: signup, setup, voice conversation, provider-error recovery, report, reload, transcript download, history, narrow desktop reflow, and deletion.
- Voice recovery journey: role shortcut prefill, topic validation, unavailable voice blocking, microphone reconnect/resume, rejection of obsolete text commands, feedback failure/retry, disclosures, completed-session reopening, search, sign-out, and keyboard focus.
- Responsive checks across phone, tablet, laptop, desktop, and landscape viewports, including 320×568 through 1920×900. The live viewport regression checks document overflow, full long-question fit, visible 44px controls, transcript switching, and navigation focus. These are Chromium viewport emulations, not physical-device or Safari checks.
- Design-system browser coverage: rendered fern action/control contrast, keyboard focus, 16px mobile text entry, stable loading dimensions, disabled repeat submissions, error recovery with retained values, and reduced motion.
- Chromium voice journey with simulated microphone and local Deepgram wire-protocol fixture: capture, transcription, playback, mute, reload, and finish. Orb motion follows listening/mute state, supports pause/resume, and stops for reduced motion. Long-conversation coverage verifies preserved reading position and the jump-to-latest action in the optional inline transcript. Navigation-drawer dismissal restores keyboard focus.
- Type checks, ESLint, production build, and formatting.

Live checks require valid provider credentials. A clean synthesized sentence exercised the configured Deepgram speech and recognition services successfully, including React Hooks and TypeScript terminology. AI endpoint probes showed substantial and variable time to first text even with a fixed route; selecting a model does not guarantee a latency target. Browser fixtures validate the OpenAI-library request/stream/report path without claiming real-microphone recognition quality or production latency.

## Portfolio review

Screenshots were captured from controlled test sessions and contain illustrative provider responses. Follow the README to run your own interviews with your chosen model. Useful later additions include behavioral interviews, job-description context, richer comparison across sessions, and multilingual practice.

## Current Deepgram defaults

English recognition uses `flux-general-en`; synthesis uses `flux-kit-en`. These are the current Flux conversational families, with Kit selected as Deepgram’s default agent voice. Choosing Kit changes the voice, not the model generation. See the root README for sources and environment override instructions.

## Audio recovery

Microphone transcription and speech output are independent. Microphone failures require retrying transcription; they do not disable TTS. A transcription connection must succeed before the interview clock starts; microphone access is required again when resuming. The speech recovery action replays the last question without generating another LLM response or adding duplicate transcript messages. Speech errors have their own retry action.

Flux `Flushed` acknowledges text flushing; it does not mean all audio has arrived. The speech transport waits for `SpeechMetadata` before ending synthesis. Audio contexts use idempotent, shared cleanup so repeated microphone checks, starting, and navigation cannot close an already closed context. Browser tests track actual PCM playback and exercise repeated microphone checks.

## Voice-only answer boundary

Candidate answers are accepted exclusively from finalized Deepgram transcription turns. The shared WebSocket contract accepts `start`, `interrupt`, `speak`, `played`, and `finish` controls, plus binary microphone audio frames. Start events reject extra mode flags; text-answer commands are not part of the protocol. There is no composer, answer draft storage, answer acknowledgement event, or keyboard answer submission path.

Saved conversations remain readable, including interviews created before this change. Removing text input does not delete historical transcripts or feedback. Only finalized transcript messages enter the live log; streaming interviewer text and partial transcription are visible but excluded from assistive announcements. The transcript follows new content only while the reader stays near the bottom. Finish confirmation asks the candidate to wait until their last spoken answer appears in the conversation; deletion explicitly states that it cannot be undone.

## Tailwind and shadcn foundation

All frontend routes and shared presentation components use Tailwind CSS utilities and the configured shadcn `radix-nova` component sources. The previous component-class stylesheet is removed; global CSS is limited to theme tokens, base typography and reduced-motion behavior. Input, choice and confirmation behavior is composed from the primitives rather than reimplemented in routes. Radio/checkbox choices use React Hook Form Controllers to preserve schema validation. Error and availability alerts remain distinct, using assertive error alerts and polite availability status updates. The voice-only change removes text-answer handling from the frontend controller, backend session handler, and shared event contract while preserving the microphone, speech, persistence, and timing lifecycle.

## Authentication

Production uses Google through Better Auth; email/password endpoints are disabled. First-time Google sign-in creates the account. OAuth errors return to the sign-in page with a retry.

An explicit `ENABLE_DEV_LOGIN=true` plus development mode and localhost origins registers a local email-only endpoint using Better Auth sessions/cookies. Its UI is imported only in Next.js development builds. Production registration, production UI exclusion, email normalization, origin restrictions, persisted sessions, and sign-out are covered by tests.

## Profile onboarding and imports

`user_profile` stores per-user details and draft/completion/skip state. Migration 0003 preserves existing accounts as skipped; 0004 adds onboarding state (current step and pending formatted import) without discarding profiles. Old JSON details receive defaults for new about/extra-link/project fields. Draft validation permits incomplete names and URLs; completion applies the strict full profile schema. Autosave is debounced and serialized, with a synchronous per-account device recovery copy for unsynced edits. Final completion waits for queued saves. Settings renders only safe HTTPS links, even from incomplete drafts. New-user routing preserves existing interview authentication/ownership; Settings reopens setup and role/experience seed interview defaults.

Resume extraction is bounded to 5 MB and 20 PDF pages. PDF text uses unpdf; DOCX extraction respects paragraph/run boundaries and XML entities with bounded decompression; legacy DOC uses the in-memory Word OLE parser. Pasted text remains a fallback. Clients requesting `application/x-ndjson` receive progress/result/error events for extraction and AI analysis; ordinary API callers receive JSON. Provider failures return actionable errors and ephemeral extracted text to the owner for inspection/retry. No original file/text is persisted or logged. Pending imports store only schema-validated formatted fields, separate from profile details until approval. AI has no tools and treats source instructions as untrusted; output cannot contain arbitrary fields or executable links. Public fetching uses native Workers HTTPS fetch with bounded DNS/public-IP/redirect/body/time checks, preserving the original hostname and TLS identity; irrelevant URLs are rejected on both client and server. Restricted LinkedIn pages are reported as unreadable. Migration 0005 adds D1-backed import leases and rate counters shared across Worker instances. Imports have per-user/concurrency limits and cancellation; manual entry remains independent of provider health.
