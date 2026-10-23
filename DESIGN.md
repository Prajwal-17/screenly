---
name: Screenly
description: A calm voice-first interview practice workspace in pale paper, charcoal, and fern.
colors:
  choice-border: "#697d60"
  sidebar: "#f0f2ee"
  ink-secondary: "#414a42"
  candidate: "#b8451a"
  candidate-surface: "#fce9df"
  background: "#fafbf8"
  foreground: "#202820"
  card: "#fff"
  card-foreground: "#202820"
  popover: "#fff"
  popover-foreground: "#202820"
  border: "#dce2d9"
  input: "#879182"
  primary: "#245c3c"
  primary-foreground: "#fff"
  primary-hover: "#1c4c30"
  primary-active: "#163d27"
  secondary: "#edf0e9"
  secondary-foreground: "#202820"
  secondary-hover: "#dce2d9"
  secondary-active: "#d2dacd"
  accent: "#edf2e9"
  accent-foreground: "#163d27"
  accent-hover: "#e0e9d9"
  accent-active: "#c6d7bb"
  muted: "#f1f4ed"
  muted-foreground: "#626c5e"
  link: "#245c3c"
  link-hover: "#1c4c30"
  ring: "#245c3c"
  focus-offset: "#fff"
  disabled: "#edf0e9"
  disabled-foreground: "#626c5e"
  selection: "#c6d7bb"
  selection-foreground: "#202820"
  success: "#163d27"
  success-surface: "#edf2e9"
  success-border: "#c6d7bb"
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
  workspace-heading:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.035em
  workspace-heading-mobile:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.035em
  micro-label:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.4
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
    fontSize: 14px
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
  live-question:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 28px
    fontWeight: 450
    lineHeight: 1.45
    letterSpacing: -0.028em
  live-state:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  live-transcript:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.8
  metric:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 24px
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
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 44px
  choice-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    typography: "{typography.navigation}"
    rounded: "{rounded.md}"
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
    rounded: "{rounded.lg}"
    padding: 6px
  voice-visual:
    rounded: "{rounded.full}"
    size: clamp(144px, min(50vw, calc(100dvh - 550px)), 264px)
  porcelain-orb:
    width: 100%
    height: 100%
---

# Design System: Screenly

## Overview

**Creative North Star: "A calm professional practice workspace"**

Screenly gives spoken technical interview practice a steady working environment. Pale paper holds the page, a sage-gray sidebar anchors navigation, and white surfaces distinguish controls and temporary panels. Open sections carry saved sessions and evidence; muted surfaces group the session summary and next practice steps. Charcoal type and fern actions make the interface feel calm, clear, and professional across landing, authentication, setup, conversation, and feedback.

The voice session is the signature expression: a centered, responsive Porcelain presence above a concise state label, the persistent current question, and a compact control dock. A separate clay caption carries the candidate's live answer. The saved conversation starts open beside the stage on desktop and below it on smaller screens, and can be closed. Product data and recovery states remain visible and truthful; the landing conversation is explicitly labeled as an example.

This documents the implemented application in `apps/web`, including its shared primitives. The frontmatter is the normative extracted token layer; `apps/web/app/globals.css` remains the runtime source. CSS aliases are resolved to their source values in the frontmatter because token primitives cannot reference one another. The sidecar extends these tokens with motion, depth, responsive metadata, and representative component snippets.

**Key Characteristics:**

- Pale paper, sage-gray navigation, restrained white surfaces, and charcoal hierarchy.
- Fern actions and selected controls; restrained candidate and status colors.
- Locally bundled Geist with compact labels and readable conversation text.
- A fixed desktop workspace shell that becomes a focus-managed mobile drawer.
- A voice stage that leads the live session, with recoverable real states and a default-open transcript.

## Colors

The palette is light-only: pale neutral surfaces carry the interface, and semantic accents identify actions, speakers, and status. Refer to the frontmatter keys for exact values; matching values preserve distinct semantic roles.

### Primary

- **Fern action** (`primary`, `primary-hover`, `primary-active`): primary actions, brand icon, actionable links, focus, and interviewer attribution. `primary-foreground` provides the white action label.
- **Quiet sage selection wash** (`accent`, `accent-foreground`, `accent-hover`, `accent-active`): checked form choices, selected duration controls, interviewer avatars, the current transcript question, and the static authentication orb.
- **Fern interaction roles** (`link`, `link-hover`, `ring`, `selection`, `selection-foreground`): links, keyboard focus, and selected text retain their own semantic assignments even where values match other fern tokens.

