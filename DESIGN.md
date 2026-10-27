---
name: Screenly
description:
  A professional voice-first interview workspace with white surfaces, neutral navigation, and charcoal
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

## Overview

**Creative North Star: "A clear professional practice workspace"**

Screenly uses white working surfaces, quiet gray navigation, and charcoal actions to make spoken interview practice easy to operate. The approved Cal.com-inspired replacement supersedes the previous paper-and-fern identity. The classic shadcn sidebar supplies familiar navigation; concise headings, visible state, and restrained borders carry the hierarchy.

The live session retains its existing composition: PorcelainOrb above status and the persistent question, a separate candidate caption, a default-open transcript, and microphone, replay, audio, and finish controls. Neutral material tokens give the orb its own appearance without coupling its rendering to action colors.

**Key Characteristics:**

- White canvas, quiet gray navigation, charcoal text and primary actions.
- Locally bundled Geist, compact interface labels, and readable conversation text.
- Classic expanded inset sidebar and a focus-managed live-interview navigation drawer.
- Borders and tonal separation for working surfaces; elevation for temporary overlays.
- Concise task copy with explicit loading, empty, error, recovery, and saved states.

## Colors

The frontmatter records all 65 resolved runtime color values from `apps/web/app/globals.css`; that stylesheet is the implementation source of truth. CSS aliases resolve to literals here and in the sidecar’s `extensions.resolvedColors` inventory for portable token readers. Refresh this file and the tracked `.impeccable/design.json` together when those tokens change. Other local `.impeccable` artifacts remain ignored.

Primary is charcoal, with explicit hover and active states. White canvas, card, and popover surfaces share a quiet neutral scale with the sidebar, muted areas, borders, and text. The input boundary and selected-choice stroke remain stronger than decorative dividers. Candidate speech uses neutral text and a quiet gray surface. Vivid emerald success, orange warning, rose-red destructive, and blue information colors communicate state alongside readable text or icons. Saturated foregrounds pair with pale tinted surfaces and brighter borders; small text retains at least 4.5:1 contrast. Shared Badge and Alert primitives expose all four states; draft interviews use information, resumable sessions use warning, and completed sessions use success. Keep `accent` neutral for ordinary interactions. Orb paper, body, highlight, and reflection form a separate material palette. The unused legacy visual and `lime` alias have been removed after a reference scan.

`success-foreground`, `warning-foreground`, and `info-foreground` are colored text on their matching pale surfaces. `destructive-foreground` is white text on a solid destructive action; use `destructive-text` on the pale destructive surface. Do not apply tinted-surface foregrounds to solid status buttons. Status borders supplement text/icons and do not carry meaning alone.

**The Semantic Color Rule.** Use the shared semantic token for each surface, action, and status. Keep orb material colors independent from action colors.

## Typography

Use the locally bundled Geist Sans throughout; Geist Mono remains available for technical values. The base reading role is body, with compact body-small and label roles for controls and navigation. Default headings step from headline-mobile to headline at the small breakpoint; section titles use title. The workspace header intentionally uses a compact label-sized page title. The landing hero, dashboard starter, and onboarding headings retain their local sizes rather than defining another global display scale. Compact metadata in badges, account details, shortcut hints, and audio/preflight controls uses local 10–13px text; saved transcript text uses 15px with 1.7 line height. The root-error document uses Arial so recovery remains usable if the root layout or fonts fail.

Conversation text uses the live-transcript role. The live question starts at live-question and fits available space; its narrower and short-screen adaptations remain owned by `live-interview.module.css`. Do not replace this fitting behavior with a fixed headline size. Keep readable text measure, wrapping, and tabular timing and score values.

**The One Heading Rule.** Let the workspace header identify the page. Add a larger content heading only when it advances the task; do not repeat the title as an eyebrow or slogan.

## Layout

The classic shadcn/Radix sidebar uses an inset workspace, with a 16rem expanded navigation on every normal workspace page, including preflight. There is no compact rail or saved collapse preference. During an active live interview, navigation opens as a focus-managed drawer. Ctrl/Meta+B operates that drawer only; Ctrl/Meta+K opens workspace search. At heights of 500px or less, navigation scrolls as a whole so destinations and account actions stay reachable. Help and Settings sit above the account menu; planned destinations remain searchable.

Screenly requires a desktop or laptop window at least 1024 CSS pixels wide. Below that threshold, the app displays a concise wider-window notice. The underlying page remains mounted, so an active interview is not reset or finished by a resize. Transient overlays dismiss on crossing the boundary so their focus traps do not obscure the notice.

The workspace has an 8px desktop inset, a 56px header, a 16px outer corner, and a bordered white content area. Ordinary pages use a centered maximum width of 1080px; content gutters grow from 20px to 32px to 40px. The dashboard starter is narrower at 720px. A visible-on-focus skip link targets the main content, which receives focus after route changes.

Live interviews use drawer navigation and retain the existing viewport-height stage, right transcript column, persistent question, candidate caption, and dock. The existing fitting rules in `live-interview.module.css` keep controls reachable in short desktop windows and handle long questions.

**The Preserved Stage Rule.** Keep the existing live composition and its responsive fitting behavior. Styling changes must not move session ownership or audio behavior into presentation components.

## Elevation & Depth

