# Screenly design system

Screenly uses the approved **Jade** light palette and Geist Sans throughout the existing technical interview practice flow. Keep the current page layouts, routing, and real session behavior. There is one production palette, with no user-facing palette switcher.

## Tokens

`apps/web/app/globals.css` is the color source of truth. `:root` defines semantic values; `@theme inline` maps them to Tailwind utilities. Use `bg-primary`, `text-muted-foreground`, and other role names in components. Do not add hex values to JSX or duplicate legacy color variables. The static SVG favicon mirrors the background, foreground, and primary tokens.

| Role                                     | Jade value                   | Use                                  |
| ---------------------------------------- | ---------------------------- | ------------------------------------ |
| background / foreground                  | `#FAFBF8` / `#24342E`        | Page surface and reading text        |
| card, popover                            | `#FFFFFF`                    | Neutral panels and floating surfaces |
| card-foreground, popover-foreground      | foreground                   | Panel text                           |
| border                                   | `#DFE7E0`                    | Decorative separation                |
| input                                    | `#77867C`                    | Identifiable control boundaries      |
| primary / primary-foreground             | `#087F68` / `#FFFFFF`        | Important actions                    |
| primary-hover / primary-active           | `#096B59` / `#07604F`        | Solid action states                  |
| secondary / secondary-foreground         | `#EAF0EA` / foreground       | Lower-emphasis actions               |
| secondary-hover / secondary-active       | `#DEE8DE` / `#D3E0D4`        | Solid secondary states               |
| accent / accent-foreground               | `#E8F4EE` / `#096B59`        | Selected surfaces                    |
| accent-hover / accent-active             | `#D4EBDF` / `#C4E2D3`        | Selected interaction states          |
| muted / muted-foreground                 | `#F2F5F1` / `#65726B`        | Supporting surfaces and metadata     |
| link / link-hover                        | primary / primary-hover      | Inline navigation and actions        |
| ring / focus-offset                      | primary / `#FFFFFF`          | Keyboard focus                       |
| disabled / disabled-foreground           | `#EDF1ED` / muted-foreground | Readable unavailable controls        |
| selection / selection-foreground         | `#CDEBDE` / foreground       | Text selection                       |
| success, success-foreground              | `#166534`                    | Success text and icons               |
| success-surface / success-border         | `#ECFDF3` / `#9ED9AE`        | Success status surfaces              |
| warning, warning-foreground              | `#92400E`                    | Warning text and icons               |
| warning-surface / warning-border         | `#FFFBEB` / `#EACB77`        | Warning status surfaces              |
| destructive, destructive-text            | `#B42318`                    | Error text and destructive actions   |
| destructive-foreground                   | `#FFFFFF`                    | Filled destructive button text       |
| destructive-hover / destructive-active   | `#961C13` / `#7D170F`        | Solid destructive states             |
| destructive-surface / destructive-border | `#FEF3F2` / `#E8A49E`        | Error messages                       |
| info, info-foreground                    | `#1D4ED8`                    | Informational text and icons         |
| info-surface / info-border               | `#EFF6FF` / `#A7C8F5`        | Informational status surfaces        |

Green brand actions do not imply success. Pair actual status with text and an icon; completed scores include a checkmark and an accessible completion label. Error/warning colors are semantic, not brand accents. Borders used only as decoration need not identify a control; use the stronger `input` token for control outlines. Chart colors are not part of this system.

## Typography and spacing

Geist Sans and Geist Mono are committed local variable fonts (100–900), loaded through `next/font/local`. `--font-geist-sans` maps to Tailwind `--font-sans` and the compatibility `--font-heading`; `--font-geist-mono` maps to `--font-mono`. No font variable refers to itself. Geist Mono is reserved for code; metadata uses Sans. License/provenance live beside the font files. No font download is required for a build.

| Role                        | Mobile / desktop              | Weight                | Line height |
| --------------------------- | ----------------------------- | --------------------- | ----------- |
| Optional landing display    | 36 / 44px                     | 500                   | 1.2         |
| Page heading                | 30 / 36px                     | 500                   | 1.25        |
| Section heading             | 22 / 24px                     | 500                   | 1.3         |
| Component heading           | 18px                          | 500                   | 1.4         |
| Interview question          | 24 / 28–30px                  | 500                   | 1.4         |
| Body, transcripts, feedback | 16px                          | 400                   | 1.7         |
| Controls and labels         | 14px; mobile text inputs 16px | 500; entered text 400 | 1.4         |
| Metadata                    | 12–13px                       | 400                   | 1.5         |

Large headings use `-0.015em` tracking; smaller headings use `-0.01em`. Reading text, labels, and controls have normal tracking. Let headings wrap naturally. Keep reading copy around 60–75 characters where space permits. Timers and scores use tabular numerals; numeric scores may use larger type without becoming page headings.