### Secondary

- **Candidate clay** (`candidate`, `candidate-surface`): candidate attribution, microphone avatar, and softly tinted answer bubbles. The clay treatment identifies a speaker; it does not replace the primary action color.

### Tertiary

- **Deep fern success** (`success`, `success-surface`, `success-border`): completed sessions, scored result badges, and live session status.
- **Ochre warning** (`warning`, `warning-surface`, `warning-border`): resumable sessions and connection or availability notices.
- **Brick destructive** (`destructive`, `destructive-text`, `destructive-hover`, `destructive-active`, `destructive-foreground`, `destructive-surface`, `destructive-border`): failed operations, validation, deletion, and the finish control's caution treatment. Solid destructive buttons use white text; soft alerts use destructive ink.

### Neutral

- **Pale paper** (`background`): the page and workspace canvas.
- **Sage-gray sidebar paper** (`sidebar`): full-height navigation and its mobile drawer.
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
- **Headline:** regular workspace pages use a (30px / 36px), semibold h1 in the content. The top bar carries a compact route context label, not a second heading. Live and preflight layouts retain their dedicated heading treatment. The global headline fallback remains (28px / 32px). Authentication uses a route-specific semibold (46px / 72px) headline, switching at (640px), with (1.02) line height and (-0.04em) tracking; preflight uses a (26px) task heading. Profile onboarding uses the compact route heading documented under Components.
- **Title:** section headings use the title role; tertiary headings use (16px), semibold, with (1.4) line height.
- **Body:** the base body role is used for general reading; most interface descriptions use the body-small role. Page descriptions stay within (65ch), with narrower copy on landing and authentication.
- **Label:** buttons use the label role. Navigation and choice labels use the (14px) label role; metadata and status badges use compact caption sizing. Badge and attribution labels increase to medium weight.
- **Transcript:** saved feedback turns use the transcript role, preserve line breaks, wrap long content, and stay within (75ch). Live transcript turns use (14px) chat text at (1.75) line height, with a (16px) medium-weight heading and no visible speaker labels or timestamps.
- **Live question and state:** the live-question role keeps the full current question prominent in the open stage. Its nominal sizes are (28px), (24px) for long prompts or short windows, and (23px) on narrow screens. It fits down to (14px) when a long question needs the available space. The live-state role stays quieter beneath the orb. These sizes belong to the approved studio composition; they do not change the general page-heading scale.
- **Metric:** secondary overview values use (24px) type and tabular numerals. Timers and timestamps also use tabular numerals to avoid shifting as values change.

**The Local Type Rule.** Extend the locally bundled Geist hierarchy across screens; retain the readable transcript role and visible label hierarchy.

## Layout

At the medium breakpoint (768px), the fixed sidebar is (256px) wide and collapses to a (64px) icon rail. The main content follows the same animated width variable over (240ms), using `cubic-bezier(0.22,1,0.36,1)`; reduced motion switches instantly. Icons stay anchored to the leading edge during the fold. Manual collapse is stored on this device. A live interview temporarily defaults to the rail, allows manual expansion during the session, and restores the usual preference when leaving. The brand row and top bar are (56px) high. The top-bar panel control stays available in both desktop states.

Expanded navigation rows are (40px) on fine-pointer desktop and at least (44px) on small screens or coarse pointers. Collapsed controls use centered (44px) squares in the (64px) rail, with plain search, quiet group gaps, a white active square, and a (28px) account avatar. The collapsed inner column has a fixed width during the Motion fold so its icons stay anchored. The top workspace menu and search are fixed; the core navigation, Settings, and Coming soon disclosure scroll together; only the account footer stays pinned. Below (768px), a left Radix sheet uses a compact workspace header with its own close button and retains the same full navigation. Selecting a route closes the drawer. Escape and focus restoration work for the drawer, menus, and search. The regular route h1 leads the content, while the top bar remains compact. Do not add the removed tagline or decorative logo/active-navigation dots.

