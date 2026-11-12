# Browser verification

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

## Current deterministic coverage

| Area               | Evidence                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell              | Classic sidebar, Dashboard/profile/memory routes and keyboard-accessible navigation, route title/main focus, retired-route redirects, live drawer and resize, sign-out failure/retry.                                                    |
| Auth and gates     | Session-aware homepage/no sign-in flash, signed-out entry, logout/reentry, Google availability/retry, OAuth error copy, development form gating, existing-session redirect, profile recovery/expiry, missing interview and unknown page. |
| Entry              | Six roles, profile suggestion, saved explicit experience requirement, strict `{ role }` payload, duplicate-submit lock and create retry.                                                                                                 |
| Preflight          | Microphone denial/retry with a fake device, speaker test and unavailable voice/interviewer gate.                                                                                                                                         |
| Profile and memory | Manual editing, repeated links/projects, selective import approval, device draft/autosave recovery, active finding source and dismissal.                                                                                                 |
| History and review | Real status/search, export/delete, schema-v2 qualitative findings with exact evidence anchor, safe legacy summary, pending/generating/failed/skipped retry states.                                                                       |
| Live               | Continuous transcript, partial-to-saved reconciliation, pause, replay, audio-menu focus, targeted recovery, reconnect, finish cancellation/retry and navigation guard.                                                                   |
| Responsive         | Main routes at desktop widths, long content, short-window controls, narrow-window boundary and live session preservation, public landing at phone/tablet widths.                                                                         |

The live orb, captions and default-open side transcript are preserved.

These checks do not establish full screen-reader compatibility, real output-device routing, provider latency, offline transport recovery, or a performance comparison against a measured prior revision. The 200% text-size check exercises reflow, rather than a physical browser-zoom gesture. Route/root error recovery is provider-independent by construction; actual route/root-layout failures still require production-mode fault injection. Keep untested integration states explicit in review evidence.

## Interactive follow-up

A subsequent shared T3 preview pass used the real local frontend/backend, a loopback-only synthetic account, and isolated D1 state. It exercised the landing redirect, all six manual onboarding steps, URL validation, repeatable link removal and project editing, setup validation, microphone denial, dashboard role selection, search and drawer focus, Help, history filtering and deletion, and historical 360px not-found recovery. Search dismissal was fixed to restore the desktop opener; this pass preceded the desktop-only policy. See the execution ledger in `UI_IMPLEMENTATION_PLAN.md` for exact coverage and omissions.

This direct pass did not exercise the complete requested live session, feedback, import approval, all error states, or the full viewport/zoom matrix. The fixture suite below provides separate synthetic evidence for many of those states; it does not make the interactive or real-service review complete.

## Loading and recovery

`recovery.spec.ts` holds actual fixture requests to verify screen-shaped loading, initial session failure/retry, stable cold retry progress and preserved history/memory/review content on refresh failure. It captures pending and recovery layouts, including short desktop windows. These are synthetic UI checks and do not call providers.

## Real-service gate

Use dedicated test data with the existing backend environment and configured frontend/API/cookie origins. Record the revision, browser/device, and result for Google login/logout; onboarding and profile editing; microphone grant/denial/retry; one full spoken interview; interruption/replay; pause/reconnect; feedback generation/retry; export and deletion. Do not change production auth policy to make a test pass. A capabilities response only reports configuration availability; it does not verify a provider or real device.

The deterministic suite is reproducible evidence for frontend behavior. Until the real-service results are recorded, external integration remains unverified.

REQ-029 setup coverage retains selected roles, missing experience, create/retry and real fake-device
preflight checks. It also verifies that explicit goal edits save before creation, survive failed
saves and preserve newer profile fields; microphone tracks stop after checking or leaving.
Responsive captures cover the implemented role/audio screens, including 1024x600 action fitting.

REQ-034 profile/onboarding coverage uses the existing HTTP fixtures: independent field/item
saves, Cancel/Escape focus, fresh-field merging and conflict rejection, save retry, real upload
picker/streamed import contract with persisted selective approval, optional manual links/projects,
three setup phases, legacy step/device-draft recovery and old edit-URL redirects. A pending
profile mutation aborts when its owner/editor leaves, including sign-out. These are deterministic
frontend/service-contract checks; actual resume extraction/provider quality remains separate.
