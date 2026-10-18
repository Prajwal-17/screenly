# Implementation and verification

## Product scope

Technical interview practice for frontend, backend, and full-stack roles. Experience and topics shape the interview; the LLM uses previous answers to choose follow-ups. A separate request evaluates the finalized transcript after completion. No agent framework or additional data service is required.

## Voice lifecycle

1. Prepare a draft interview without starting the clock.
2. Check microphone input and speaker output.
3. Connect the authenticated session socket; start the voice interview.
4. The server marks the session active and opens with a question.
5. The browser captures 16 kHz mono PCM16 in recommended 80 ms chunks in an AudioWorklet.
6. Deepgram Flux emits partial transcripts and finalized end-of-turn events.
7. A unique source key prevents repeated turn events from generating duplicate answers.
8. LLM text tokens stream into one continuous Deepgram synthesis turn. Audio frames are forwarded immediately and unchanged; a single Flush completes the entire response.
9. Response-tagged 24 kHz PCM16 frames reach browser playback in order.
10. On interruption, cancel generation, stop synthesis/playback, save interrupted output, and ignore late frames.
11. A playback acknowledgement distinguishes completed synthesis from speech the browser is still playing.
12. Finish saves the interview, releases audio resources, and generates validated feedback.

Connection loss stops local audio and retains the transcript; reconnect and resume within the session's original time budget. Server restarts retain the database; reports interrupted during generation become retryable.

## Storage

A migration extends the original interview table with settings, state, timing, and feedback. A new message table stores ordered, finalized speaker turns. Message source keys are unique per interview; deletion cascades to messages.

Feedback uses a 0–10 scale with one decimal place. Saved 0–100 reports are converted on read; new reports store their scale explicitly. Feedback validation checks rubric dimensions, score ranges, next steps, and referenced candidate IDs. Overall scores are suppressed for interviews with fewer than two candidate answers. Pending feedback requests are deduplicated in the running process; the durable status supports retry after restart.

## Ownership and resource boundaries

Every interview request and socket upgrade checks the signed-in user and session owner. Only one active socket is allowed per interview. Resource owners close microphone tracks, worklets, audio contexts, provider sockets, playback sources, deadlines, and generation requests.

The frontend's status is based on socket/provider events. Query caches are refreshed on finish and feedback completion so reports/history do not retain a draft snapshot.

## Design

Screenly uses the approved Ferndesk-inspired warm-paper / charcoal / fern light design system, locally bundled Geist, semantic Tailwind CSS 4 tokens, and customized shadcn/Radix primitives. All routes share the same presentation vocabulary. The 240px desktop sidebar has aligned navigation, a bordered selected state, and bottom-anchored account actions; below 768px it becomes a Radix navigation drawer. The 64px workspace bar owns the single page heading; content does not repeat the route name. Audio preflight uses open rows on the canvas rather than an enclosing card. Zustand owns mobile navigation UI state; TanStack Query continues to own server data.

The live interview centers a responsive voice orb, meaningful session status, and actual microphone activity. Full assistant text appears as generated and remains readable below the orb; candidate text follows live transcription. A visual word highlight runs while speech plays and stops on completion or interruption. It does not control audio or claim word-level alignment. There is no phrase segmentation, phrase buffering, duration-weighted reveal, or trailing-word truncation. The full read-only transcript starts collapsed and expands inline beside the stage on desktop or below it on mobile. Mute, interruption, and finish form the bottom dock; replay remains secondary. Reduced motion uses a steady highlight.

The previous presentation was removed in a separate reset commit before rebuilding. Routing, authentication, API contracts, server timing, microphone ownership/cleanup, reconnect, persistence, feedback, exports, and deletion are retained. Dashboard metrics use real query data; example landing content is explicitly labeled. No simulated audio or mock interview loop is part of the production UI. See [the design system](../DESIGN.md) and [the rebuild plan](ui-rebuild-plan.md).

## Validation

- Shared schema/audio framing tests.
- Disabled email/password endpoints, fixture-authenticated API, invalid settings, cross-user isolation, and draft-finish rejection.
- Duplicate answer suppression, persisted interrupted output, stale generation rejection, idempotent finish, and ownership/deletion.
- Local WebSocket transport test for JSON and binary speech frames.
- Chromium journey: signup, setup, voice conversation, provider-error recovery, report, reload, transcript download, history, narrow desktop reflow, and deletion.
- Voice recovery journey: role shortcut prefill, topic validation, unavailable voice blocking, microphone reconnect/resume, rejection of obsolete text commands, feedback failure/retry, disclosures, completed-session reopening, search, sign-out, and keyboard focus.
- Responsive checks at 360, 640, 1280, and 1440 CSS pixels, including active voice sessions, feedback, and history. The user viewport at 1536px is also covered.
- Design-system browser coverage: rendered fern action/control contrast, keyboard focus, 16px mobile text entry, stable loading dimensions, disabled repeat submissions, error recovery with retained values, and reduced motion.
- Chromium voice journey with simulated microphone and local Deepgram wire-protocol fixture: capture, transcription, playback, mute, reload, and finish. Orb motion follows listening/mute state, supports pause/resume, and stops for reduced motion. Long-conversation coverage verifies preserved reading position and the jump-to-latest action in the optional inline transcript. Navigation-drawer dismissal restores keyboard focus.
- Type checks, ESLint, production build, and formatting.

Live checks require valid provider credentials. The implementation environment's Deepgram credential returned HTTP 401. The user will choose the LLM model later; browser fixtures validate the OpenAI-library request/stream/report path without claiming real-provider quality.

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