Working panels and the workspace are flat, using subtle borders and neutral fill changes. `Workspace` explicitly removes the inset primitive's default shadow. The live dock also remains unboxed. Existing Radix dialog and sheet surfaces use the shared small or extra-large utility shadows. The orb uses its own material shading and WebGL/CSS fallback; its depth is a session presence rather than a card treatment.

**The Working Surface Rule.** Separate ordinary surfaces with borders and neutral fills. Use existing overlay shadows for dialogs and sheets; do not add decorative lift to every card.

Control color transitions generally run for 150ms. Dialogs and sheets use their existing 150–200ms transitions; the retained question reveal uses 500ms. Respect reduced motion in global CSS and the live renderer. The sidecar contains exact elevation and motion metadata beyond the frontmatter schema.

## Shapes

Use the extracted radius scale: small for subtle inline targets, medium for inputs and buttons, large for compact groups, and extra-large for cards, dialogs, and the inset workspace. Badges and the retained live dock controls use fully rounded shapes. The existing checkbox and live-question focus outline retain local 4px corners. Shared cards use 24px spacing and a one-pixel border. Form controls have clear input boundaries; selected segmented choices add an inset stroke as well as a neutral fill. Do not replace this state distinction with a barely different background alone.

## Components

**The Shared Control Rule.** Extend the shared primitive and its semantic state before creating a route-specific control. Keep accessible names and keyboard behavior when simplifying visible copy.

- **Buttons:** `components/ui/button.tsx` owns default, outline, secondary, ghost, destructive, and link variants, plus text/icon sizes, `asChild`, and `loading`. Default targets are at least 44px; compact sizes recover touch height on coarse pointers. Loading preserves label width, disables repeated activation, and exposes `aria-busy`. Shared focus uses a two-pixel ring with a three-pixel offset.
- **Inputs and choices:** use `Input`, existing field labels/descriptions/errors, and Radix choice primitives. `RadioGroupItem variant="segment"` is the full clickable target with native radio-group semantics, checked fill and inset stroke, keyboard focus, and disabled state. Preserve visible labels or visually hidden equivalents. Keep invalid state linked to the actual error.
- **Navigation:** compose the adapted shadcn `SidebarProvider`, `Sidebar`, its content slots, `SidebarInset`, and the live-only `SidebarTrigger`. Normal pages force the full sidebar open; only the live experience uses the controlled drawer. Search and drawer state are transient. Ctrl/Meta+B works only in the live experience; Ctrl/Meta+K opens search. Shortcuts ignore editable, composition, modified, and repeated key events. Route changes update the title and focus the main landmark; search restores its opener or a connected fallback. Keep active links named and marked with `aria-current`.
- **Panels and badges:** use Card slots for grouped content and existing Badge variants for statuses. A success badge pairs a readable label or score with the success treatment. Do not wrap every section in a card when a heading and divider already establish grouping.
- **Page and session patterns:** `PageIntro` accepts optional description and action and renders nothing when both are absent. `InterviewRows` supports compact recent-session lists and full responsive tables. `Loading`, `ErrorState`, `InlineAlert`, `EmptyState`, and `ConfirmAction` preserve state and recovery semantics.
- **Live session:** retain `LiveInterview`, `PorcelainOrb`, `LiveTranscript`, `InterviewAudioMenu`, `FinishInterviewDialog`, and `InterviewExitGuard`. Style through semantic tokens, component variants, and the existing CSS module. Preserve interrupt, mute, replay, playback preferences, reconnect, timing, microphone recovery, export, and finish-without-feedback behavior.
- **Recovery and validation:** `PageRecovery` supplies provider-independent route/not-found actions with full navigation; the root error document is self-contained. Keep error details private. Repeated link and project errors retain their field paths, accessible descriptions, and focus recovery. Audio tooltips close when their menu opens so Escape and focus return belong to the menu.

Agent-safe edit boundaries: presentation belongs in `app`, `components`, and global tokens; preserve backend endpoints, shared Zod schemas, ownership checks, query keys, auth policy, profile import consent/autosave, audio hooks, and state-store contracts. Locate actions by role and accessible name and state by `aria-*`/Radix `data-state`; do not depend on incidental copy or add test IDs where semantics already identify the control. New styles must update both design artifacts, and interaction changes require relevant fixture journeys beyond a screenshot.

## Do's and Don'ts

### Do

- **Do** use the runtime semantic tokens and shared component variants across every route.
- **Do** preserve the expanded classic sidebar, workspace search, and live-session drawer behavior.
- **Do** preserve the orb, persistent question, candidate caption, default-open transcript, and existing audio control dock.
- **Do** keep visible keyboard focus, labeled icon actions, meaningful status announcements, and reduced-motion support.
- **Do** retain real loading, empty, failed, saved, confirmation, and recovery states.
- **Do** remove redundant slogans and labels while retaining constraints, consent, errors, and instructions needed to finish a task.

### Don't

- **Don't** restore the superseded fern palette or introduce a dark theme into this light-only system.
- **Don't** fabricate sessions, metrics, scores, or feedback; keep static landing examples identified.
- **Don't** rebuild the audio engine, session state machine, query contracts, or navigation guards as part of a style edit.
- **Don't** replace semantic buttons, radio groups, dialog titles, or form labels with visually similar generic elements.
- **Don't** make animation or color alone necessary to understand session state, and do not announce every partial spoken word.
