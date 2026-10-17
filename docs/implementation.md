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
8. The LLM streams text; useful phrase chunks reach Deepgram speech synthesis.
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

Screenly uses the approved Jade light design system: neutral surfaces, green actions, and locally bundled Geist Sans for headings, reading text, and controls, with shadcn-compatible semantic tokens, shadcn/ui Radix primitives, and Tailwind CSS 4 utility layouts throughout. Overview, New interview, and History share a quiet rail with account/sign-out access. Questions and conversation sit alongside each other; microphone controls, transcript messages, and interview rows have focused components. Loading, empty, permission, reconnection, feedback-retry, and completed states use concise factual copy. shadcn Input/Field, controlled Radix Checkbox/RadioGroup/ToggleGroup, Accordion disclosures, AlertDialog confirmations, a skip link, route focus, and visible focus states preserve keyboard access. Radix manages dialog trapping and focus restoration. Desktop baseline widths are 1280 and 1440 pixels; the same controls reflow to 360 CSS pixels without disabling an active session. See [the design system](../DESIGN.md).

The current implementation follows the supplied design-system brief and the confirmed Jade palette. Existing page structure, routing, authentication, API contracts, server-owned timing, voice cleanup, reconnection, persistence, feedback, and exports are preserved. The redesign does not add mock session behavior or a palette switcher.

## Validation

- Shared schema/audio framing tests.
- Real email/password signup, authenticated API, invalid settings, cross-user isolation, and draft-finish rejection.
- Duplicate answer suppression, persisted interrupted output, stale generation rejection, idempotent finish, and ownership/deletion.
- Local WebSocket transport test for JSON and binary speech frames.
- Chromium journey: signup, setup, voice conversation, provider-error recovery, report, reload, transcript download, history, narrow desktop reflow, and deletion.
- Voice recovery journey: role shortcut prefill, topic validation, unavailable voice blocking, microphone reconnect/resume, rejection of obsolete text commands, feedback failure/retry, disclosures, completed-session reopening, search, sign-out, and keyboard focus.
- Responsive checks at 360, 640, 1280, and 1440 CSS pixels, including active voice sessions, feedback, and history.
- Design-system browser coverage: rendered Jade action/control contrast, keyboard focus, 16px mobile text entry, stable loading dimensions, disabled repeat submissions, error recovery with retained values, and reduced motion.
- Chromium voice journey with simulated microphone and local Deepgram wire-protocol fixture: capture, transcription, playback, mute, reload, and finish.
- Type checks, ESLint, production build, and formatting.

Live checks require valid provider credentials. The implementation environment's Deepgram credential returned HTTP 401. The user will choose the LLM model later; browser fixtures validate the OpenAI-library request/stream/report path without claiming real-provider quality.

## Portfolio review

Screenshots were captured from controlled test sessions and contain illustrative provider responses. Follow the README to run your own interviews with your chosen model. Useful later additions include behavioral interviews, job-description context, richer comparison across sessions, and multilingual practice.

## Current Deepgram defaults

English recognition uses `flux-general-en`; synthesis uses `flux-kit-en`. These are the current Flux conversational families, with Kit selected as Deepgram’s default agent voice. Choosing Kit changes the voice, not the model generation. See the root README for sources and environment override instructions.

## Audio recovery

Microphone transcription and speech output are independent. Microphone failures require retrying transcription; they do not disable TTS. A transcription connection must succeed before the interview clock starts; microphone access is required again when resuming. **Hear question** replays the last question without generating another LLM response or adding duplicate transcript messages. Speech errors have their own retry action.

Flux `Flushed` acknowledges text flushing; it does not mean all audio has arrived. The speech transport waits for `SpeechMetadata` before ending synthesis. Audio contexts use idempotent, shared cleanup so repeated microphone checks, starting, and navigation cannot close an already closed context. Browser tests track actual PCM playback and exercise repeated microphone checks.

## Voice-only answer boundary

Candidate answers are accepted exclusively from finalized Deepgram transcription turns. The shared WebSocket contract accepts `start`, `interrupt`, `speak`, `played`, and `finish` controls, plus binary microphone audio frames. Start events reject extra mode flags; text-answer commands are not part of the protocol. There is no composer, answer draft storage, answer acknowledgement event, or keyboard answer submission path.

Saved conversations remain readable, including interviews created before this change. Removing text input does not delete historical transcripts or feedback. Only finalized transcript messages enter the live log; streaming interviewer text and partial transcription are visible but excluded from assistive announcements. The transcript follows new content only while the reader stays near the bottom. Finish confirmation asks the candidate to wait until their last spoken answer appears in the conversation; deletion explicitly states that it cannot be undone.

## Tailwind and shadcn foundation

All frontend routes and shared presentation components use Tailwind CSS utilities and the configured shadcn `radix-nova` component sources. The previous component-class stylesheet is removed; global CSS is limited to theme tokens, base typography and reduced-motion behavior. Input, choice and confirmation behavior is composed from the primitives rather than reimplemented in routes. Radio/checkbox choices use React Hook Form Controllers to preserve schema validation. Error and availability alerts remain distinct, using assertive error alerts and polite availability status updates. The voice-only change removes text-answer handling from the frontend controller, backend session handler, and shared event contract while preserving the microphone, speech, persistence, and timing lifecycle.
