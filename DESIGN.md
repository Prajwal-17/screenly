---
name: Screenly
description:
  A professional voice-first AI interviewing app with white surfaces, neutral navigation, and charcoal
  actions.
colors:
  sidebar-foreground: "#262626"
  sidebar-primary: "#262626"
  sidebar-primary-foreground: "#fff"
  sidebar-accent: "#eaeaea"
  sidebar-accent-foreground: "#262626"
  sidebar-border: "#e5e5e5"
  sidebar-ring: "#737373"
  orb-paper: "#ffffff"
  orb-body: "#656e78"
  orb-highlight: "#c9cfd5"
  orb-reflection: "#7b838c"
  choice-border: "#525252"
  sidebar: "#fafafa"
  ink-secondary: "#454545"
  candidate: "#525252"
  candidate-surface: "#f3f3f3"
  background: "#ffffff"
  foreground: "#262626"
  card: "#ffffff"
  card-foreground: "#262626"
  popover: "#ffffff"
  popover-foreground: "#262626"
  border: "#e5e5e5"
  input: "#a3a3a3"
  primary: "#262626"
  primary-foreground: "#fff"
  primary-hover: "#404040"
  primary-active: "#171717"
  secondary: "#f5f5f5"
  secondary-foreground: "#262626"
  secondary-hover: "#eeeeee"
  secondary-active: "#e5e5e5"
  accent: "#f2f2f2"
  accent-foreground: "#171717"
  accent-hover: "#eaeaea"
  accent-active: "#dedede"
  muted: "#f5f5f5"
  muted-foreground: "#686868"
  link: "#262626"
  link-hover: "#404040"
  ring: "#737373"
  focus-offset: "#fff"
  disabled: "#f5f5f5"
  disabled-foreground: "#686868"
  selection: "#dedede"
  selection-foreground: "#262626"
  success: "#008044"
  success-foreground: "#008044"
  success-surface: "#ecfdf5"
  success-border: "#6ee7b7"
  warning: "#b94b00"
  warning-foreground: "#b94b00"
  warning-surface: "#fff7ed"
  warning-border: "#fdba74"
  destructive: "#d90d3a"
  destructive-text: "#d90d3a"
  destructive-foreground: "#fff"
  destructive-hover: "#be123c"
  destructive-active: "#9f1239"
  destructive-surface: "#fff1f2"
  destructive-border: "#fda4af"
  info: "#2563eb"
  info-foreground: "#2563eb"
  info-surface: "#eff6ff"
  info-border: "#93c5fd"
typography:
  headline:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: -0.035em
  headline-mobile:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: -0.035em
  title:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: -0.02em
  body:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: "1.6"
  body-small:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: "1.4"
  live-question:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 28px
    fontWeight: 450
    lineHeight: "1.45"
    letterSpacing: -0.028em
  live-state:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: "1.6"
  live-transcript:
    fontFamily: var(--font-geist-sans), Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: "1.8"
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  "4": 4px
  "8": 8px
  "12": 12px
  "16": 16px
  "24": 24px
  "32": 32px
  "40": 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-ghost:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-link:
    textColor: "{colors.link}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 44px
  navigation-item-current:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
    rounded: "{rounded.md}"
    padding: 8px
    height: 36px
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  working-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  segmented-choice-selected:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    padding: 0 8px
---

# Design System: Screenly

## Direction

Screenly uses white reading surfaces, quiet gray navigation, charcoal actions, local Geist, semantic state colors, and existing shadcn/Radix controls. The live conversation and saved review carry the hierarchy. The palette and component tokens above remain the runtime foundation in `apps/web/app/globals.css`; orb and live-caption tokens support the preserved live experience required by REQ-012.

## Workspace

The inset sidebar contains only New interview, Interviews and Settings. Normal workspace pages show it expanded; active live sessions use the focus-managed drawer. The compact header names the current route, and route changes focus the main landmark. Help and sign-out live in the account menu. Retired workspace destinations redirect to New interview. There is no global workspace search or overview screen.

## New interview

Use a single six-role choice group and one start action. The saved profile role suggests a selection; saved experience is displayed rather than chosen here. Missing saved experience blocks creation and links to profile editing. Relevant missing context is a warning, while profile/service errors have separate retry actions. New sessions use 20 minutes; no topic or duration picker appears.

## Live session

Preserve the previous live experience: reactive PorcelainOrb, centered interviewer caption,
candidate caption, quiet timer and existing control dock. The default-open side transcript
contains the continuous speaker-labelled conversation, partial/streaming turns and interruption
markers, with follow-latest and Jump to latest. Its close/reopen control and T shortcut retain
focus return. Keep caption fitting and control reachability in short windows. The existing
controller continues to own capture, interruption, playback, reconnect and finish. This explicit
REQ-012 correction supersedes the earlier transcript-only composition; assessment remains
qualitative, with no exam counters or per-answer grading.

## Review and history

The session review leads with synthesis, then qualitative findings, exact evidence links to transcript anchors, and one practice priority. Limitations and unassessed areas appear only when present. Legacy reports show safe session summary text without guessed labels or evidence. History rows show role, date, lifecycle and review availability. Export and deletion remain available. No score number, score bar, ranking or answer-by-answer card is visible.

## Profile, memory and preferences

Keep the existing onboarding editor and import consent. Settings exposes that editor, dated role/source-linked active findings with a dismissal action, a stored playback speed preference, and account/help access. Device changes remain in the live audio menu where a connected session can apply them. No inferred profile facts or synthetic personal findings are shown.

## Public landing

The responsive landing uses the same neutral tokens. Its six role tabs switch explicitly illustrative transcript excerpts and qualitative review text. FAQ uses the existing Accordion; the main action points to New interview. It does not request microphone/provider access or imply a personal review.

## Interaction and accessibility

Use shadcn variants and semantic tokens for all controls. Preserve keyboard focus, accessible names, visible selection, current-page links, skip navigation, reduced motion, desktop boundary and short-window control reachability. Essential errors and recovery copy remain visible; partial live speech is not repeatedly announced. The root error document remains self-contained.