Use the shared 4, 8, 12, 16, 24, 32, 48, and 64px spacing scale. Labels/helpers have 8px gaps, related controls 12–16px, panels 16–24px padding, and form groups 24px gaps. Radii: 6px small nested elements, 8px controls, 12px panels, 16px dialogs. Default surfaces are flat with subtle borders; dialogs use a restrained shadow. Avoid decorative gradients, glows, or tinted panels throughout the workspace.

## Components and interaction

The existing shadcn/ui Radix sources in `apps/web/components/ui` are the component layer. Compose them with Tailwind and `cn`; extend CVA variants centrally instead of creating a parallel style system.

- **Button:** `default` is primary; `secondary`, `outline`, `ghost`, `destructive`, and `link` provide the remaining treatments. Hover/pressed colors are solid semantic tokens. Standard actions have at least 44px height; compact desktop controls are allowed. Mobile and coarse-pointer targets retain 44px. `loading` disables repeat submission and sets `aria-busy`; the original label/icon retain their width under an overlay spinner. Icon-only actions require an accessible name. Keep labels readable in disabled states without reducing whole-control opacity.
- **Focus:** one solid 2px Jade ring and 3px white offset for primitives; standalone links use a 2px outline with 4px offset. Choice labels own their focus ring so it does not stack with the radio/checkbox ring. Use actual keyboard focus and preserve Radix dialog focus restoration.
- **Forms:** persistent associated labels, 44px text inputs, 16px mobile text entry, `aria-invalid`, and associated helper/error text. Keep entered data after failures. React Hook Form Controllers continue to connect choices to the shared Zod schema. Field validation and server/connection errors remain distinct.
- **Selection:** radio dots and checkbox ticks accompany selected surfaces. Duration toggles add heavier text and an inset indicator as well as Radix's checked state. Navigation uses `aria-current`, heavier text, and a leading border. Links navigate; buttons act.
- **Panels and tables:** use neutral cards only for distinct concepts. Wrap role names, topics, and long messages. Keep row actions visible, with a labeled delete action and confirmation. Table scrolling stays inside its container when necessary.
- **Status:** inline persistent errors/warnings have icons and text. Service warnings use polite status announcements; errors use alerts. Streaming/partial transcript text remains excluded from repeated announcements. Do not put timers in live regions.
- **Dialogs and disclosures:** Radix owns keyboard operation, focus trapping, Escape dismissal, and trigger focus restoration. Dialogs fit the viewport and scroll internally. Long disclosure content grows naturally.
- **Motion:** use specific color/transform transitions, usually 150ms; dialogs use 200ms. No routine bounce or repeated decorative recording animation. Global `prefers-reduced-motion` support collapses animations/transitions; microphone/progress motion can be disabled independently.

## Routes and responsive behavior

| Route                        | Responsibility                                      | Important states                                                         |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `/`                          | Existing headline/action and labeled static example | Example never represents operational data                                |
| `/auth/sign-in`              | Email/account creation and available Google sign-in | Validation, pending, auth/server errors, existing-session redirect       |
| `/dashboard`                 | Real metrics, recent interviews, role shortcuts     | Loading/error, empty history, resume, absent score                       |
| `/interviews/new`            | Role, experience, topics, duration, summary         | Controlled choices, topic validation, unavailable services, create error |
| `/interviews/[id]` preflight | Microphone/speaker check or typed mode              | Permission denied/retry, voice unavailable, pending, resume              |
| `/interviews/[id]` active    | Current question, answer controls, conversation     | Listening, processing, speaking, draft saving, reconnect, finish         |
| `/interviews/[id]/feedback`  | Summary, evidence, scores, next steps               | Generating/failure/retry, insufficient evidence, export, delete          |
| `/history`                   | Search, reopen, delete real interviews              | Loading/error, empty/no matches, pending/failed deletion                 |

Support 360px and wider using the same controls and flow. The existing rail becomes a wrapping top navigation below 761px; panels stack at their existing breakpoints. Allow primary/recovery actions and long content to wrap. Do not hide overflow at document level to mask layout problems. Review at 1280×720, 1440×900, 640px reflow, and 360px mobile, including keyboard use, dialogs, long transcripts, and reduced motion. Target WCAG 2.2 AA: text contrast at least 4.5:1 (large text 3:1), necessary control/focus contrast 3:1, visible focus, logical order, and accessible names.

## Product boundaries and verification

Presentation does not own provider/session state. Preserve authentication, authorization, API contracts, session ownership/persistence, server timing, voice/typed behavior, microphone/audio cleanup, reconnect, transcript/feedback generation, exports, and deletion. Keep real failures/recovery controls; do not fabricate successful feedback or port simulated mockup behavior into production.

Run `bun run format:check`, `bun run check` (types, zero-warning lint, unit/integration tests, production build), and `bun run test:e2e`. Browser journeys use isolated local providers and simulated microphone input; they verify behavior without claiming live-provider or Google OAuth validation. Set `CAPTURE_SCREENSHOTS=1` to refresh route screenshots in `docs/screenshots`.
