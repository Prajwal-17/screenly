---
version: 1
slug: "app-dashboard-page-tsx"
primary_target: "app/dashboard/page.tsx"
related_targets:
  [
    "app/interviews/new/page.tsx",
    "app/interviews/[id]/page.tsx",
    "app/interviews/[id]/feedback/page.tsx",
    "app/history/page.tsx",
    "app/auth/sign-in/page.tsx",
    "app/page.tsx",
  ]
---

# Screenly application

Mode: Operate. Full frontend rebuild, user-approved Ferndesk-inspired visual world. Audience: candidates practicing spoken technical interviews. Preserve existing session/data/audio contracts. Reference: user-supplied voice-first handoff and HTML sketch; mockup is hierarchy inspiration, not a pixel contract.

## Direction contract

THESIS: A calm professional practice workspace with firm navigation and a voice conversation at its center. No large question panel or permanent transcript competing with voice.

OWN-WORLD: Warm paper canvas, cooler full-height sidebar, white working surfaces, charcoal text, fern actions, restrained semantic accents, local Geist, compact 6–8px controls and 12px panels.

STORY: Orient in overview, choose a practice focus, configure a session, check audio, speak and listen, then review evidence and practice again.

FIRST VIEWPORT: A 240px fixed sidebar with 64px brand row, aligned 44px navigation, bottom account. A 64px content bar precedes a 32px title. Overview leads with three real metrics, recent sessions, and compact role links. Live interview centers a 256px voice presence with attributed captions and a bottom dock; transcript opens from the top bar.

FORM: User-pinned Ferndesk-inspired professional application shell. The supplied mockup fixes the visual world; layout and details are refined in code to the handoff's production constraints.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## User refinement override

The route h1 now appears only in the workspace top bar, without the voice-first tagline. Logo and current-navigation dots are removed. Preflight uses open audio-check rows rather than a card. Transcript is an inline disclosure (side-by-side page content from 1024px, stacked on smaller screens), never a right overlay drawer. Current spoken words use the Beautiful UI Streaming Text adaptation and remain visible through audio playback. These explicit user corrections supersede the earlier drawer/large page-title composition in the direction contract.

## Sidebar refinement override

The user supplied Vercel sidebar references and explicitly requested a denser premium navigation system, manual collapse, an automatic compact rail during interviews, Motion, and additional preview destinations. The current shell is 256px expanded / 72px collapsed with grouped rows, workspace/account menus, Ctrl/Cmd K search, rail tooltips, pinned utilities, persisted manual preference, and temporary interview focus. Mobile uses a compact full-navigation drawer. This supersedes the original three-route 240px sidebar contract while preserving the approved light palette and existing interview behavior.

## Search simplification override

The user requested a minimal command-search overlay matching the compact input/list hierarchy of the supplied reference. Keep only the input, Esc control, plain icons, destination names, and selected-row arrow visible; retain keyboard and screen-reader support. Remove the redundant heading, explanatory copy, icon tiles, and keyboard footer. The sidebar session callout was explicitly removed.

## Navigation placement override

The user removed Help & feedback from navigation and requested Settings directly below the other navigation buttons, rather than pinned at the bottom. Settings now shares the scrollable navigation area on desktop, in the rail, and in the mobile drawer. Only the account area remains anchored to the bottom. Help is also removed from command-search destinations.

## Compact shell polish override

The user requested a smaller top bar and a polished collapsed sidebar after supplying a screenshot of the incumbent rail. The workspace top bar and sidebar header are now 56px high, and the rail is 64px wide. Logo, search, navigation, Settings, and account share one center line and 44px controls. The rail removes the search field box and section rules, uses quiet group gaps and fern-tinted active squares, and keeps its inner column fixed during the fold to prevent icon drift. The 28px account avatar remains unobstructed; the local development indicator that overlapped it is disabled. Expanded navigation, mobile drawer, collapse persistence, and automatic interview focus remain.
