---
name: Screenly
description: A calm voice-first interview practice workspace in warm paper, charcoal, and fern.
colors:
  sidebar: "#f4f4f3"
  ink-secondary: "#47453f"
  candidate: "#b8451a"
  candidate-surface: "#fce9df"
  background: "#f4f3ee"
  foreground: "#1c1b19"
  card: "#fff"
  card-foreground: "#1c1b19"
  popover: "#fff"
  popover-foreground: "#1c1b19"
  border: "#e3e0da"
  input: "#918d86"
  primary: "#1f6b45"
  primary-foreground: "#fff"
  primary-hover: "#2a7f52"
  primary-active: "#175236"
  secondary: "#eceae5"
  secondary-foreground: "#1c1b19"
  secondary-hover: "#e3e0da"
  secondary-active: "#d8d5ce"
  accent: "#e2f3e9"
  accent-foreground: "#175236"
  accent-hover: "#d3eadc"
  accent-active: "#a8dcc0"
  muted: "#f7f6f2"
  muted-foreground: "#6b6862"
  link: "#1f6b45"
  link-hover: "#2a7f52"
  ring: "#1f6b45"
  focus-offset: "#fff"
  disabled: "#eceae5"
  disabled-foreground: "#6b6862"
  selection: "#a8dcc0"
  selection-foreground: "#1c1b19"
  success: "#175236"
  success-surface: "#e2f3e9"
  success-border: "#a8dcc0"
  warning: "#8a6217"
  warning-surface: "#fbf1dc"
  warning-border: "#ebd39a"
  destructive: "#a8261f"
  destructive-text: "#a8261f"
  destructive-foreground: "#fff"
  destructive-hover: "#91231d"
  destructive-active: "#7b1b16"
  destructive-surface: "#fce5e2"
  destructive-border: "#f2b8b3"
typography:
  display:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: -0.04em
  headline:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.035em
  title:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.02em
  body:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  navigation:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 13px
    fontWeight: 500
  caption:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 11px
    fontWeight: 400
  transcript:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.7
  metric:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 34px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.04em
rounded:
  checkbox: 4px
  sm: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  "4": 4px
  "6": 6px
  "8": 8px
  "10": 10px
  "12": 12px
  "14": 14px
  "16": 16px
  "20": 20px
  "24": 24px
  "28": 28px
  "32": 32px
  "36": 36px
  "40": 40px
  "44": 44px
  "48": 48px
  "64": 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-ghost:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-link:
    textColor: "{colors.link}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-outline-hover:
    backgroundColor: "{colors.secondary-hover}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-outline-active:
    backgroundColor: "{colors.secondary-active}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-secondary-active:
    backgroundColor: "{colors.secondary-active}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-ghost-hover:
    backgroundColor: "{colors.secondary-hover}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-ghost-active:
    backgroundColor: "{colors.secondary-active}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-destructive-hover:
    backgroundColor: "{colors.destructive-hover}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-destructive-active:
    backgroundColor: "{colors.destructive-active}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 44px
  button-link-hover:
    textColor: "{colors.link-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
    height: 44px
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 44px
  navigation-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.navigation}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 40px
  navigation-item-current:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.navigation}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 40px
  choice:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.navigation}"
    rounded: "{rounded.lg}"
    padding: 8px 12px
    height: 44px
  choice-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.navigation}"
    rounded: "{rounded.lg}"
    padding: 8px 12px
    height: 44px
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    height: 24px
  badge-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    height: 24px
  working-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 20px
  voice-dock:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 8px
  voice-visual:
    rounded: "{rounded.full}"
    size: clamp(144px, min(50vw, calc(100dvh - 550px)), 264px)
---

# Design System: Screenly

## Overview

**Creative North Star: "A calm professional practice workspace"**

Screenly gives spoken technical interview practice a steady working environment. Warm paper holds the page, a cooler sidebar anchors navigation, and white surfaces carry settings, saved sessions, and evidence. Charcoal type and fern actions make the interface feel calm, clear, and professional across landing, authentication, setup, conversation, and feedback.

The voice session is the signature expression: a centered, responsive fern presence, a concise state label, current attributed captions, and a compact control dock. The saved conversation expands inline within the page when requested. Product data and recovery states remain visible and truthful; the landing conversation is explicitly labeled as an example.