Regular workspace content is centered within (1080px), with horizontal padding progressing through (20px), (32px), (40px), and (56px) as space grows. Voice content uses a wider (1280px) ceiling and (16px / 32px) padding. Most panel padding is (20px / 24px), repeated item gaps are (8px–16px), and section separation is commonly (28px–32px). These are compositions built from the extracted spacing steps, rather than a universal equal-gap grid.

Overview starts with three full-width practice rows. Statistics appear only after a session exists and become three columns at (640px), below the practice choices. Empty history is a compact text section without a duplicate primary action. Setup adds a (300px) summary column at (1280px). History keeps the interview and status visible, adds experience at (1024px), and places the date in its own column at (1100px); below that the date remains beneath the interview label. Landing becomes a two-column layout at (1024px). Authentication stays a centered single column capped at (520px), with (24px) horizontal page padding and the brand/home link above it; the open composition has no enclosing card or marketing footer.

The active interview takes the full dynamic viewport (`100dvh`), without the workspace header or sidebar. A (44px) navigation trigger opens the workspace drawer from the compact (56px) live toolbar; Ctrl+B remains available. Preflight and saved-session recovery retain the ordinary workspace. The conversation and its compact controls occupy one column while the transcript spans the full available height beside them, with no document scrolling or footer reserved beneath the transcript. The live toolbar keeps session details on the left, with the Transcript toggle followed by elapsed/total time at the far right. The timer uses the shared shadcn Badge; controls, menus, separators, alerts, navigation drawer, and finish confirmation use the shared shadcn components.

The stage centers the Porcelain orb, state, persistent question, and candidate caption. The orb yields height before the question or controls: its flexible area is capped at `min(36dvh, 360px)`, reducing for short and narrow layouts. The question stays within (800px), normally (28px) or (24px) for long prompts, and fits down to (14px) only when content and available height require it; its complete text is retained. The candidate caption follows its latest two lines while its full text remains in the transcript. When a long question or recovery notice needs the space on a short, narrow screen, the duplicate candidate caption yields to the open transcript; in very short windows or narrow, short phones with long questions, the decorative orb also yields to reading. Secondary hints disappear when space is limited. Mute, Replay, Audio, and Finish share one persistent compact dock.

The transcript starts open beside the stage in a column clamped between (280px) and (400px), with a leading hairline and (16px–26px) padding. Below (900px), when the window is taller than (500px), it becomes a bounded lower panel taking roughly (24dvh), between (100px) and (220px), compacting to (88px) for long questions on the smallest phones. Its history scrolls within the panel while the page and controls stay still. In windows no wider than (767px) and no taller than (500px), the conversation opens first and the transcript toggle switches the reading area between conversation and transcript; the dock remains available in both views. Opening or closing the transcript never scrolls the page.

Touch controls keep at least (44px) target height on small screens and coarse pointers, including icon actions and the caption/transcript controls. Compact (32px / 36px) variants are confined to larger fine-pointer layouts. Form choices and accordion triggers retain (44px) minimum height.

## Elevation & Depth

Working panels are primarily flat: white fill, a quiet border, and tonal separation from the paper canvas. Primary actions and current navigation are flat, with no decorative shadows. Stronger elevation belongs to temporary sheets; live controls sit directly on the paper canvas. The voice orb uses its own soft shading and gradients to communicate presence, rather than turning ordinary panels into glass or decorative gradients.

### Shadow Vocabulary

- **Primary action:** flat fern fill; hover and pressed colors provide feedback.
- **Current navigation:** a flat white row separates the active destination from the sidebar.
- **Small temporary surface:** the Tailwind small shadow, used by confirmation dialogs and transcript jump-to-latest, is `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`.
- **Sheet:** the Tailwind extra-large shadow is `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`. Navigation overlays use charcoal at (25%); confirmation overlays use (40%).

**The Working Surface Rule.** Use borders and tonal separation for ordinary panels; reserve sheet shadows for temporary surfaces.

## Shapes

Controls and navigation use the medium radius; smaller focus outlines use the small radius. Choice labels share the medium control radius; icon tiles and live transcript turn treatments use the large radius. The live microphone, replay, Audio, and finish controls use pill corners. Working panels, dialogs, and saved transcript bubbles use the extra-large radius. Checkboxes use the dedicated compact radius, while badges, speaker avatars, and the voice visual are circular or pill-shaped.

