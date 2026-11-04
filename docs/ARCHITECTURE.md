# System Architecture

## 1. System Overview

### 1.1. Project Introduction

The **Pre-thesis Web Graphics Research Platform** is a web-based research platform developed to explore and demonstrate four graphical application technologies: WebGL Graphics, Graphical Applications, Web Games, and Augmented Reality/Virtual Reality (AR/VR).

The platform provides a common web interface through which users can access and interact with four independent Proof-of-Concept (PoC) prototypes.

The primary objective is to investigate the implementation feasibility, interaction capabilities, integration requirements, and browser/device compatibility of these technologies within a shared web environment.

### 1.2. Project Objectives

The project has the following objectives:

- Develop a common Web Portal that provides access to all four graphical application modules.
- Implement four independent PoC prototypes using technologies appropriate to each module.
- Investigate how different graphics technologies can be presented and accessed through a unified web interface.
- Evaluate the technical feasibility, interaction capabilities, and compatibility limitations of each prototype.
- Deploy the platform using GitHub Pages for online demonstration and evaluation.

### 1.3. Technology Stack

| Component | Technologies | Physical Path |
|---|---|---|
| Web Portal | HTML5, CSS3, Vanilla JavaScript | `/` (`index.html`, `css/`, `js/`) |
| Module 1 – WebGL Graphics | JavaScript, WebGL 2.0, GLSL ES 3.0 | `modules/module1-webgl/` |
| Module 2 – Graphical Applications | Unity, C#, Unity Web build | `modules/module2-graphical-application/` |
| Module 3 – Web Games | Unity, C#, Unity Web build | `modules/module3-webgame/` |
| Module 4 – AR/VR | Google `<model-viewer>`, WebXR | `modules/module4-webar/` |
| Deployment | GitHub Pages (static hosting) | Repository Root |

The platform is designed as a client-side application and does not require a backend server or database.

---

## 2. System Architecture

### 2.1. Architectural Overview

The system follows a **modular architecture** consisting of one common Web Portal and four independent graphical application modules.

The Web Portal acts as the central entry point of the platform. It provides the shared user interface, navigation, and module selection functionality.

Each module is implemented independently using its designated technologies and can be developed, tested, and maintained separately.

The relationship between the components can be summarized as follows:

```text
                  Web Graphics Research Platform
                                |
                     Common Web Portal
                     (HTML / CSS / JS)
                                |
                Client-Side Hash Router (js/router.js)
                                |
         +----------------------+----------------------+
         |                      |                      |
   Overview Dashboard      Module View           Static Views
      (Hero, Cards)       (Iframe Container)    (Docs, About)
                                |
         +-------------+--------+--------+-------------+
         |             |                 |             |
      Module 1      Module 2          Module 3      Module 4
       WebGL        Graphical         Web Game       AR/VR
                   Application
         |             |                 |             |
       Native        Unity             Unity      model-viewer
       WebGL         + C#              + C#       + WebXR study
```

### 2.2. Web Portal Architecture

The Web Portal serves as the primary research workspace. It follows the **Modern Scientific Dashboard** layout design specified in `DESIGN.md`.

#### 2.2.1. View Architecture

The portal provides two main view types alongside lightweight static informational views:

1. **Overview Dashboard (`#/`):**
   - **Fixed Left Sidebar:** Platform identity mark, primary navigation links (Overview, Modules, Documentation, About), and bottom project metadata.
   - **Top Header:** Clean utility bar displaying the current view title/breadcrumbs and repository link.
   - **Welcome Hero Section:** Concise introduction outlining the academic pre-thesis research goals, technology stack, and an "Explore Modules" action.
   - **Module Cards Grid:** Four structured cards displaying module index badges ("01"–"04"), titles, descriptions, technical line-art illustrations, technology tags, and launch affordances.
   - **Project Footer:** Understated academic metadata (Pre-thesis project status, technologies, static GitHub Pages deployment).

2. **Module View (`#/module1` – `#/module4`):**
   - Embeds the selected independent module within the shared content area using an HTML `<iframe>`.
   - Provides separate browsing contexts for each module, isolating DOM, CSS, and JavaScript execution while maintaining independent rendering lifecycles.
   - Displays a contextual breadcrumb (e.g. `Overview / WebGL Graphics`) in the header allowing one-click return to the Overview Dashboard.

3. **Static Informational Views (`#/docs`, `#/about`):**
   - Lightweight, text-based static content views for project documentation and about information, rendered cleanly within the portal shell without requiring a separate content management system.

#### 2.2.2. Implementation Principles

The portal is developed using HTML5, CSS3, and Vanilla JavaScript to keep the implementation lightweight, transparent, and completely free of frontend framework dependencies. Relative resource paths are strictly maintained to support GitHub Pages deployment under a repository subpath.

### 2.3. Independent Module Architecture

Each graphical application module is maintained within its own directory under the `modules/` folder. Detailed specifications for each module are documented in `docs/specs/`.

The modules have separate implementations and technology stacks. They do not share rendering engines or application frameworks.

The four modules are described below:

#### Module 1 – WebGL Graphics

- **Technologies:** JavaScript, WebGL 2.0, GLSL ES 3.0.
- **Directory:** `modules/module1-webgl/`
- **Specification:** `docs/specs/module1-spec.md`
- **Focus:** Native browser-based 3D graphics rendering using the WebGL 2.0 API, custom vertex and fragment shaders, 3D geometry manipulation, matrix transformations, and interactive controls without external 3D libraries.

