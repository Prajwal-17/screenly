# Browser verification

[verification.json](verification.json) records the current source fingerprint, commands, deterministic evidence, and unverified integration gates. Generated reports are local artifacts for the run. Earlier counts and desktop/touch captures belong to the superseded mobile-and-collapse policy.

An earlier independent review covered ten desktop/touch resting captures under the superseded policy. Those captures are historical, not validation of the desktop-only revision.

From the repository root:

```sh
bun install
bun run --cwd apps/web test:e2e:install
bun run test:e2e
```

Playwright starts and stops the frontend on `127.0.0.1:3106`, with the API origin set to `127.0.0.1:4399`. Keep port 3106 free. No backend or real provider credentials are needed. Linux CI may also need `bunx playwright install --with-deps chromium` from `apps/web`.

`fixtures.ts` uses shared domain types and synthetic accounts, interviews, feedback, and imports. It intercepts HTTP and WebSocket requests before navigation. Unhandled API requests and uncaught browser errors fail the test. No fixture module is imported by application code. Google availability is simulated; the suite never performs OAuth or sends audio to a provider. The microphone/speaker preflight uses Chromium’s fake device. Live session events drive the actual application session owner and presentation, without replacing its store or audio engine.

## Commands and artifacts

```sh
bun run test:e2e --project=desktop
bun run test:e2e tests/e2e/profile.spec.ts
bun run test:e2e --grep 'history filters'
```

Reports live in `apps/web/playwright-report/`; screenshots and failed-test traces live in `apps/web/test-results/`. Both are ignored. Open the report with `bunx playwright show-report` from `apps/web`, or attach the generated screenshots/report to a code review. Desktop journeys attach captures for history, onboarding, feedback, and live screens. They are evidence for that run, not committed reference goldens. No absolute checkout paths or `/tmp` fixtures are required.

Run repository checks sequentially:

```sh
bun run check-types
bun run lint
bun run test
bun run build
bun run test:e2e
git diff --check
```

Next type generation and build share `.next/types`; do not run them together. The test server uses `.next/dev`, and Playwright owns its lifetime. Avoid a second development server in the same checkout. Browser-test timeouts allow first-run compilation on slower filesystems; assertions wait for accessible state rather than sleeping.

## Coverage

| Area           | Deterministic evidence                                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell          | Current page/title/main focus, expanded sidebar despite stale preference, editable shortcut protection, search focus, live drawer and resize, sign-out failure/retry                                                                                       |
| Auth and gates | Google availability/retry, OAuth error copy, development form hidden unless enabled, existing-session redirect, profile recovery/expiry, missing interview, unknown page                                                                                   |
| Practice       | Query/profile role defaults, blank-role fallback, 1–6 topics, 30-minute payload, pending-submit lock, failed creation/retry, empty/error dashboard                                                                                                         |
| Preflight      | Microphone denial/retry with a fake device, speaker test, unavailable voice/interviewer disables start                                                                                                                                                     |
| Profile        | Six manual steps, repeated links/projects, field error focus, file/text/URL import, selective approval and JSON, invalid input, cancellation/failure, device draft recovery, autosave retry, skip, complete-profile edit                                   |
| History/review | Status/search/reset, delete cancel/failure/success, feedback pending/generating polling, failed/skipped retry, null scores, answer evidence and transcript export                                                                                          |
| Live           | Persistent question, partial/saved captions/transcript, pause acknowledgement/resume, audio-menu dismissal/focus, targeted microphone/speech/interviewer errors, reconnect, finish cancellation/failure/retry, guarded navigation, finish without feedback |
| Responsive     | Main route inventory at 1024, 1280, 1366, 1440, 1920px; long content; short desktop controls; narrow-window boundary and live session preservation                                                                                                         |

These checks do not establish full screen-reader compatibility, real output-device routing, provider latency, offline transport recovery, or a performance comparison against a measured prior revision. The 200% text-size check exercises reflow, rather than a physical browser-zoom gesture. Route/root error recovery is provider-independent by construction; actual route/root-layout failures still require production-mode fault injection. Keep untested integration states explicit in review evidence.

## Interactive follow-up

A subsequent shared T3 preview pass used the real local frontend/backend, a loopback-only synthetic account, and isolated D1 state. It exercised the landing redirect, all six manual onboarding steps, URL validation, repeatable link removal and project editing, setup validation, microphone denial, dashboard role selection, search and drawer focus, Help, history filtering and deletion, and historical 360px not-found recovery. Search dismissal was fixed to restore the desktop opener; this pass preceded the desktop-only policy. See the execution ledger in `UI_IMPLEMENTATION_PLAN.md` for exact coverage and omissions.

This direct pass did not exercise the complete requested live session, feedback, import approval, all error states, or the full viewport/zoom matrix. The fixture suite below provides separate synthetic evidence for many of those states; it does not make the interactive or real-service review complete.

The later synthetic shared-preview continuation is recorded in section 11 of `UI_IMPLEMENTATION_PLAN.md`. To reproduce its local fixture, keep ports 3106 and 4399 free, then start `bun run apps/web/tests/e2e/preview-fixture.mjs` from the root and `WEB_PORT=3106 NEXT_PUBLIC_API_URL=http://127.0.0.1:4399 bun run --cwd apps/web dev` in a second terminal. Open the frontend in the shared browser. The fixture binds to loopback, stores only synthetic state in memory, and is never included in the application bundle. It only models the already-active live socket, not microphone capture or provider audio. Stop both processes afterward.

From a separate local shell, `curl -s -X POST -H 'content-type: application/json' --data '{"reset":true,"newProfile":true}' http://127.0.0.1:4399/__control` resets the fixture for onboarding. The same endpoint accepts `importMode` (`success`, `pending`, `error`, `empty`), `failures` keyed by `METHOD /api/path` (replace with `{}` to clear), `capabilities`, an `event` matching a shared server-event shape, or `disconnect: true`. `GET /__control` exposes synthetic state and recorded client events. These controls are test-only and must not be pointed at real data.

## Real-service gate

Use dedicated test data with the existing backend environment and configured frontend/API/cookie origins. Record the revision, browser/device, and result for Google login/logout; onboarding and profile editing; microphone grant/denial/retry; one full spoken interview; interruption/replay; pause/reconnect; feedback generation/retry; export and deletion. Do not change production auth policy to make a test pass. A capabilities response only reports configuration availability; it does not verify a provider or real device.

The deterministic suite is reproducible evidence for frontend behavior. Until the real-service results are recorded, external integration remains unverified.