The approved direction mentioned (12px) panels; the implemented shared extra-large radius is (16px), and the finished panels use that value. This document records the shipped refinement rather than restating the earlier measurement. Saved transcript bubbles keep a smaller upper corner toward their speaker. Live answers and the current question use large corners and quiet speaker-colored borders. Borders are generally (1px), with selected choices using the dedicated choice-border color rather than thicker geometry.

## Components

### Buttons

Buttons are compact, calm, and explicit. The default size uses medium corners, a minimum height of (44px), padding (8px 16px), a (14px) medium label, and (16px) icons. The large size is at least (48px) high with (12px 24px) padding. Labels can wrap.

Primary, outline, secondary, ghost, destructive, and link variants are extracted in the frontmatter. Primary and destructive variants have distinct hover and pressed colors; outline, secondary, and ghost variants move through neutral hover/pressed layers. Links use the link roles and underline on hover. Buttons use color transitions (150ms); keyboard focus has a (2px) fern ring with a (3px) white offset. Disabled controls use the explicit disabled roles. Loading preserves the label's footprint, places a spinner centrally, disables duplicate input, and sets `aria-busy`.

### Chips and choices

Status badges are compact pills with caption text, gentle padding, and meaningful status words or icons. Completed/live badges use success roles, resumable sessions use warning roles, and ready sessions use an outline. Color supplements the written status.

Role, experience, and topic choices are bordered white labels around controlled radio buttons or checkboxes. Checked choices use a quiet sage wash, charcoal text, and the choice-border stroke; hover and pressed states retain their selected identity. Duration toggles use the same selection roles and medium text, without a lower rule. Choices wrap to available width and show focus around the complete label.

### Cards / Containers

White working panels use a quiet border and the extra-large radius. Overview metrics sit on the page between dividers. Setup fields and feedback evidence use open sections. The session summary and next steps use muted 16px-radius surfaces. History tables have straight divider boundaries. The shared Card primitive uses (24px) vertical padding and content spacing, with optional muted footers. Content regions are divided with borders and tonal headers, without a repeated floating-card shadow.

### Inputs / Fields

Text fields are white, (44px) high, with medium corners, a stronger input stroke, and (8px 12px) padding. Field text is (16px) on narrow screens and (14px) from (768px), with muted placeholders and a fern caret. Focus uses the shared ring and offset. Invalid fields use a destructive border and associated field error; disabled fields use neutral disabled roles. Field labels, descriptions, and form choices remain connected to the underlying controls.

### Authentication

The short “Think out loud.” headline pairs charcoal with fern beside the static fern VoiceVisual decoration, (112px) wide below (640px) and (168px) above it. This is distinct from the live Porcelain orb. The decorative orb is hidden from assistive technology and has no animation or input response on this route. A short sign-in line leads to the full-width white outline **Continue with Google** action, at least (52px) high with (20px) horizontal padding, followed by one brief account-creation note. Shared focus, loading, disabled, and error treatments remain in use; unavailable sign-in and failed availability checks show explicit messages, with retry for the latter.

Production presents Google-only authentication through Better Auth. An opt-in **Local development** email form follows a dashed divider only when the frontend runs in development and the backend reports the local capability. Its labeled shared input and secondary action remain compact; the local form is excluded from production builds.

### Profile onboarding

New Google accounts enter onboarding immediately while account and profile checks run in the background. Early edits survive profile hydration. Finishing or skipping setup shows **Setting up your workspace…** while saving and preparing workspace data, without an artificial delay. Failed saves restore the editable draft.

`/onboarding` extends the existing warm paper, charcoal, fern, local Geist, and shared shadcn/Radix components. A viewport-height shell places Brand and **Skip for now** in a (72px) header above a working area capped at (1120px). From (768px), a (216px) step rail sits beside one white, bordered panel with extra-large corners. Its six destinations are **Get started**, **About you**, **Your links**, **Projects**, **Practice focus**, and **Review**. The current row has a fern wash and filled fern icon circle; earlier steps use checks. Below (768px), the rail is hidden and the panel header carries the step name, count, and save status.