This documents the implemented application in `apps/web`, including its shared primitives. The frontmatter is the normative extracted token layer; `apps/web/app/globals.css` remains the runtime source. CSS aliases are resolved to their source values in the frontmatter because token primitives cannot reference one another. The sidecar extends these tokens with motion, depth, responsive metadata, and representative component snippets.

**Key Characteristics:**

- Warm paper, cooler navigation, white working surfaces, and charcoal hierarchy.
- Fern actions and selected controls; restrained candidate and status colors.
- Locally bundled Geist with compact labels and readable conversation text.
- A fixed desktop workspace shell that becomes a focus-managed mobile drawer.
- A voice stage that leads the live session, with recoverable real states and optional transcript reading.

## Colors

The palette is light-only: warm neutral surfaces carry the interface, and semantic accents identify actions, speakers, and status. Refer to the frontmatter keys for exact values; matching values preserve distinct semantic roles.

### Primary

- **Fern action** (`primary`, `primary-hover`, `primary-active`): primary actions, brand icon, actionable links, focus, and the active interviewer presence. `primary-foreground` provides the white action label.
- **Fern selection wash** (`accent`, `accent-foreground`, `accent-hover`, `accent-active`): checked form choices, selected duration controls, interviewer avatars, and the voice orb's illuminated surface.
- **Fern interaction roles** (`link`, `link-hover`, `ring`, `selection`, `selection-foreground`): links, keyboard focus, and selected text retain their own semantic assignments even where values match other fern tokens.

### Secondary

- **Candidate clay** (`candidate`, `candidate-surface`): candidate attribution, microphone avatar, and softly tinted answer bubbles. The clay treatment identifies a speaker; it does not replace the primary action color.

### Tertiary

- **Deep fern success** (`success`, `success-surface`, `success-border`): completed sessions, scored result badges, and live session status.
- **Ochre warning** (`warning`, `warning-surface`, `warning-border`): resumable sessions and connection or availability notices.
- **Brick destructive** (`destructive`, `destructive-text`, `destructive-hover`, `destructive-active`, `destructive-foreground`, `destructive-surface`, `destructive-border`): failed operations, validation, deletion, and the finish control's caution treatment. Solid destructive buttons use white text; soft alerts use destructive ink.

### Neutral

- **Warm paper** (`background`): the page and workspace canvas.
- **Cool sidebar paper** (`sidebar`): full-height navigation and its mobile drawer.
- **White working surface** (`card`, `popover`, `focus-offset`): panels, fields, current navigation item, dialogs, and the focus-ring gap. Their foreground roles resolve to charcoal.
- **Charcoal and quiet ink** (`foreground`, `ink-secondary`, `muted-foreground`): heading/body hierarchy, secondary reading text, and metadata respectively.
- **Subtle layers** (`muted`, `secondary`, `secondary-hover`, `secondary-active`): table headers, subdued panels, secondary buttons, and hover/pressed states.
- **Dividers and field strokes** (`border`, `input`): quiet panel structure versus stronger input boundaries. Fields use the input stroke so their editable shape remains apparent.
- **Disabled roles** (`disabled`, `disabled-foreground`): inactive controls retain a visible neutral fill and readable muted label rather than relying on opacity alone.

**The Semantic First Rule.** Apply the existing semantic role for an action, state, or surface; use the shared tokens rather than introducing a parallel palette per screen.

## Typography

**Display Font:** Geist, with Arial and sans-serif fallbacks.

**Body Font:** Geist, with the same fallbacks.

**Mono Font:** Geist Mono is bundled with a monospace fallback; sampled shipped screens use proportional Geist and tabular numerals rather than a separate mono hierarchy.

Both variable fonts are loaded locally through `next/font/local` from `apps/web/app/fonts`, with weights spanning 100–900 and swap display. No remote font request is required. Headings use the same family as the interface, with modest negative tracking and medium or semibold weights.

### Hierarchy

- **Display:** the landing headline uses the frontmatter display role, reducing to (46px) below the small breakpoint. Its deliberately short line length belongs to the landing composition.
- **Headline:** the workspace route title appears once as a (14px), medium-weight h1 in the top bar; do not repeat it in the content. The global headline fallback remains (28px / 32px). Authentication uses its own (26px / 28px) heading, and preflight uses a (26px) task heading.
- **Title:** section headings use the title role; tertiary headings use (16px), semibold, with (1.4) line height.
- **Body:** the base body role is used for general reading; most interface descriptions use the body-small role. Page descriptions stay within (65ch), with narrower copy on landing and authentication.
- **Label:** buttons use the label role. Navigation and choice labels use the navigation role; metadata and status badges use compact caption sizing. Badge and attribution labels increase to medium weight.
- **Transcript:** saved turns use the transcript role, preserve line breaks, wrap long content, and stay within (75ch).
- **Metric:** repeated overview values use the metric role and tabular numerals. Timers and timestamps also use tabular numerals to avoid shifting as values change.

