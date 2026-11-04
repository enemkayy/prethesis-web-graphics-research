# Pre-thesis Web Graphics Research Platform

A web-based research platform developed as part of a Computer Science pre-thesis project. The platform explores four graphical application technologies through independent Proof-of-Concept (PoC) prototypes integrated into a common Web Portal.

## 1. Project Overview

The project investigates the implementation feasibility and practical capabilities of four technologies:

1. **WebGL Graphics** – Browser-based 2D/3D graphics rendering using native WebGL 2.0 and GLSL ES 3.0 shaders.
2. **Graphical Applications** – Interactive 3D visualization and object customization using Unity and C#.
3. **Web Games** – Browser-based interactive game experiences developed with Unity and C#.
4. **AR/VR** – Browser-based 3D model visualization, Augmented Reality (AR) spatial placement, and an investigation of WebXR-based Virtual Reality (VR).

All four prototypes are accessible through a common Web Portal while maintaining strictly independent implementations.

## 2. Project Objectives

- Develop a unified web interface for accessing four graphical application prototypes.
- Explore different technologies and approaches for browser-based graphics applications.
- Implement representative interactive features for each module.
- Investigate module integration and browser/device compatibility.
- Evaluate the feasibility and limitations of each approach.

## 3. Technology Stack

| Component                         | Technologies                       | Directory                          |
| --------------------------------- | ---------------------------------- | ---------------------------------- |
| Web Portal                        | HTML5, CSS3, Vanilla JavaScript    | `/` (`index.html`, `css/`, `js/`)  |
| Module 1 – WebGL Graphics         | JavaScript, WebGL 2.0, GLSL ES 3.0 | `modules/module1-webgl/`           |
| Module 2 – Graphical Applications | Unity, C#, Unity Web build         | `modules/module2-graphical-application/` |
| Module 3 – Web Games              | Unity, C#, Unity Web build         | `modules/module3-webgame/`         |
| Module 4 – AR/VR                  | Google `<model-viewer>`, WebXR     | `modules/module4-webar/`           |
| Deployment                        | GitHub Pages (static hosting)      | Repository Root                    |

## 4. Project Structure

```text
prethesis-web-graphics-research/
├── AGENTS.md
├── DESIGN.md
├── PRODUCT.md
├── TASKS.md
├── README.md
├── index.html
├── css/
├── js/
├── assets/
│   ├── fonts/
│   └── models/
├── docs/
│   ├── ARCHITECTURE.md
│   └── specs/
│       ├── module1-spec.md
│       ├── module2-spec.md
│       ├── module3-spec.md
│       └── module4-spec.md
└── modules/
    ├── module1-webgl/
    ├── module2-graphical-application/
    ├── module3-webgame/
    └── module4-webar/
```

For the complete architecture and module responsibilities, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 5. Getting Started

### Prerequisites

- A modern web browser with WebGL 2.0 support.
- A local development environment or static HTTP server.
- Unity Editor for developing and exporting Modules 2 and 3.

### Running the Web Portal Locally

1. Clone or download this repository.
2. Open the project directory.
3. Start a local static HTTP server (e.g. using Python, Node, or an IDE extension).
4. Open the local server URL in a supported web browser.

The portal can also be inspected directly through `index.html` for basic layout evaluation, but a local HTTP server is recommended for testing module loading, hash routing, and WebGL/WebXR APIs.

### Module Development

Each module is maintained independently under the `modules/` directory.

- **Module 1:** Develop and test the native WebGL implementation.
- **Module 2:** Develop the Unity project and export its Web build.
- **Module 3:** Develop the Unity project and export its Web build.
- **Module 4:** Develop the browser-based AR/VR prototype.

Refer to the corresponding module specification in `docs/specs/`.

## 6. Deployment

The platform is hosted statically using GitHub Pages.

The repository's root `index.html` serves as the main entry point. All required static resources, local fonts, and exported module builds must be included in the deployment using relative paths.

See [GitHub Pages documentation](https://docs.github.com/en/pages) for deployment configuration.

## 7. Project Documentation

| File                   | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `PRODUCT.md`           | Canonical product purpose, target users, constraints, and principles. |
| `DESIGN.md`            | Visual design system, tokens, layout specifications, and UI rules.    |
| `AGENTS.md`            | Project context, architecture constraints, and AI Agent instructions. |
| `TASKS.md`             | Development checklist and project progress tracking.                  |
| `docs/ARCHITECTURE.md` | Overall system architecture and module integration approach.          |
| `docs/specs/`          | Technical specifications for individual modules.                      |

## 8. Project Scope

This project focuses on research and functional PoC implementations. It does not aim to deliver a production-ready commercial platform.

Backend services, database management, authentication, telemetry servers, and complex business functionality are outside the current scope.

AR/VR capabilities may vary depending on browser support, device hardware, and platform limitations.

---

**Project Type:** Computer Science Pre-thesis  
**Repository:** `prethesis-web-graphics-research`