The panel separates a compact task header, independently scrolling body, and pinned action footer with quiet borders. The header includes a thin fern progress bar, a semibold task heading at (24px / 28px) across the (640px) breakpoint, (1.25) line height, and (-0.03em) tracking, followed by muted (14px) copy. This compact heading is specific to this route. Panel padding moves from (20px) to (32px) horizontally at (640px); field groups commonly use (20px) gaps. The working body retains scrolling on short and narrow screens while the task header and actions stay reachable. **Back** and **Continue** occupy opposite footer edges; the final action is **Finish setup**.

Import uses shared **Resume**, **Profile link**, and **Paste text** tabs: a neutral rounded track with a white active tab and visible keyboard focus. The resume dropzone uses a dashed input-colored border, muted surface, (16px) corners, and a plain upload icon, accepting PDF, DOCX, DOC, or TXT up to (5 MB). The other tabs expose a labeled public-profile URL field or textarea. A short disclosure explains that the configured AI provider receives the source and the original file or text is not stored. **Enter details manually** remains in the footer. During import, an inline three-stage list shows receiving, extraction, and AI organization with checks, an active spinner, and **Cancel import**; duplicate actions are disabled. URL validation stays with the field. Import and availability failures show explicit recovery actions, including **Retry analysis** and **View extracted text** when extraction succeeded.

AI results remain a separate approval state headed **Here’s what we found.** Shared tabs switch between a divided **Profile preview** with selectable field groups and the exact **Formatted JSON** in a muted monospace block. Source and character-count context precede the results. **Discard** and **Approve & continue** stay pinned; approval is disabled without a selected group. Only approval applies the selected suggestions to the editable profile. The original source remains ephemeral; unapproved formatted suggestions and selected groups belong to the resumable draft.

About groups name and optional location into two columns from (640px), then headline and an optional background textarea. Links groups GitHub, LinkedIn, portfolio, and repeatable labeled extra links. Projects use flat divided rows with count, **Add project**, and labeled edit/remove actions; the empty state uses one dashed boundary. The shared project dialog captures name, description, contribution, technologies, live URL, and repository, with a pinned **Done** action and changes saved as typed. Practice focus uses the existing wrapping `ChoiceGroup` radio choices for role and experience, arranged in two columns from (1280px), followed by removable fern technology chips, an add field, wrapping suggestions, and an optional goal field. Final review uses divided sections with quiet **Edit** actions. Shared inputs, textarea, radio choices, checkboxes, tabs, progress, dialog, and buttons retain the established focus, disabled, loading, and error treatments.

Draft status stays visible in the desktop rail or mobile panel header as **Saving changes…**, **All changes saved**, or **Sync failed** with **Retry**. Incomplete fields, links, projects, current step, and pending suggestion selections survive return visits through account autosave and device recovery. Initial profile loading and failure have explicit status and retry. Settings retains the open saved-profile summary and **Edit profile**; editing reuses these six steps with **Save & exit** and a final **Save profile** action. Saved role and experience continue to seed interview setup while preserving explicit setup choices.

### Navigation

The sidebar prioritizes Overview, New interview, History, and Settings in one group. Question library, Practice plans, Progress, and Saved answers live under a native Coming soon disclosure, which opens automatically on those routes. In the compact rail, More destinations opens workspace search; every destination remains searchable. Selected rows use white surfaces and a fern icon, without borders or shadows. The workspace menu, account menu, notifications, keyboard shortcuts, and focus-managed mobile drawer remain available.

**Search workspace** opens a compact Radix dialog from the search control or Ctrl/Cmd K. Its visible content is one 48px input row with an Esc control, followed by plain leading-icon destination rows (40px desktop / 44px touch). The panel is capped at 520px, with 6px list padding and no visible heading, descriptions, icon tiles, or instruction footer. Title and keyboard instructions remain available to assistive technology. Filtered destinations support arrow keys, Enter, Escape, input focus, and focus restoration. The removed sidebar practice callout stays removed. The account menu contains the real user name/email, settings links, and sign-out. The workspace menu identifies the current personal workspace; team creation is explicitly in preview. The preview destinations are Question library, Practice plans, Progress, and Saved answers. Each one shows a single coming-soon state with an honest description of the planned content and a real next action, without sample prompts or fabricated personal statistics. Settings includes the real local sidebar preference. Help & feedback is removed from sidebar navigation and command search.

