# Screenly interface

Screenly is a light-only desktop workspace for technical interview practice. The journey is: choose a focus, check setup, practice, review feedback, practice again. Visible copy should help someone act, decide, or recover; omit repeated headings, slogans, routine provider details, and decorative explanations.

## Foundations

- **Surfaces:** white and warm neutrals, dark text, thin relationship borders. Muted orange marks primary actions and selection. Success, warning, and error use separate semantic colors plus text.
- **Type:** General Sans variable (200–700) for headings/brand, Switzer variable (100–900) for reading and controls. Locally served WOFF2, explicit weight ranges, Arial fallbacks. Timers/scores use tabular numerals. Fontshare license and provenance are in `apps/web/app/fonts`.
- **Space:** shared 4, 8, 12, 16, 24, 32, 48, and 64 pixel tokens. Modest control radii; Lucide icons. Focus, hover, selected, pending, disabled, and pressed states are visible.
- **Controls:** one CSS button system shared with the existing React button primitive. Native fields, radios, checkboxes, disclosures, and dialogs retain their semantics.
- **Identity:** Screenly bracket/dot mark and wordmark. No waveform artwork, gradients, ornamental shadows, or promotional footers.

## Surfaces and data

| Route                        | Responsibility                                             | Important states                                                                      |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `/`                          | Split headline/action and a clearly labeled static example | Example is never operational session data                                             |
| `/auth/sign-in`              | Email/account creation and available Google sign-in        | Validation, submitting, authentication failure, existing-session redirect             |
| `/dashboard`                 | Real practice metrics, recent interviews, role shortcuts   | Loading/error before metrics, empty history, resume, score absent                     |
| `/interviews/new`            | Role, experience, topics, duration, compact summary        | Validated shortcut prefill, topic limits, unavailable interviewer, create error       |
| `/interviews/[id]` preflight | Microphone/speaker checks or typed mode                    | Permission denied/retry, voice unavailable, start pending, resume                     |
| `/interviews/[id]` active    | Current question and answer controls beside conversation   | Listening, processing, speaking, interruption/replay, draft saving, reconnect, finish |
| `/interviews/[id]/feedback`  | Summary, evidence, score breakdown, next steps             | Generating/failed/retry, insufficient evidence, transcript/export, safe deletion      |
| `/history`                   | Search and reopen or delete real sessions                  | Loading/error, empty, no matches, pending/failed deletion                             |

Overview, New interview, and History form the workspace rail. Feedback belongs to a selected session. The account row retains sign-out. Page headings provide orientation without a second breadcrumb bar.

## Layout and access

Review at 1280×720 and 1440×900. Smaller desktop windows and browser zoom reflow the same controls; no user-agent or device detection disables sessions. Below 760 CSS pixels, a short wider-window notice appears while controls remain reachable, including sign-out and active-session completion. There is no alternate mobile product flow.

Keyboard users can skip the rail, see focus, access transcript scrolling and native disclosures, dismiss dialogs with Escape, and arrive at the main region after route changes. Streaming tokens and partial transcription do not generate repeated live announcements. Long content wraps; scrolling earlier messages stops automatic following.

## Session boundaries

Presentation components do not own the session connection or provider cleanup. Preserve the controller effect keyed by interview/auth session, backend duration/completion, response IDs, audio cancellation, and unique answer source keys. Draft text survives reconnect/reload in the same tab when session storage is available. Never clear an answer before its matching save acknowledgement.

Screenshots in `docs/screenshots` come from isolated provider fixtures. They show test data and verify application behavior, not live provider quality. The studio HTML referenced by the supplied guide was not included in the repository, so the guide defines this implementation's visual direction.