**The Local Type Rule.** Extend the locally bundled Geist hierarchy across screens; retain the readable transcript role and visible label hierarchy.

## Layout

At the medium breakpoint (768px), the fixed sidebar is (256px) wide and collapses to a (72px) icon rail. The main content follows the same animated width variable over (240ms), using `cubic-bezier(0.22,1,0.36,1)`; reduced motion switches instantly. Icons stay anchored to the leading edge during the fold. Manual collapse is stored on this device. A live interview temporarily defaults to the rail, allows manual expansion during the session, and restores the usual preference when leaving. The brand row and top bar remain (64px) high. The top-bar panel control stays available in both desktop states.

Navigation rows are (40px) on fine-pointer desktop and at least (44px) on small screens or coarse pointers. The top workspace menu and search are fixed; the grouped navigation scrolls independently; utilities and the account footer stay pinned. Below (768px), a left Radix sheet uses a compact workspace header with its own close button and retains the same full navigation. Selecting a route closes the drawer. Escape and focus restoration work for the drawer, menus, and search. The route h1 remains only in the top bar. Do not add the removed tagline or decorative logo/active-navigation dots.

Regular workspace content is centered within (1160px), with horizontal padding progressing through (16px), (24px), (32px), and (40px) as space grows. Voice content uses a wider (1280px) ceiling and (16px / 32px) padding. Most panel padding is (20px / 24px), repeated item gaps are (8px–16px), and section separation is commonly (28px–32px). These are compositions built from the extracted spacing steps, rather than a universal equal-gap grid.

Overview metrics become three columns at (640px); role shortcuts become three columns at (1024px). Setup adds a (300px) summary column at (1280px). History keeps the interview and status visible, adds experience at (1024px), and places the date in its own column at (1100px); below that the date remains beneath the interview label. Landing becomes a two-column layout at (1024px), while authentication reveals its supporting column at the same breakpoint.

The live interview centers its voice stage in the remaining workspace width. Its column has a minimum height of `calc(100dvh - 164px)` on mobile and `calc(100dvh - 144px)` from 640px and places the dock below a flexible centered stage. The visual uses `clamp(144px, min(50vw, calc(100dvh - 550px)), 264px)`, adapting to both width and height. The voice page has no top padding. A compact, bordered session-details row sits directly below the top bar, with 16px before the stage and no stacked section margins. Current captions remain within (540px). The dock is in document flow, so short screens can scroll without covering the stage or controls.

Touch controls keep at least (44px) target height on small screens and coarse pointers, including icon actions and the caption/transcript controls. Compact (32px / 36px) variants are confined to larger fine-pointer layouts. Form choices and accordion triggers retain (44px) minimum height.

## Elevation & Depth

Working panels are primarily flat: white fill, a quiet border, and tonal separation from the paper canvas. Small shadows distinguish action surfaces and current navigation. Stronger elevation belongs to temporary sheets and the live control dock. The voice orb uses its own soft shading and gradients to communicate presence, rather than turning ordinary panels into glass or decorative gradients.

### Shadow Vocabulary

- **Primary action:** `inset 0 1px 0 rgb(255 255 255 / 0.08), 0 1px 2px rgb(20 19 18 / 0.08)` gives the fern button a slight surface edge.
- **Current navigation:** `0 1px 2px rgb(20 19 18 / 0.03)` separates the selected white row from the sidebar.
- **Voice dock:** `0 5px 20px rgb(20 19 18 / 0.09), 0 1px 3px rgb(20 19 18 / 0.06)` lifts the control group from the page.
- **Small temporary surface:** the Tailwind small shadow, used by confirmation dialogs and transcript jump-to-latest, is `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`.
- **Sheet:** the Tailwind extra-large shadow is `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`. Navigation/transcript overlays use charcoal at (25%); confirmation overlays use (40%).