### Sheets and confirmations

Sheets are square-edged, full-height surfaces with a labeled (44px) close control and a charcoal scrim. The mobile navigation uses its workspace header instead of a second title block. Navigation opens on the left at its narrower width. The live transcript is an inline disclosure, not a sheet or modal. Sheet motion lasts (200ms). Radix provides dialog semantics and focus management. Confirmation dialogs fit within viewport margins, scroll when necessary, and present a clear cancel/confirm pair; deletion uses the destructive action variant.

### Voice stage, captions, and control dock

The responsive Porcelain orb sits above a readable state label, the full current question, and a quiet hint. Its glazed ceramic body blends warm ivory, deep fern, and soft mint from the existing background, primary, and accent tokens. Slow curved folds move beneath a stationary sheen; a trace of candidate clay warms the material while answering without replacing fern. The orb is hidden from assistive technology; the separate state label is announced through `role="status"`. Inactive states gently desaturate the same material.

The full current question is readable as LLM text arrives and remains visible while the candidate answers. Real partial transcription appears as plain spoken text in a separate softly tinted clay caption beneath the question and hint, without a speaker label or microphone header. There is no trailing-word limit, progressive hiding, or caption-controlled audio timing. Transcript speaker labels retain candidate clay for **You** and fern for **Interviewer**.

Partial words render directly from provider updates. Question fitting reacts to caption height changes rather than measuring the stage on every word. A 640ms local silence fallback ends speech, while Flux can detect natural completion earlier. Technical follow-ups may begin preparing on eager turn events, but remain invisible and inaudible until final confirmation; resumed speech discards the draft. Transcription warms in the last 2.5 seconds of question playback, accounting for playback speed and pause, to prepare for the next answer.

Conversation remains flexible across pauses. Local confirmed speech stops playback and cancels the pending interviewer request immediately; candidates may continue, correct themselves, or change direction across several transcription segments. Those segments remain saved and are considered together in the next reply. An old cancelled reply’s late history update must not replace the candidate’s current words.

AI Elements **MessageResponse** renders the current question and interviewer transcript with Streamdown, including incomplete Markdown during generation. Candidate speech stays literal text inside **Message** and **MessageContent**. The thinking status uses AI Elements **Shimmer** in fern, with a static label for reduced motion. New question text enters with one (500ms) left-to-right clip reveal while it streams in, using the normal foreground throughout. The reveal runs independently of audio and pauses with the session; saved text and replays remain fully readable. Reduced motion shows the text immediately. There is no word-by-word highlighting or estimated speech alignment. These presentation components never schedule or delay audio. Caption updates use `aria-live="off"`. Deepgram audio is forwarded as each frame arrives, with one synthesis flush for the complete response.

New interviews begin with a short spoken overview of the role, duration, selected topics, one-question format, and feedback, followed by **Ready to begin?** The same live stage and transcript carry this opening. Saved name and up to two skills personalize the welcome; saved experience, projects, and practice goal inform later questions. The stage shows **Introducing your interview** while speaking and **Ready when you are** while listening, with a reminder that the practice timer has not started. Questions about the format and requests for more time stay in the opening until the candidate clearly agrees to begin. Opening turns remain in the transcript and are excluded from technical feedback. Reconnect preserves the current phase and replays the latest saved interviewer turn. Existing interviews retain their technical-question flow.

The compact control group sits directly on the paper canvas beneath the orb, centered within the conversation column. It takes only its content width, without an enclosing white tray or a footer stretching beneath the transcript. Four stable controls remain visible: **Mute / Unmute**, **Replay question**, **Audio**, and **Finish interview**. The microphone uses a charcoal circle while active and a soft destructive surface with a slashed microphone while muted; its pressed state remains accessible. Replay is unavailable until a question exists or while paused. Audio groups pause/resume, playback speed, microphone, and speaker selection in one menu. Its choices replace the menu's contents, with a Back action, so device lists stay within even a (320px) screen. Speaker selection is offered only when the browser supports audio output routing; otherwise it follows browser/system settings. Failed device changes retain the previous device and an inline recovery message. Speed offers (1×), (1.25×), (1.5×), and (2×), with the current choice marked. Changing speed preserves vocal pitch and applies to queued speech without replaying the question. The destructive phone control opens the existing finish confirmation. Shared shadcn buttons, tooltips, menu, and confirmation retain keyboard access. Controls are (52px) high, compacting to (48px) in short or narrow windows; Audio keeps a fixed readable width, and the dock never changes width with interview state.

