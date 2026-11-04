---
name: Web Graphics Lab
description: Academic pre-thesis research portal for four independent web graphics prototypes, styled as a calm dark scientific dashboard.
colors:
  canvas: "#0B1220"
  sidebar: "#0E1729"
  header: "#0B1220"
  surface: "#111C30"
  surface-raised: "#15233B"
  surface-sunken: "#0D1626"
  tag-bg: "#16223A"
  border-subtle: "#1C2A42"
  border-default: "#263856"
  border-strong: "#34496B"
  text-primary: "#E6EDF7"
  text-secondary: "#A9B6CB"
  text-muted: "#7D8BA3"
  text-on-accent: "#FFFFFF"
  accent-blue: "#2F6FE4"
  accent-blue-hover: "#2559C4"
  accent-blue-pressed: "#1F4DA8"
  accent-blue-text: "#6FA3FF"
  accent-blue-soft: "#8DB6FF"
  accent-cyan: "#38C6D9"
  focus-ring: "#5EE1F0"
  nav-active-bg: "#14284A"
  nav-active-border: "#2A4A80"
  nav-hover-bg: "#131F35"
  module-webgl: "#5B93FF"
  module-graphical-app: "#38C6D9"
  module-webgame: "#9A8CFF"
  module-arvr: "#3CCFA8"
  status-success: "#34C38F"
  status-warning: "#F2B84B"
  status-danger: "#F0706A"
  status-info: "#38C6D9"
  disabled-bg: "#141D2E"
  disabled-text: "#56637A"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2.2vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  body-lg:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.text-on-accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-blue-hover}"
    textColor: "{colors.text-on-accent}"
  button-primary-active:
    backgroundColor: "{colors.accent-blue-pressed}"
    textColor: "{colors.text-on-accent}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
  button-icon:
    backgroundColor: "{colors.header}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: "40px"
  nav-item:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  nav-item-hover:
    backgroundColor: "{colors.nav-hover-bg}"
    textColor: "{colors.text-primary}"
  nav-item-active:
    backgroundColor: "{colors.nav-active-bg}"
    textColor: "{colors.text-primary}"
  card-module:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-module-hover:
    backgroundColor: "{colors.surface-raised}"
  hero-panel:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "48px"
  tag:
    backgroundColor: "{colors.tag-bg}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    height: "24px"
  status-chip:
    backgroundColor: "{colors.tag-bg}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "26px"
---

# Design System: Web Graphics Lab

