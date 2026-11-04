# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users:** Academic evaluators, thesis supervisors, and committee reviewers examining technical feasibility, rendering behavior, interaction capabilities, and cross-browser/device compatibility across four distinct web graphics paradigms.
- **Secondary Users:** Students, researchers, and web graphics developers studying implementation patterns, architectural boundaries, and integration techniques for WebGL, Unity WebGL, and WebXR prototypes.

## Product Purpose

- Provide a unified, academic pre-thesis research portal to demonstrate, explore, and evaluate four independent graphical application Proof-of-Concept (PoC) prototypes:
  1. **Module 1 – WebGL Graphics:** Native WebGL 2.0 and GLSL ES 3.0 vertex/fragment shaders.
  2. **Module 2 – Graphical Applications:** Unity WebGL 3D object configurator with orbit controls and PBR materials.
  3. **Module 3 – Web Games:** Unity WebGL single-room interactive environment with WASD movement, mouse-look, and raycast interactions.
  4. **Module 4 – AR/VR:** Google `<model-viewer>` 1:1 spatial AR placement and WebXR VR feasibility investigation.
- Success means delivering a clean, reliable, client-side web portal that allows evaluators to assess technical feasibility, observable rendering behavior, interaction responsiveness, and cross-device compatibility limitations under standard web conditions without backend infrastructure or unnecessary framework overhead.

## Positioning

- An academic pre-thesis research portal and demonstration platform—specifically differentiated from commercial gaming sites, consumer marketing pages, or production-grade benchmarking suites.
- Provides unified access and clear architectural isolation across four independent client-side graphics prototypes deployed statically on GitHub Pages.

## Operating Context

- **Deployment & Hosting:** Statically hosted on GitHub Pages under a repository subpath, requiring strict relative asset paths (`./` and `../`) and zero server-side APIs or databases.
- **Portal Layout Structure:** Follows the approved Modern Scientific Dashboard mockup for the main Overview page:
  - **Left Sidebar Navigation:** Fixed navigation affording quick switching between the Overview dashboard and individual prototype modules.
  - **Top Header:** Clean utility header displaying research platform branding and context.
  - **Welcome Hero Section:** Concise introduction outlining the academic pre-thesis research goals, scope, and technical stack.
  - **Module Cards Grid:** Four structured cards summarizing each graphical technology, implementation stack, research focus, and launch actions.
  - **Footer:** Academic attribution, project information, and repository links.
  *(The main Overview page avoids central interactive viewports, dockable inspection panels, or complex workbench layouts).*
- **Target Environments:**
  - Modern desktop browsers (Chrome, Edge, Firefox, Safari) with standard mouse and keyboard controls.
  - Tablets and mobile devices (Android/iOS) for responsive layout review and WebAR spatial placement via ARCore/ARKit.
  - WebXR-compatible devices and standalone VR headsets where hardware sensors and browser implementations permit.

## Capabilities and Constraints

- **Capabilities:**
  - Unified dashboard portal providing overview summaries and seamless navigation across four independent PoC prototypes.
  - Module presentation via sandboxed integration (e.g., `<iframe>`), preserving context isolation.
  - Qualitative and observational evaluation across key research criteria:
    - Technical implementation feasibility.
    - Observable rendering behavior and interaction responsiveness.
    - Browser and device compatibility matrices.
    - Integration overhead and architectural boundaries.
- **Scope Clarifications:**
  - The platform is an academic research demonstration, not a production benchmarking suite or continuous performance profiling environment.
  - No automated telemetry ingest pipelines, heavy instrumentation runtimes, or database logging are included.
- **Technical Constraints:**
  - **Portal Technology:** HTML5, CSS3, and Vanilla JavaScript only. No React, Vue, Next.js, or other frontend frameworks.
  - **Module 1 Technology:** Native WebGL 2.0 and GLSL ES 3.0; no heavyweight external graphics libraries unless strictly necessary.
  - **Modules 2 & 3 Technology:** Unity and C#, exported as Unity WebGL builds.
  - **Module 4 Technology:** Google `<model-viewer>` and WebXR API exploration.
  - **Backend & Database:** None. 100% client-side static execution.
  - **Context Isolation:** Modules remain decoupled and self-contained; modifying one prototype has zero impact on sibling modules or the host portal.
  - **Relative Paths:** Strict relative addressing (`./` and `../`) for all stylesheets, scripts, and media to ensure complete portability across GitHub Pages hosting.

## Brand Commitments

- **Project Identity:** Web Graphics Lab (Pre-thesis Web Graphics Research Platform).
- **Visual System (Approved Direction):**
  - Modern Scientific Dashboard visual aesthetic.
  - Dark mode with a deep navy background.
  - Blue and cyan accents denoting interactive highlights, badges, and focus states.
  - Professional, clean, minimal interface with strong typographic hierarchy and consistent rhythm.
  - Subtle, purposeful micro-interactions and transitions.
  - Fully responsive layout spanning desktop, tablet, and mobile breakpoints.
  - Visual Reference: Approved Web Graphics Lab dashboard mockup.

## Evidence on Hand

- **Architecture:** `docs/ARCHITECTURE.md` establishes complete system architecture, module specifications, integration mechanisms, and deployment considerations.
- **Workflow & Rules:** `AGENTS.md` defines context isolation, dependency restrictions, relative path rules, and verification standards.
- **Implementation Roadmap:** `TASKS.md` outlines planned development phases from initial setup to GitHub Pages deployment.
- **Existing Scaffolding:** Root `index.html`, initial stylesheet (`css/main.css`), router (`js/router.js`), and module entry files (`modules/module*/index.html`).
- **Absences:** No backend services, databases, telemetry pipelines, or npm build pipelines exist or may be fabricated.

## Product Principles

- **Academic Focus & Clarity:** The interface maintains a professional, research-first tone; layout and hierarchy prioritize clean documentation, clear module demarcation, and legible technical summaries over promotional styling.
- **Strict Architectural Independence:** Each prototype module lives within its own isolated context; the portal coordinates entry and overview without intruding on internal module implementations.
- **Pure Web Standards:** The portal shell relies strictly on standard web technologies (HTML5, CSS3, Vanilla JS), minimizing overhead and maximizing longevity.
- **Realistic Compatibility Transparency:** Browser and hardware limitations (such as WebXR headset availability or mobile WebAR sensor support) are treated as research findings and stated transparently.

## Accessibility & Inclusion

- High-contrast visual readability conforming to WCAG AA guidelines for dark navy themes.
- Fully accessible keyboard navigation across sidebar links, module cards, and interactive buttons.
- Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`) with descriptive labels and distinct focus indicators.
- Clear status notices and informative fallbacks when a user's browser or device lacks specific hardware graphics capabilities.