Keyboard shortcuts are **M** to mute/unmute, **R** to replay, **T** to toggle the transcript, and **Space** to pause/resume the whole interview. Shortcuts ignore typing, composition, held-key repeats, modifier combinations, menus, and dialogs. Space retains native activation when a button or link has focus. Audio lists the shortcuts; icon tooltips and accessible shortcut attributes reinforce them.

Pause freezes the timer, microphone capture, interviewer playback, and streamed presentation together. The stage displays **Interview paused** with a contextual **Resume interview** action. Mute preference survives pause and device replacement. The server saves pause state and accumulated paused time, cancels its deadline while paused, and restores the remaining budget on resume or explicit reconnection. The initial clock starts only when the first technical question’s audio plays, after the spoken readiness check. Leaving a paused session keeps it paused.

Mic changes crossfade the icon over (140ms); presses compress the control briefly, and the Audio chevron rotates with the menu. Reduced motion retains color and opacity feedback while removing compression, icon scaling, and chevron rotation. There are no dock entrance delays or idle loops.

Active interview navigation opens a shared shadcn confirmation with **Keep interviewing**, **Leave for now**, and **End and leave**. The copy distinguishes saved conversation from words still being transcribed and explains that an already-started timer keeps running when leaving without ending unless the session is paused. Links, workspace search, and sign-out await the same decision; canceling preserves capture, playback, the socket, and the original session budget. Back/Forward use the Navigation API in current browsers to cancel before the live document changes, without adding history entries. Refresh, tab close, and document exits request the browser's standard warning; its text and appearance are browser-owned. Ending first waits for saved completion and feedback generation before continuing to the requested destination, suppresses competing feedback redirects, and keeps failures in the confirmation for retry. Deliberate finish and completed-session redirects bypass the exit guard.

Porcelain combines a very slow internal current with barely perceptible contour movement: less than (0.6%) at rest and less than (1%) including the strongest audio response. Its center never bobs or translates. Measured interviewer playback and microphone energy add gentle life, with (55ms) attack and (160ms) release smoothing. Material role changes blend over (300ms). Drawing is capped at (18fps) while quietly listening and (30fps) during speech, within the existing square canvas budget; hidden and offscreen surfaces stop rendering without advancing the animation clock. Reduced motion freezes the current and removes deformation while retaining colors and readable state. Muted, paused, thinking, error, and disconnected states settle fully. A matching fern/mint/ivory CSS material remains available when WebGL is unavailable or its graphics context is lost. Its internal drift also pauses when inactive, hidden, or offscreen. The static fern authentication decoration retains its separate implementation and has no live motion.

The live renderer samples audio directly without re-rendering the question or transcript for each microphone chunk. A centered square canvas preserves the sphere's apparent size while limiting shading to its own area; ResizeObserver updates its dimensions without per-frame layout reads.

### Transcript

The full live conversation starts open, with **Transcript** in the in-page session toolbar controlling its visibility. Saved-session setup keeps this action beside the saved-session controls. Its reading panel fits the remaining viewport beside or below the conversation, with a single-view switch in short mobile windows. It does not overlay the dock or trap focus. Closing restores the trigger without moving the page; Escape works while reading the inline transcript.

The live transcript uses the AI Elements chat composition: left-aligned assistant responses and right-aligned candidate messages in soft, warm-neutral bubbles. Message text carries the conversation; visible speaker names, avatars, timestamps, turn-count subtitles, and **Current question** labels are omitted. Accessible message names retain attribution for screen readers. AI responses use **MessageResponse** for streaming Markdown; candidate speech stays literal text in **MessageContent**. Interrupted turns retain a quiet status beneath the message. Download and close controls sit beside the title; export is disabled without saved turns. Saved feedback retains its existing message bubbles. AI Elements **Conversation**, **ConversationContent**, **ConversationEmptyState**, and **ConversationScrollButton** manage the bounded reading viewport and follow behavior. Following uses instant scrolling; reading earlier turns reveals **Jump to latest**. An empty conversation explains when turns will appear. Saved additions are politely announced; partial and streaming message copies are hidden from the accessibility tree. The transcript accepts no typed answer.