**The Working Surface Rule.** Use borders and tonal separation for ordinary panels; reserve the dock and sheet shadows for their implemented roles.

## Shapes

Controls and navigation use the medium radius; smaller focus outlines use the small radius. Choice labels and many icon tiles use the large radius. Working panels, the dock, dialogs, and transcript bubbles use the extra-large radius. Checkboxes use the dedicated compact radius, while badges, speaker avatars, and the voice visual are circular or pill-shaped.

The approved direction mentioned (12px) panels; the implemented shared extra-large radius is (16px), and the finished panels use that value. This document records the shipped refinement rather than restating the earlier measurement. Transcript bubbles keep a smaller upper corner toward their speaker, and live turns add a dashed input-colored border. Borders are generally (1px), with selected choices using the primary color rather than thicker geometry.

## Components

### Buttons

Buttons are compact, calm, and explicit. The default size uses medium corners, a minimum height of (44px), padding (8px 16px), a (14px) medium label, and (16px) icons. The large size is at least (48px) high with (12px 24px) padding. Labels can wrap.

Primary, outline, secondary, ghost, destructive, and link variants are extracted in the frontmatter. Primary and destructive variants have distinct hover and pressed colors; outline, secondary, and ghost variants move through neutral hover/pressed layers. Links use the link roles and underline on hover. Buttons use color transitions (150ms); keyboard focus has a (2px) fern ring with a (3px) white offset. Disabled controls use the explicit disabled roles. Loading preserves the label's footprint, places a spinner centrally, disables duplicate input, and sets `aria-busy`.

### Chips and choices

Status badges are compact pills with caption text, gentle padding, and meaningful status words or icons. Completed/live badges use success roles, resumable sessions use warning roles, and ready sessions use an outline. Color supplements the written status.

Role, experience, and topic choices are bordered white labels around controlled radio buttons or checkboxes. Checked choices use the fern wash, fern text, and primary stroke; hover and pressed states retain their selected identity. Duration toggles use the same selection roles with semibold text and a small inset lower rule. Choices wrap to available width and show focus around the complete label.

### Cards / Containers

White working panels use a quiet border and the extra-large radius. Overview metric panels use (20px) padding; forms and reviews commonly use (20px / 24px). Table containers clip their rounded boundary. The shared Card primitive uses (24px) vertical padding and content spacing, with optional muted footers. Content regions are divided with borders and tonal headers, without a repeated floating-card shadow.

### Inputs / Fields

Text fields are white, (44px) high, with medium corners, a stronger input stroke, and (8px 12px) padding. Field text is (16px) on narrow screens and (14px) from (768px), with muted placeholders and a fern caret. Focus uses the shared ring and offset. Invalid fields use a destructive border and associated field error; disabled fields use neutral disabled roles. Field labels, descriptions, and form choices remain connected to the underlying controls.

### Navigation

The sidebar follows the supplied Vercel reference's firm hierarchy within Screenly's warm-paper palette: workspace switcher, bordered search, Workspace / Practice / Insights groups, fine dividers, utility links, and a pinned account menu with notifications. Current routes use a white bordered row, charcoal text, fern icon, and a restrained Motion selection transition. The compact rail retains labeled links and keyboard/hover tooltips.

**Search workspace** opens a compact Radix dialog from the search control or Ctrl/Cmd K. Its visible content is one 48px input row with an Esc control, followed by plain leading-icon destination rows (40px desktop / 44px touch). The panel is capped at 520px, with 6px list padding and no visible heading, descriptions, icon tiles, or instruction footer. Title and keyboard instructions remain available to assistive technology. Filtered destinations support arrow keys, Enter, Escape, input focus, and focus restoration. The removed sidebar practice callout stays removed. The account menu contains the real user name/email, settings links, and sign-out. The workspace menu identifies the current personal workspace; team creation is explicitly in preview. The preview destinations are Question library, Practice plans, Progress, and Saved answers. They contain sample prompts or honest preview states, without fabricated personal statistics. Settings includes the real local sidebar preference, and Help documents actual interactions.

### Sheets and confirmations

Sheets are square-edged, full-height surfaces with a labeled (44px) close control and a charcoal scrim. The mobile navigation uses its workspace header instead of a second title block. Navigation opens on the left at its narrower width. The live transcript is an inline disclosure, not a sheet or modal. Sheet motion lasts (200ms). Radix provides dialog semantics and focus management. Confirmation dialogs fit within viewport margins, scroll when necessary, and present a clear cancel/confirm pair; deletion uses the destructive action variant.

