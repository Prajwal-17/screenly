# Implementation and verification

## Product scope

Technical interview practice for frontend, backend, and full-stack roles. Experience and topics shape the interview; the LLM uses previous answers to choose follow-ups. A separate request evaluates the finalized transcript after completion. No agent framework or additional data service is required.

## Voice lifecycle

1. Prepare a draft interview without starting the clock.
2. Check microphone input and speaker output.
3. Connect the authenticated session socket; start voice or typed mode.
4. The server marks the session active and opens with a question.
5. The browser captures 16 kHz mono PCM16 in recommended 80 ms chunks in an AudioWorklet.
6. Deepgram Flux emits partial transcripts and finalized end-of-turn events.
7. A unique source key prevents repeated turn events from generating duplicate answers.
8. The LLM streams text; useful phrase chunks reach Deepgram speech synthesis.
9. Response-tagged 24 kHz PCM16 frames reach browser playback in order.
10. On interruption, cancel generation, stop synthesis/playback, save interrupted output, and ignore late frames.
11. A playback acknowledgement distinguishes completed synthesis from speech the browser is still playing.
12. Finish saves the interview, releases audio resources, and generates validated feedback.

Typed answers follow the same persisted conversation flow. Connection loss stops local audio and retains the transcript; reconnect and resume within the session's original time budget. Server restarts retain the database; reports interrupted during generation become retryable.

## Storage

A migration extends the original interview table with settings, state, timing, and feedback. A new message table stores ordered, finalized speaker turns. Message source keys are unique per interview; deletion cascades to messages.

Feedback validation checks rubric dimensions, score ranges, next steps, and referenced candidate IDs. Overall scores are suppressed for interviews with fewer than two candidate answers. Pending feedback requests are deduplicated in the running process; the durable status supports retry after restart.

## Ownership and resource boundaries

Every interview request and socket upgrade checks the signed-in user and session owner. Only one active socket is allowed per interview. Resource owners close microphone tracks, worklets, audio contexts, provider sockets, playback sources, deadlines, and generation requests.

The frontend's status is based on socket/provider events. Query caches are refreshed on finish and feedback completion so reports/history do not retain a draft snapshot.

## Design

A consistent charcoal-and-lime visual system, local Geist fonts, compact navigation, readable transcripts, restrained transitions, and responsive layouts. Loading, empty, provider-error, reconnection, and feedback-retry states are part of the interface. Native form controls and dialogs preserve keyboard semantics; reduced-motion preferences are respected.

Named Impeccable/Emil Kowalski skills were not available in this workspace. No claim is made that those skills were applied.

## Validation

- Shared schema/audio framing tests.
- Real email/password signup, authenticated API, invalid settings, cross-user isolation, and draft-finish rejection.
- Duplicate answer suppression, persisted interrupted output, stale generation rejection, idempotent finish, and ownership/deletion.
- Local WebSocket transport test for JSON and binary speech frames.
- Chromium journey: signup, setup, typed conversation, provider-error recovery, report, reload, transcript download, history, mobile width, and deletion.
- Chromium voice journey with simulated microphone and local Deepgram wire-protocol fixture: capture, transcription, playback, mute, reload, and finish.
- Type checks, ESLint, production build, and formatting.

Live checks require valid provider credentials. The implementation environment's Deepgram credential returned HTTP 401. The user will choose the LLM model later; browser fixtures validate the OpenAI-library request/stream/report path without claiming real-provider quality.

## Portfolio review

Screenshots were captured from controlled test sessions and contain illustrative provider responses. Follow the README to run your own interviews with your chosen model. Useful later additions include behavioral interviews, job-description context, richer comparison across sessions, and multilingual practice.

## Current Deepgram defaults

English recognition uses `flux-general-en`; synthesis uses `flux-kit-en`. These are the current Flux conversational families, with Kit selected as Deepgram’s default agent voice. Choosing Kit changes the voice, not the model generation. See the root README for sources and environment override instructions.

## Audio recovery

Microphone transcription and speech output are independent. Typed answers still receive spoken replies when Deepgram is configured, and transcription failures do not disable TTS. **Hear question** replays the last question without generating another LLM response or adding duplicate transcript messages. Speech errors have their own retry action.

Flux `Flushed` acknowledges text flushing; it does not mean all audio has arrived. The speech transport waits for `SpeechMetadata` before ending synthesis. Audio contexts use idempotent, shared cleanup so repeated microphone checks, starting, and navigation cannot close an already closed context. Browser tests track actual PCM playback and exercise repeated microphone checks.