### Preflight

Audio setup is an open, compact two-column composition on desktop: a brief session summary on the left and a 360px audio-control column on the right, within a 760px ceiling. Below 1024px it stacks in reading order. Experience, duration, and topics appear once; the draft status/zero timer row and empty transcript action are omitted. Two compact device rows use plain icons and quiet inline actions, followed by one full-width Start/Resume button. The microphone meter appears only while testing, checked status confirms access rather than claiming speech was detected, and service/device failures and recovery actions stay with the audio controls. The start hint explains that a short spoken introduction comes first and timing begins when the first technical question’s audio actually plays, after the candidate agrees to begin. The server persists this start once and schedules the full duration from it; replays and reconnects retain that original budget. A saved session shows its actual remaining budget. No enclosing or nested cards.

### Loading, empty, and error states

Pages use a labeled status and neutral skeletons while real data loads. The overview displays real counts, shows a dash when no scored average exists, and presents **No interviews yet** with a practice action for an empty history. Search has its own no-matching-interviews result. Form and action failures use destructive alerts with the actual error and a retry action. Interview recovery notices use a neutral shadcn Alert capped at (896px), with an error or warning icon and an outlined retry action kept beside the message. Below (640px) of available notice width, the action stacks underneath with a full-width touch target; the page remains within the viewport. Voice errors expose the appropriate reconnect, microphone, speech, or interviewer recovery action; a disconnection notice explains that the conversation is saved. Preflight provides real microphone/speaker checks before starting. Feedback generation has explicit pending and failed states, keeps the saved transcript available, and exposes **Retry feedback** on failure.

Recoverable page-load failures use a neutral shared Alert with a readable heading, concise explanation, and separate fern retry button. Actions stack at mobile widths and remain at least 44px high. Profile loading and errors stay inside the workspace shell, preserving the page title, navigation, and account controls. Cold profile failures offer **Retry loading profile** and **Go to overview** where relevant; retry keeps the panel stable, disables the button, and shows progress. A successful cold retry focuses the main content. Failed background refreshes retain the last loaded profile and mounted page, including form selections, with a quiet retry notice. Active immersive interviews continue without a profile banner disrupting the stage. Expired sessions offer **Sign in again**; paused offline requests explain that loading resumes automatically. Profile reads have a ten-second deadline and cancel with their query.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens and the shared interaction states across every screen.
- **Do** retain the fixed desktop sidebar and focus-managed mobile drawer at the implemented navigation breakpoint.
- **Do** keep the live orb centered above the persistent current question, candidate captions separate, and the transcript open by default beside the stage or stacked below it.
- **Do** preserve visible focus, labeled controls, mobile touch targets, and reduced-motion behavior.
- **Do** show real loading, empty, saved, failed, and recovery states alongside real product data.
- **Do** use the local Geist fonts and the extracted readable transcript hierarchy.

### Don't:

- **Don't** reintroduce the retired Jade presentation or a dark theme into this light-only visual world.
- **Don't** hide the current question when the candidate speaks or make the live transcript an overlay; keep its close and reopen controls available.
- **Don't** introduce fabricated production metrics, sessions, or feedback; keep the landing example explicitly labeled.
- **Don't** use candidate clay or status colors as competing primary action palettes.
- **Don't** make decorative motion necessary to understand session state or announce every partial spoken word.

## Workspace refinement — October 2026

Setup uses an open form with consistent 8px-radius, 44px-minimum controls. Single-select, multi-select, and duration options share the same sage fill and `choice-border` stroke when selected, with radio/check indicators retained. Duration no longer adds a heavy underline. The session summary sits on a muted surface and stacks below the form on smaller screens. Descriptions and summary values use 14px text.

Feedback follows summary → next steps and Practice again → strengths/improvements and detailed scoring → answer evidence → full conversation. The summary and evidence use open sections with dividers. Only next steps gets a muted grouping surface; score bars use secondary ink. This order is the same in the DOM and the responsive layout.

The design is intentionally light-only. Fern still owns primary actions and focus; neutral score bars and completion badges reduce its competing uses. No new display font, decorative imagery, gradients, or animation were added. Existing live voice behavior is preserved.