### Voice stage, captions, and control dock

The responsive circular voice presence sits above its readable state label and hint. Fern light and ribbon layers animate only during listening, thinking, and speaking; muted, paused, attention, and disconnected modes switch to neutral shading. The microphone meter reflects actual input, while the decorative visual is hidden from assistive technology. The state label is announced through `role="status"`.

The full current question is readable below the orb as LLM text arrives and remains visible after it is saved. Candidate text follows real partial transcription. There is no trailing-word limit, progressive hiding, or caption-controlled audio timing. **You** uses candidate clay and **Interviewer** uses fern.

While audio plays, a gentle fern highlight moves through the visible words. This is a visual speaking indicator, not word alignment. It never delays, splits, flushes, resamples, or schedules the provider's speech. Reduced motion uses a steady highlight. Replay displays the full saved question immediately; interruption stops the highlight and retains readable text. Caption updates use `aria-live="off"`. Deepgram audio is forwarded as each frame arrives, with one synthesis flush for the complete response.

The white dock groups **Mute / Unmute**, **Interrupt**, and **Finish interview**, with a divider before finish. Mute reflects its pressed state; interrupt is available while speaking or thinking. Finish opens a confirmation before ending the interview and generating feedback. The narrow layout shortens the finish label while retaining its accessible name.

The orb uses a (5s) breathing cycle, (16s) surface drift, and (7s) ribbon motion; speaking and thinking shorten surface drift to (7s) and (5s). Input scale responds over (160ms ease-out). The dock enters from (10px) below over (300ms), with `cubic-bezier(0.16, 1, 0.3, 1)`. MotionConfig respects the user's reduced-motion preference; CSS suppresses ongoing visual animation and input scaling, reduces transitions globally.

### Transcript

The full live conversation starts collapsed behind **Transcript** in the top bar. It expands as a normal page column beside the voice stage at (1024px) and wider, separated by a hairline; smaller layouts stack it below the stage and scroll it into view. It does not overlay or trap focus. Closing restores the trigger and the previous scroll position; Escape works while reading the inline transcript. Live read-back uses flat left-aligned text rows with speaker labels, real timestamps, and interruption status, matching the supplied reference. Saved feedback retains its existing message bubbles. The reading viewport follows new content only while the reader is near the latest turn; scrolling back reveals **Jump to latest**. An empty conversation explains when turns will appear. Saved additions are politely announced; partial and streaming message copies are hidden from the accessibility tree. The transcript accepts no typed answer.

### Preflight

Audio setup sits directly on the paper canvas, without an enclosing card. A short task heading precedes two separated rows for microphone input and speaker testing, followed by optional recording and the start action. Device checks and errors remain real; no successful check is inferred from presentation alone.

### Loading, empty, and error states

Pages use a labeled status and neutral skeletons while real data loads. The overview displays real counts, shows a dash when no scored average exists, and presents **No interviews yet** with a practice action for an empty history. Search has its own no-matching-interviews result. Failed requests use destructive alerts with the actual error and a retry action. Voice errors expose the appropriate reconnect, microphone, speech, or interviewer recovery action; a disconnection notice explains that the conversation is saved. Preflight provides real microphone/speaker checks before starting. Feedback generation has explicit pending and failed states, keeps the saved transcript available, and exposes **Retry feedback** on failure.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens and the shared interaction states across every screen.
- **Do** retain the fixed desktop sidebar and focus-managed mobile drawer at the implemented navigation breakpoint.
- **Do** keep live voice centered, current captions concise, and the full transcript available on request.
- **Do** preserve visible focus, labeled controls, mobile touch targets, and reduced-motion behavior.
- **Do** show real loading, empty, saved, failed, and recovery states alongside real product data.
- **Do** use the local Geist fonts and the extracted readable transcript hierarchy.

### Don't:

- **Don't** reintroduce the retired Jade presentation or a dark theme into this light-only visual world.
- **Don't** add a persistent large question panel or permanently expanded transcript to the live voice stage.
- **Don't** introduce fabricated production metrics, sessions, or feedback; keep the landing example explicitly labeled.
- **Don't** use candidate clay or status colors as competing primary action palettes.
- **Don't** make decorative motion necessary to understand session state or announce every partial spoken word.
