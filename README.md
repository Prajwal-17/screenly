# Forma · AI Interviewer

A technical interview practice app built for learning and portfolio use. Choose a role, experience level, topics, and duration; have an adaptive voice or typed conversation; then review your saved transcript and feedback.

![Forma landing page](docs/screenshots/landing.png)

## What works

- Premium dark interface with responsive workspace navigation and reduced-motion support.
- Google OAuth (optional) and email/password authentication.
- Frontend, backend, and full-stack interviews at three experience levels.
- Deepgram Flux transcription and speech, with streamed LLM replies through the OpenAI library.
- Adaptive follow-ups using session settings and conversation history.
- Microphone/speaker checks, mute, interruption, typed fallback, and optional microphone recording download.
- Saved conversations, structured feedback, searchable history, deletion, and transcript export.
- Session ownership checks, duplicate-answer protection, bounded provider waits, and recovery after disconnection.

## Requirements

Bun 1.3.5+ (verified with 1.4.3), Node.js 20.9+, and an OpenAI-compatible Chat Completions provider. Deepgram is needed for voice; typed interviews only need the LLM.

## Local setup

```sh
bun install
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
```

Fill in `BETTER_AUTH_SECRET` with a random string of at least 32 characters. You can generate one with `bun -e 'console.log(crypto.randomUUID() + crypto.randomUUID())'`.

Configure these **backend** values:

```env
LLM_API_KEY=your-provider-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=your-chosen-chat-model
DEEPGRAM_API_KEY=your-deepgram-key
```

The voice defaults follow Deepgram’s current conversational model family:

- **Transcription:** `flux-general-en`, recommended for English real-time agents with built-in turn detection.
- **Speech:** `flux-kit-en`, Deepgram’s default agent voice and a featured all-rounder (British English).
- **Capture:** 16 kHz mono PCM16 in the recommended 80 ms chunks.

Both model names remain configurable using `DEEPGRAM_STT_MODEL` and `DEEPGRAM_TTS_MODEL`. Existing `.env` overrides take precedence; change `DEEPGRAM_TTS_MODEL=flux-kit-en` there to select Kit. Alexis remains a supported featured voice in the same current Flux family.

Sources checked October 14, 2026: [Flux STT quickstart](https://developers.deepgram.com/docs/flux/quickstart), [Flux TTS overview](https://developers.deepgram.com/docs/flux-tts/overview), [Flux voice catalog](https://developers.deepgram.com/docs/flux-tts/voices), and [Deepgram changelog](https://developers.deepgram.com/changelog).

The LLM endpoint and model are configurable; DeepSeek is only the example endpoint. Select a model that supports Chat Completions streaming and JSON output when instructed. No provider key is sent to the browser.

```sh
bun run dev
```

Open [localhost:3000](http://localhost:3000). The backend runs on port 8787, creates `apps/backend/storage/local.sqlite`, and applies committed Drizzle migrations automatically. Create an account, prepare an interview, and check your microphone before starting.

If the LLM is not configured, setup and history remain available, and the start screen explains what to configure. If microphone transcription fails, continue by typing; TTS remains enabled. Use **Hear question** to replay the latest question or **Retry speech** after a speech failure. Finalized messages remain saved.

For Google login, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register `http://localhost:8787/api/auth/callback/google` as the callback URL. Email/password works without Google credentials.

When changing ports/origins, update `FRONTEND_URL`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_API_URL` together. The browser derives its WebSocket URL from the API origin. The frontend API URL is a build-time Next.js setting. Microphone access works on localhost or HTTPS.

## Commands

```sh
bun run dev
bun run check-types
bun run lint
bun run test
bun run build
bun run check
bun run format
bun run format:check
```

Run browser tests against isolated local provider fixtures:

```sh
bunx playwright install chromium
bun run build
bun run test:e2e
```

The suite starts its own frontend, backend, LLM fixture, and voice fixture. It uses `.e2e.sqlite`, test-only credentials, and simulated microphone input. Ports 3000, 8787, 8790, and 8791 must be free. To use an installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Architecture

- `apps/web`: Next.js, React, Tailwind, Motion, React Hook Form, TanStack Query, Zustand.
- `apps/backend`: Bun, Hono, Better Auth, Drizzle, SQLite, OpenAI library.
- `packages/shared`: Zod request/report schemas, domain types, and the audio frame contract.
- `e2e`: controlled provider fixtures and Playwright journeys.
- [Implementation notes](docs/implementation.md): voice lifecycle, storage, protocol, and verification.
- [Screenshots](docs/screenshots): landing, dashboard, setup, interview, feedback, and mobile history.

The backend owns interview timing, conversation history, and provider requests. The browser owns microphone capture and ordered playback. Deepgram turn detection establishes answer boundaries; no browser VAD model assets are required.

The installed Deepgram SDK's speech WebSocket implementation attempts to JSON-parse binary frames. The app uses a small typed Bun WebSocket transport for both Deepgram channels, retaining SDK transcript types. This separates binary PCM audio from JSON control events and supports the runtime's configured HTTP proxy.

## Review notes

The automated journeys use controlled providers, so they verify app behavior without provider charges. A live Deepgram check in the implementation environment returned HTTP 401; live transcription and voice quality still need verification with a working key. Live LLM verification awaits your chosen endpoint/model.

Active sessions can resume until their original wall-clock duration expires. Feedback is generated once after completion; failed generation can be retried. A completed session is never restarted. The optional audio download contains microphone input, while transcript export includes both speakers.