#### Module 2 – Graphical Applications

- **Technologies:** Unity, C#, Unity Web build.
- **Directory:** `modules/module2-graphical-application/`
- **Specification:** `docs/specs/module2-spec.md`
- **Focus:** Interactive 3D object visualization and customization using Unity, featuring 360-degree orbit camera controls, bounded zoom, PBR materials, and appearance property toggles.

#### Module 3 – Web Games

- **Technologies:** Unity, C#, Unity Web build.
- **Directory:** `modules/module3-webgame/`
- **Specification:** `docs/specs/module3-spec.md`
- **Focus:** Browser-based interactive game experiences developed with Unity, featuring a single-room 3D environment, WASD character movement, mouse-look camera controls, BoxCollider boundaries, and object interaction via `Physics.Raycast()`.

#### Module 4 – AR/VR

- **Technologies:** Google `<model-viewer>`, WebXR Device API.
- **Directory:** `modules/module4-webar/`
- **Specification:** `docs/specs/module4-spec.md`
- **Naming Rule:** The physical directory path is `modules/module4-webar/`, but all user-facing labels, navigation items, breadcrumbs, and module cards must display **Module 4: AR/VR**.
- **Focus:** Browser-based 3D model visualization using Google `<model-viewer>`, 1:1 scale AR spatial placement on compatible mobile devices (ARCore/ARKit), and an investigation into WebXR VR feasibility and compatibility limitations.

---

## 3. Module Integration & Routing

### 3.1. Integration Approach

The four graphical application modules are integrated into the common Web Portal through a lightweight navigation and presentation mechanism.

The portal and individual modules remain loosely coupled:
- Modules execute within their own document contexts via HTML `<iframe>` elements.
- No styles or global JavaScript variables leak between modules or into the host portal shell.
- Modules can be developed, debugged, and tested standalone by opening their respective `index.html` files directly.

### 3.2. Client-Side Hash-Based Routing

The portal navigation is driven by a lightweight client-side router (`js/router.js`) utilizing URL hash routing:

| Route | View Rendered | Target Path / Action |
|---|---|---|
| `#/` or `""` | Overview Dashboard | Restores Hero, Module Cards grid, and Footer |
| `#/module1` | Module 1: WebGL Graphics | Loads `modules/module1-webgl/index.html` into iframe |
| `#/module2` | Module 2: Graphical Applications | Loads `modules/module2-graphical-application/index.html` into iframe |
| `#/module3` | Module 3: Web Games | Loads `modules/module3-webgame/index.html` into iframe |
| `#/module4` | Module 4: AR/VR | Loads `modules/module4-webar/index.html` into iframe |
| `#/docs` | Documentation View | Displays static project documentation within portal content area |
| `#/about` | About View | Displays static research metadata within portal content area |

**Routing Advantages:**
- **Static Hosting Compatibility:** Full compatibility with GitHub Pages static hosting without requiring server-side URL rewrite rules.
- **History & Deep Linking:** Seamless browser Back and Forward navigation, with direct bookmarking to specific modules or views.
- **Zero Dependencies:** Implemented using standard `window.location.hash` and the `hashchange` event in Vanilla JavaScript.

### 3.3. Resource and Asset Management

The project uses a shared `assets/` directory:
- `assets/fonts/`: Self-hosted font files (IBM Plex Sans, IBM Plex Mono in WOFF2 format).
- `assets/models/`: Shared 3D models (e.g. glTF/GLB models used by Module 4 and cross-module tests).

Module-specific assets remain strictly within their respective module directories. Relative paths (`./` and `../`) must be used for all asset references.

---

## 4. Deployment Architecture

### 4.1. Deployment Platform

The platform is deployed using **GitHub Pages**, providing static website hosting.

The repository root `index.html` serves as the main entry point.

The deployment includes:
- Portal HTML, CSS, JavaScript files, and local fonts.
- Module HTML pages and JavaScript resources.
- Exported Unity Web build files.
- Required 3D models and static assets.

### 4.2. Deployment Considerations

- **Static Access:** All resources must be statically accessible without server-side computation.
- **Relative Addressing:** Strictly use relative paths to support GitHub Pages repository subpaths (e.g., `https://<username>.github.io/<repo>/`).
- **Unity Build Output:** Exported Web builds must be committed under their module folders, while intermediate Unity project files remain untracked.
- **Secure Contexts for WebXR/AR:** ARCore/WebXR capabilities typically require HTTPS (provided automatically by GitHub Pages).

### 4.3. Deployment Workflow

1. Develop and test the Web Portal locally with a static HTTP server.
2. Implement and verify each module independently.
3. Export Unity projects into their respective Web build directories.
4. Verify hash routing and iframe loading across all module views.
5. Push approved commits to GitHub.
6. Configure GitHub Pages to serve from the repository branch.
7. Verify live portal navigation and prototype responsiveness.

---

## 5. Architectural Scope and Limitations

The architecture is intentionally designed for a research-oriented pre-thesis project:
- No backend servers, databases, or user authentication.
- No automated telemetry ingestion pipelines or heavy continuous profiling suites.
- Focus is placed on examining technical feasibility, observable rendering behavior, interaction fidelity, and browser/device compatibility.