> **Scope of this document.** This file defines the visual system and UI rules for the Web Graphics Lab **portal**: the shell, the Overview page, and shared navigation. It does not prescribe the internal UI of the four modules, which stay independent per `AGENTS.md` §3.1. Product truth lives in `PRODUCT.md`; architecture lives in `docs/ARCHITECTURE.md`. The YAML frontmatter above is **normative**: when prose and tokens disagree, the tokens win.
>
> **Reference.** The approved Web Graphics Lab dashboard mockup (attached in the design conversation, not yet committed to the repository) is the primary visual reference. This document keeps its layout and intent and deliberately refines the details listed in [Mockup Refinements](#mockup-refinements).

## Overview

**Creative North Star: "The Instrument Panel of a Graphics Lab"**

The portal should feel like the front panel of a well-made laboratory instrument: dark, quiet, precisely labeled, with light used only where it carries information. The deep navy surfaces are the dark room the graphics are viewed in; blue and cyan are the signal, the way a wireframe glows on a calibration screen. Nothing on the page competes with the four prototypes. The interface is the instrument; the modules are the experiment.

Personality comes from **computer-graphics drawing conventions used honestly**: wireframe geometry, perspective grids, coordinate axes, vertices, orbit arcs, rays, and placement reticles, rendered as thin, consistent line art. Each illustration describes the actual mechanic of the module it sits beside. Density is comfortable rather than dense: this is a reading-and-choosing surface for evaluators, not a monitoring console.

The system explicitly rejects the generic AI/SaaS dashboard look: gradient headline text, neon bloom, glassmorphism, starfields and light streaks, 3D-rendered stock icons, and decorative statistic tiles.

**Key Characteristics:**

- Dark navy tonal layering (canvas → sidebar → surface → raised) instead of shadows.
- One functional accent (Signal Blue) for actions; cyan reserved for focus and highlights; four restrained module hues for identification only.
- IBM Plex Sans for all reading text; IBM Plex Mono only for identifiers and technical values.
- Authored SVG line illustrations at a single stroke weight, never raster 3D renders.
- One authored motion moment (the hero wireframe draws in once); everything else is short state feedback.

## Colors

A cold, low-chroma navy field with a single saturated blue for action, a cyan signal for focus, and four quiet module hues that identify rather than decorate.

### Primary

- **Signal Blue** (`accent-blue`): the only filled action color. Used for primary buttons (the hero "Explore Modules"), the active-state accent of controls, and selection backgrounds (at 40% opacity). White text on it meets 4.5:1. Never used as a large background area.
- **Signal Blue, hover / pressed** (`accent-blue-hover`, `accent-blue-pressed`): darker steps so white text keeps its contrast in every state. Hover goes **darker**, not lighter.
- **Signal Blue, text** (`accent-blue-text`): inline links, active nav icons, and the arrow glyph in card actions. Use this (not `accent-blue`) whenever blue is text on navy.
- **Soft Blue** (`accent-blue-soft`): the single emphasized phrase "Web Graphics Lab" in the hero heading, and primary illustration strokes.

### Secondary

- **Scan Cyan** (`accent-cyan`): secondary illustration strokes (projection lines, axes, reticles), info status, and data highlights.
- **Focus Cyan** (`focus-ring`): keyboard focus rings everywhere. It is brighter than any other UI color so focus is never ambiguous.

### Tertiary: module identification hues

Each module has one identification hue. It appears **only** on that module's index badge, its illustration accent strokes, and its card border on hover. It never fills a button or a card.

| Module | Token | Hue intent |
|---|---|---|
| 01 WebGL Graphics | `module-webgl` | Blue: native rendering pipeline |
| 02 Graphical Applications | `module-graphical-app` | Cyan: interactive visualization |
| 03 Web Games | `module-webgame` | Violet: the only place purple appears |
| 04 AR/VR | `module-arvr` | Teal: spatial, real-world placement |

### Neutral

- **Lab Night** (`canvas`, `header`): main page background and the top header. The header matches the canvas so it never reads as a separate slab; a `border-subtle` hairline separates it.
- **Panel Navy** (`sidebar`): the sidebar, one step lighter than the canvas, which defines the navigation column without a heavy border.
- **Instrument Surface** (`surface`): module cards and secondary buttons.
- **Raised Surface** (`surface-raised`): hover state of cards and secondary buttons.
- **Viewing Well** (`surface-sunken`): the hero panel and illustration wells. Slightly darker than surfaces, like a display recessed into a panel.
- **Tag Ground** (`tag-bg`): technology tags and status chips.
- **Hairlines**: `border-subtle` for dividers and layout seams; `border-default` for card and control outlines; `border-strong` for hovered outlines and secondary-button borders.
- **Text**: `text-primary` for headings and body; `text-secondary` for descriptions, nav labels, and tag text; `text-muted` for metadata and footer captions only, never body copy.
- **Disabled** (`disabled-bg`, `disabled-text`): disabled controls only. Disabled text is intentionally below contrast and must be paired with a non-color cue (for example, an "In development" label) where it explains state.

### Status

`status-success` (supported), `status-warning` (partial or device-dependent), `status-danger` (unsupported or failed), `status-info` (neutral notice). Status is used for compatibility and availability notes, for example "WebXR VR: device-dependent". Status color always comes with a text label and, where space allows, an icon. Color alone never carries the meaning.

### Named Rules

**The One Signal Rule.** Signal Blue fills at most one control per viewport region (on the Overview, that is the hero CTA). Every other interactive element is outlined or text-only.

**The Identification-Not-Decoration Rule.** A module hue may only mark *which module* something belongs to. If removing the hue would not lose identification, the hue should not be there.

**The No-Glow Rule.** No colored halos, bloom, neon text-shadows, or zero-offset glowing box-shadows. Light on this page is drawn as line, not emitted as blur.

## Typography

**Display Font:** IBM Plex Sans (fallback: `system-ui, -apple-system, Segoe UI, sans-serif`)
**Body Font:** IBM Plex Sans (same family)
**Label/Mono Font:** IBM Plex Mono (fallback: `ui-monospace, SFMono-Regular, Consolas, monospace`)

**Character:** Plex was drawn for an engineering and research context. It is neutral enough for long reading and has enough mechanical detail to feel like a lab instrument rather than a startup. One family keeps the hierarchy driven by size and weight, not by font contrast.

**Loading:** Self-host the WOFF2 files (OFL-licensed) inside the repository and reference them with **relative paths** (for example `./assets/fonts/` from the portal root). No font CDN, no `@import` from external hosts. Load only the weights used: Sans 400, 500, 600; Mono 500. Use `font-display: swap`.

### Hierarchy

- **Display** (600, `clamp(2rem, 1.4rem + 2.2vw, 3rem)`, line-height 1.1, -0.02em): the hero heading only, exactly one per page. "Welcome to" in `text-primary`; "Web Graphics Lab" on its own line in `accent-blue-soft`. Solid color, never a gradient.
- **Headline** (600, 1.5rem, 1.25, -0.01em): section headings (`h2`), for example "Research Modules", and page titles on secondary pages.
- **Title** (600, 1.125rem, 1.35): module card titles (`h3`) and the sidebar wordmark.
- **Body Large** (400, 1.125rem, 1.6): the hero introduction paragraph only. Max width 52ch.
- **Body** (400, 1rem, 1.6): general reading text on Documentation and About. Max measure 70ch.
- **Body Small** (400, 0.875rem, 1.55): card descriptions, nav labels, button labels (at weight 500), and footer text.
- **Label** (500, 0.75rem, 1.4, +0.02em): technology tags, status chips, sidebar group labels, and metadata. Sentence case. Uppercase is allowed only for sidebar group labels (with +0.06em tracking).
- **Mono** (Plex Mono 500, 0.75rem): module index numbers ("01"), version strings ("WebGL 2.0", "GLSL ES 3.0" when shown as specs), and file paths. Never for headings or prose.

### Named Rules

**The Weight-Not-Paint Rule.** Emphasis comes from size, weight, or a single solid accent color. Gradient text, outlined text, and text-shadows are not available.

**The Honest Mono Rule.** Monospace marks identifiers and technical values only. If a string is not something you could type into code or a spec sheet, it is set in Plex Sans.

**The Tabular Rule.** Any numeric data (versions, counts, compatibility tables) uses `font-variant-numeric: tabular-nums`.

## Layout

### Shell structure

A two-column application shell: a fixed **left sidebar** and a **content column** containing a sticky **top header**, the scrolling **main** region, and the **footer**.

```text
┌────────────┬──────────────────────────────────────────────┐
│            │ Header (64px): page title · GitHub           │
│  Sidebar   ├──────────────────────────────────────────────┤
│  (248px)   │  Hero panel (text 7/12 · illustration 5/12)  │
│            │                                              │
│  identity  │  Section heading: Research Modules           │
│  nav       │  [Card 01] [Card 02] [Card 03] [Card 04]     │
│  ...       │                                              │
│  project   ├──────────────────────────────────────────────┤
│  info      │ Footer: project · technologies · deployment  │
└────────────┴──────────────────────────────────────────────┘
```

### Measurements

| Item | Value | Notes |
|---|---|---|
| Sidebar width | 248px | Fixed; full height; scrolls independently if nav overflows |
| Header height | 64px | Sticky at the top of the content column |
| Content max width | 1200px | Centered in the content column |
| Content padding (inline) | 32px desktop · 24px tablet · 16px mobile | |
| Content padding (top) | 32px desktop · 24px tablet and mobile | |
| Section spacing | 48px desktop · 40px tablet · 32px mobile | Between hero, module section, and footer |
| Heading-to-content gap | 16px | Space below an `h2`; space above it is the section spacing |
| Card gap | 24px desktop · 20px tablet · 16px mobile | Rows and columns |
| Card padding | 24px desktop · 20px mobile | |
| Hero padding | 48px desktop · 32px tablet · 24px mobile | |
| Footer padding | 24px block · content inline padding | |
| Minimum target size | 40px desktop · 44px touch and mobile | |

### Spacing scale

A 4px base: 4, 8, 12, 16, 24, 32, 48, 64 (tokens `spacing.1`–`spacing.8`). Use only these values for margins, paddings, and gaps. Internal component spacing uses 4–16; layout spacing uses 24–64. Related items group tightly (8–12); separate groups get 24 or more.

### Breakpoints and responsive behavior

| Range | Name | Sidebar | Hero | Module grid | Footer |
|---|---|---|---|---|---|
| ≥ 1360px | Desktop XL | Fixed 248px | Two columns (7/5) | **4 columns** | 3 groups in a row plus caption |
| 1024–1359px | Desktop | Fixed 248px | Two columns (7/5) | **2 × 2** | 3 groups in a row |
| 768–1023px | Tablet | Off-canvas drawer (menu button in header) | Two columns (6/6), illustration scaled down | **2 × 2** | 3 groups in a row; caption wraps below |
| < 768px | Mobile | Off-canvas drawer | Stacked: text first, illustration below (max 180px tall) | **1 column** | Groups stacked |
| < 400px | Small mobile | Off-canvas drawer | Illustration hidden | 1 column | Groups stacked |

Rules:

- The module grid uses **explicit** column counts per breakpoint (4 / 2 / 1). Never use `auto-fit` patterns that produce a 3 + 1 orphan row.
- Cards in the same row share equal height; the action row aligns to the card bottom.
- The drawer opens from the left at 280px wide (max 85vw) over a `canvas` scrim at 70% opacity. It traps focus while open, closes on Escape, scrim click, or link selection, and returns focus to the menu button.
- Use `min-height: 100dvh` for the shell, not `100vh`, so mobile browser chrome does not cut off content.
- Test real copy at every breakpoint. Card descriptions must not be truncated with ellipses; reduce columns instead.

### Named Rules

**The Quiet Shell Rule.** The sidebar and header frame the content; they never carry more visual weight than the hero panel. No large logos, no colored header bars, no heavy dividers.

## Elevation & Depth

Depth is created with **tonal layering and hairlines**, not shadows. Each step up the stack (canvas → sidebar/sunken → surface → raised) is a small, consistent lightness step in the same navy hue. Borders define edges at rest.

### Shadow Vocabulary

- **Card lift** (`box-shadow: 0 8px 24px -12px rgba(2, 6, 16, 0.6)`): module card hover only, paired with the `surface-raised` background. It has a real offset and soft blur, so it reads as lift, not glow.
- **Drawer** (`box-shadow: 8px 0 32px -8px rgba(2, 6, 16, 0.7)`): the mobile navigation drawer only.

No other shadows exist. No `backdrop-filter` blur anywhere in the portal.

### Named Rules

**The Flat-at-Rest Rule.** Every surface is flat at rest. A shadow appears only in response to state (hover) or for a layer that sits above the page (drawer).

## Shapes

Gently rounded, engineered rectangles. Corners grow with container size, so nested elements always have a smaller radius than their parent.

- **6px** (`rounded.sm`): tags and small inline elements.
- **8px** (`rounded.md`): buttons, nav items, icon buttons, illustration wells, and inputs.
- **12px** (`rounded.lg`): module cards.
- **16px** (`rounded.xl`): the hero panel.
- **Full** (`rounded.full`): status chips only.

Borders are always 1px. A colored border thicker than 1px on any side of a card, list item, nav item, or callout is not allowed. Illustration geometry (cubes, grids, arcs) supplies the angular, technical silhouettes; UI chrome stays simple.

## Components

Component philosophy: **refined and restrained**. Few variants, consistent states, clear affordances.

### Interaction states (apply to every interactive component)

| State | Treatment |
|---|---|
| Default | Resting tokens as specified per component |
| Hover | One-step background or border change, 120–200ms |
| Active (pressed) | One step darker than hover; no scale transform below 0.98 |
| Current (selected page) | `nav-item-active` treatment plus `aria-current="page"` |
| Focus-visible | `outline: 2px solid` in `focus-ring` with `outline-offset: 2px`; never removed and never replaced by a color change alone |
| Disabled | `disabled-bg` / `disabled-text`, `cursor: not-allowed`, no hover change, `aria-disabled="true"` with an explanatory label where relevant |

### Motion

- **Durations:** 120ms (color and border feedback), 200ms (card hover, arrow nudge, drawer scrim), 280ms (drawer slide), 900ms (hero wireframe draw-in, once).
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (exponential ease-out) for all state transitions. `linear` is not used for UI feedback.
- **Properties:** animate only `background-color`, `border-color`, `color`, `opacity`, `transform`, and SVG `stroke-dashoffset`. Never animate layout properties (width, height, top, margin).
- **The one authored moment:** on first load, the hero wireframe cube draws its edges in (stroke-dashoffset) over 900ms, then stays still. No looping rotation, floating, pulsing, or parallax.
- **No scroll-triggered entrance animations** on cards or sections. Content is visible by default.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, the hero illustration renders in its final state, smooth scrolling is disabled, the drawer appears without sliding, and transitions are reduced to near-instant (color changes may remain).

### Buttons

- **Shape:** 8px radius, 40px tall (44px on touch layouts), label in Body Small at weight 500, optional 16px trailing icon with an 8px gap.
- **Primary** (`button-primary`): Signal Blue fill, white label. Used once in the hero: "Explore Modules", which scrolls to the module section (`#modules`) and moves focus to its heading.
- **Secondary** (`button-secondary`): `surface` fill, 1px `border-strong` outline, `text-primary` label. Hover: `surface-raised` fill.
- **Icon button** (`button-icon`): 40 × 40px, transparent at rest (matches the header), `text-secondary` icon. Hover: `nav-hover-bg` fill with a `text-primary` icon. Always has an `aria-label`.
- **Hover / Focus:** color change only; a trailing arrow icon may translate 2px to the right on hover. No lift, no glow.
- Buttons are `<button>` for actions and `<a>` for navigation. Never a `<div>` with a click handler.

### Navigation (sidebar)

- **Identity block** (top, 72px tall, 20px inline padding): a 32px authored SVG mark (an isometric wireframe cube in `accent-blue-soft` and `accent-cyan` strokes, no gradient fill) beside "Web Graphics Lab" in Title style. Links to the Overview.
- **Groups**, separated by a `border-subtle` divider with 12px vertical margin:
  1. Overview
  2. *Modules* (group label in uppercase Label style, `text-muted`): WebGL Graphics, Graphical Applications, Web Games, AR/VR
  3. *Resources* (group label): Documentation, About
- **Nav item** (`nav-item`): 40px tall, 8px radius, 12px inline padding, a 20px line icon, a 12px gap, and a Body Small label in `text-secondary`. 2px between items.
  - Hover: `nav-hover-bg` background, `text-primary` label.
  - Active (`nav-item-active`): `nav-active-bg` background, 1px `nav-active-border` outline, `text-primary` label, icon in `accent-blue-text`, and `aria-current="page"`. No left accent bar.
- **Project information block** (pinned to the bottom): separated by a top `border-subtle` divider, not a filled card. Contents: "Computer Graphics Research Platform" (Body Small, `text-primary`), "Pre-thesis research project" (Label, `text-muted`), and a "Repository" text link with an external-link icon. No decorative wave, no slogan.
- **Mobile:** the same structure inside the drawer; nav items grow to 44px tall.

### Top header

- 64px tall, `header` background, 1px `border-subtle` bottom border, sticky.
- **Left:** the menu button (tablet and mobile only), then the current location. On the Overview, show the page title "Overview" in Title style. On other pages, show a breadcrumb `Overview / WebGL Graphics`, where the parent is a link in `text-secondary` and the current page is `text-primary` with `aria-current="page"`. Use a `/` separator in `text-muted`; no redundant "Home" item.
- **Right:** a GitHub repository icon button (`aria-label="View source on GitHub"`). External links use `rel="noopener"`.
- **Theme control:** omitted. The product is committed to dark mode, and a toggle without a designed light theme would be a dead control. Reserve the slot to the left of the GitHub button if a light theme is ever approved.

### Welcome hero

- **Container** (`hero-panel`): `surface-sunken` background, 1px `border-subtle`, 16px radius, 48px padding, min-height 300px on desktop (content-driven, never full viewport).
- **Text column (7/12):**
  1. Display heading (`h1`): "Welcome to" / "Web Graphics Lab" (second line in `accent-blue-soft`).
  2. Introduction (Body Large, `text-secondary`, max 52ch, 16px below the heading). Based on the mockup: "A unified platform for exploring four graphical technologies through interactive prototypes."
  3. Action row (24px below the intro): the primary button "Explore Modules" with a trailing arrow.
  4. Meta row (16px below the actions): a `status-chip` reading **"Pre-thesis Project"**, followed by Label-style facts in `text-muted` separated by `·`: "4 independent prototypes · Client-side · GitHub Pages".
- **Illustration column (5/12):** an authored inline SVG, not a raster image: a wireframe cube in two-point perspective, edges in `accent-blue-soft` (1.5px stroke), hidden edges dashed at 40% opacity, vertices marked with 3px dots, a faint perspective ground grid in `border-default` fading out via `mask-image`, and short projection lines in `accent-cyan`. It is decorative, so it is marked `aria-hidden="true"`. At most three colors. No bloom, particles, orbiting rings, or light streaks.
- **Background:** flat `surface-sunken`. The ground grid may extend behind the text column at no more than 6% opacity. No gradient washes.

### Module cards

One card component, four instances. Consistency comes from the shared anatomy; individuality comes from each module's own illustration and identification hue.

- **Container** (`card-module`): `surface` background, 1px `border-default`, 12px radius, 24px padding, vertical flex layout, equal heights per row.
- **Anatomy (top to bottom):**
  1. **Index badge:** "01"–"04" in Mono, module-hue text on the module hue at 14% opacity, 6px radius, 24px tall. The number is the official module identifier used in the docs and folders (`module1-webgl` and so on), which is why it is kept.
  2. **Title** (`h3`, Title style, `text-primary`, 12px below the badge): "WebGL Graphics", "Graphical Applications", "Web Games", "AR/VR".
  3. **Description** (Body Small, `text-secondary`, 8px below the title, 2–3 lines, never truncated).
  4. **Illustration well** (16px below, 112px tall, full card width, `surface-sunken` background, 8px radius): an authored line illustration at 1.5px stroke in `text-secondary`, with the module hue as the single accent:
     - *01 WebGL Graphics:* a triangle-mesh cube with vertex dots and one shaded face (the rasterization pipeline).
     - *02 Graphical Applications:* an object on a turntable with a dashed orbit arc and a camera glyph, plus three small material swatch circles (orbit camera and PBR materials).
     - *03 Web Games:* a room in one-point perspective with a crosshair and a ray line ending at an object (WASD room and `Physics.Raycast()`).
     - *04 AR/VR:* a model standing on a ground plane inside a placement reticle, with a headset outline (AR placement and WebXR).
     Third-party brand logos (for example, the Unity logo) are not used as illustrations.
  5. **Technology tags** (16px below the well, wrapping with 8px gaps): `WebGL 2.0` `GLSL ES 3.0`; `Unity` `C#`; `Unity` `C#`; `model-viewer` `WebXR`.
  6. **Action row** (pushed to the bottom with `margin-top: auto`, at least 20px above): a full-width link styled as an outlined control: 40px tall, 1px `border-default`, 8px radius, label "Explore module" in Body Small 500 `text-primary`, and a trailing arrow in `accent-blue-text`. Its accessible name includes the module, for example "Explore WebGL Graphics" (visually hidden suffix).
- **Clickable area:** the action link is the only link in the card. Its `::after` pseudo-element stretches over the whole card, so the entire card is clickable without nesting interactive elements.
- **Hover:** background `surface-raised`, border in the module hue at 60% opacity, card-lift shadow, arrow translates 2px right, 200ms. No vertical lift beyond 2px.
- **Focus:** the focus ring is drawn around the whole card (via `:focus-within`), not only around the small action row.
- **Unavailable module** (prototype not built yet): keep the card, replace the action label with "In development" in `text-muted`, apply disabled styles, and remove the link. Never show a link that leads to an empty page.

### Section headings

- `h2` in Headline style, `text-primary`, optionally followed by one Body Small line in `text-secondary` (max 60ch). Example: "Research Modules" / "Four independent prototypes, each built with its own technology stack."
- Spacing: section spacing above, 16px below.
- No eyebrow or kicker label above headings, no decorative underline bars, no section numbering.

### Technology tags

- `tag`: 24px tall, 6px radius, `tag-bg` fill, 1px `border-subtle`, Label style in `text-secondary`. Non-interactive: `<li>` items in a `<ul>` with an accessible label such as "Technologies".
- Tags are neutral. They never take module hues or status colors.

### Status chip

- `status-chip`: full radius, `tag-bg` fill, 1px `border-default`, Label in `text-primary`, optional 6px leading dot in a status color. Used for "Pre-thesis Project" in the hero and for compatibility notes (for example "Device-dependent" with a warning dot).

### Icons

- One line-icon style at a **1.5px stroke on a 20px grid** (16px in dense contexts), with round caps and joins, drawn in `currentColor`. Use authored inline SVG or a single consistent open-license set copied in as SVG files and referenced with relative paths. No icon fonts, emoji, or Unicode glyphs as icons.
- Sizes: 20px in nav and header, 16px inside buttons and chips.
- Decorative icons get `aria-hidden="true"`; icon-only controls get an `aria-label`.

### Dividers

- 1px `border-subtle`. Horizontal dividers separate sidebar groups, the header, and the footer. Vertical dividers (24px tall) separate footer groups at desktop sizes only.

### Footer

- Sits below the module section with a 1px `border-subtle` top border, 24px block padding, and no background change.
- **Groups** (definition-list semantics, `<dl>`), each with a 20px icon, a label in Label style `text-muted`, and a value in Body Small `text-secondary`:
  - *Research Project:* Pre-thesis
  - *Technologies:* WebGL 2.0 · Unity · model-viewer / WebXR
  - *Deployment:* GitHub Pages (static)
- Optional right-aligned caption in Label `text-muted`. If used, keep it factual (for example the repository name); no marketing taglines.

## Do's and Don'ts

### Do:

- **Do** define every color, radius, spacing, and font value as a CSS custom property on `:root` in the portal stylesheet (`css/main.css`), named after the frontmatter tokens (for example `--color-surface`, `--radius-lg`, `--space-5`), and reference only those variables in component rules.
- **Do** keep Signal Blue to one filled control per region, and use outlined or text styles for every other action.
- **Do** draw illustrations as inline SVG line art at a 1.5px stroke with at most three colors, and make each one describe the mechanic of its module.
- **Do** use semantic landmarks: `<aside>` containing `<nav aria-label="Primary">` for the sidebar, `<header>`, `<main id="main">`, `<section aria-labelledby="…">` for the hero and modules, and `<footer>`. Provide a "Skip to content" link as the first focusable element.
- **Do** keep the heading outline intact: one `h1` (the hero heading on the Overview), `h2` for sections, `h3` for card titles.
- **Do** theme browser surfaces from the palette: `::selection` (Signal Blue at 40%), `caret-color` (`accent-cyan`), scrollbars (`scrollbar-color` using `border-strong` on `canvas`), link `text-underline-offset: 3px`, and `color-scheme: dark`.
- **Do** verify WCAG AA contrast during implementation: body and small text at least 4.5:1; large text and UI component boundaries at least 3:1. The token pairs were chosen to pass (for example `text-muted` on `surface` is about 4.9:1, and white on `accent-blue` is about 4.6:1), but the rendered result must be checked, not assumed.
- **Do** provide 40px minimum targets (44px on touch layouts) with at least 8px between adjacent targets.
- **Do** make all navigation operable by keyboard alone, in a logical order: skip link → sidebar → header → main → footer. The drawer traps focus while open and restores it on close.
- **Do** use relative paths (`./`, `../`) for every stylesheet, script, font, icon, and image so the portal works under a GitHub Pages repository subpath.
- **Do** state technology and device limitations plainly, with a status chip and a text label (for example "WebXR VR: device-dependent"), rather than hiding them.
- **Do** keep components consistent but not identical across sections: the hero, cards, and footer each have their own composition; only tokens and states are shared.

### Don't:

- **Don't** use gradient text, neon colors, glow or bloom effects, or zero-offset colored shadows.
- **Don't** use glassmorphism or `backdrop-filter` blur.
- **Don't** add starfields, particles, light streaks, floating shapes, orbiting rings, or animated background effects.
- **Don't** use raster 3D-rendered icons, stock 3D objects, or third-party brand logos as decorative illustration.
- **Don't** add eyebrow or kicker labels above headings, decorative section numbers, or hero-metric stat tiles (a big number with a small label).
- **Don't** put colored borders thicker than 1px on any side of cards, nav items, or callouts.
- **Don't** nest cards inside cards. The sidebar project-info block is a divided region, not a card.
- **Don't** add icons or illustrations just to fill space. If an element's purpose cannot be explained, remove it.
- **Don't** add looping, scroll-triggered, or per-section entrance animations. The hero draw-in is the only authored animation.
- **Don't** add a theme toggle, notification bell, search bar, user avatar, or other SaaS-dashboard furniture that has no function in this project.
- **Don't** use monospace for headings, prose, or as a "techy" costume.
- **Don't** hard-code hex values, pixel spacing, or font stacks inside component rules; use the tokens.
- **Don't** add frontend frameworks, CSS frameworks, icon fonts, font CDNs, or npm packages for the portal UI.
- **Don't** let portal styles reach into module pages. Modules load in their own documents (for example via `<iframe>`) and keep their own styling; the portal stylesheet styles the shell only.
- **Don't** use root-absolute paths (`/css/main.css`); they break under the GitHub Pages subpath.

## Mockup Refinements

The approved mockup is preserved in layout (sidebar, header, hero, four module cards, footer), color direction (deep navy with blue and cyan), and tone. These details are intentionally changed:

| Mockup detail | Refinement | Reason |
|---|---|---|
| Blue-to-cyan gradient on the hero heading (with purple on the first letter) | Solid `text-primary` plus `accent-blue-soft` on "Web Graphics Lab" | Gradient text reduces legibility and is a generic AI-dashboard signature |
| Glowing raster cube with orbit rings, light streaks, and bloom | Inline SVG wireframe cube on a perspective grid with a one-time draw-in | Lighter, crisp at every resolution, themeable, and grounded in real graphics conventions |
| 3D-rendered card icons, including the Unity logo | Consistent line illustrations showing each module's mechanic | Visual consistency, no trademark use, and the illustrations communicate content |
| Each card button outlined in its own module color | Neutral outlined action; the module hue appears on the index badge and the hover border only | Reduces color noise; four competing colored buttons weakened hierarchy |
| Solid blue filled active nav item | Tinted `nav-active-bg` with a 1px outline and blue icon | Keeps Signal Blue reserved for the primary action |
| Breadcrumb "Home > Overview" | "Overview" title; breadcrumb only on sub-pages, without "Home" | Removes a redundant level |
| Moon (theme) icon in the header | Omitted until a light theme is designed | Avoids a dead control |
| Sidebar info card with wave graphic and "Explore • Experiment • Innovate" | Divided project-info region with a repository link | Removes decoration and a marketing slogan; avoids a card in the sidebar |
| Footer tagline "Bridging Technology and Creativity in Web Graphics" and "Google" listed as a technology | Factual caption only; "model-viewer / WebXR" | Academic, accurate wording |
| No visible section heading above the cards | "Research Modules" `h2` | Needed for a correct heading outline and screen-reader navigation |
| Requested "Pre-thesis Project" label, which would typically sit as an eyebrow above the heading | Status chip in the hero meta row, below the introduction | Keeps the requested label without an eyebrow above the heading |
