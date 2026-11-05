# Project Tasks & Progress

## Project: Pre-thesis Web Graphics Research Platform

**Project Objective:** Build a common Web Portal that integrates four independent graphical application Proof-of-Concept (PoC) prototypes.

**Progress Status:**
- `[ ]` Not Started
- `[/]` In Progress
- `[x]` Completed

---

## Phase 1 – Project Setup & Documentation

- [x] Define the project folder structure.
- [x] Create `AGENTS.md` with project context and AI agent instructions.
- [x] Create `docs/ARCHITECTURE.md` describing the system architecture.
- [x] Create `README.md` with project introduction and setup instructions.
- [x] Create `TASKS.md` for project progress tracking.
- [x] Create initial module technical specifications in `docs/specs/`.

## Phase 2 – Web Portal Development

- [x] Design the overall Web Portal layout (documented in `DESIGN.md`).
- [x] Prepare local font assets (self-hosted IBM Plex Sans and IBM Plex Mono WOFF2) in `assets/fonts/`.
- [x] Implement the portal shell layout (fixed left sidebar, sticky top header, responsive navigation).
- [x] Implement the Overview Dashboard page (welcome hero section, four module cards grid, and footer).
- [x] Implement client-side hash routing (`#/`, `#/module1`–`#/module4`, `#/docs`, `#/about`) in `js/router.js`.
- [x] Implement the shared module content area with iframe embedding and breadcrumb navigation.
- [x] Implement lightweight static views for Documentation and About.
- [x] Create placeholder pages for the four modules.
- [x] Ensure responsive layout across desktop, tablet, and mobile breakpoints.
- [x] Verify relative paths and local resource loading under static hosting.
- [x] Implement desktop collapsible sidebar with accessible icon-only navigation.


## Phase 3 – Module 1: WebGL Graphics

- [ ] Initialize the WebGL 2.0 rendering context.
- [ ] Implement basic 3D geometry rendering.
- [ ] Create GLSL vertex and fragment shaders.
- [ ] Implement basic object transformations and animation.
- [ ] Add simple user interaction controls.
- [ ] Integrate the module into the Web Portal.
- [ ] Test browser compatibility and rendering behavior.

## Phase 4 – Module 2: Graphical Applications

- [ ] Set up the Unity project.
- [ ] Create a basic 3D scene and object.
- [ ] Implement orbit camera controls.
- [ ] Implement bounded zoom functionality.
- [ ] Configure PBR materials and basic object customization.
- [ ] Export the project as a Unity Web build.
- [ ] Integrate the build into the Web Portal.
- [ ] Test rendering and interaction behavior in the browser.

## Phase 5 – Module 3: Web Games

- [ ] Set up the Unity project.
- [ ] Create a single-room interactive environment.
- [ ] Implement WASD character movement.
- [ ] Implement mouse-look camera controls.
- [ ] Configure BoxCollider boundaries.
- [ ] Implement object interaction using Physics.Raycast().
- [ ] Export the project as a Unity Web build.
- [ ] Integrate the build into the Web Portal.
- [ ] Test gameplay and browser compatibility.

## Phase 6 – Module 4: AR/VR

- [ ] Set up the module page using HTML and JavaScript.
- [ ] Integrate Google `<model-viewer>`.
- [ ] Display a 3D model in the browser.
- [ ] Test AR spatial placement on a compatible mobile device.
- [ ] Investigate WebXR VR feasibility.
- [ ] Document browser and device compatibility limitations.
- [ ] Integrate the module into the Web Portal.

## Phase 7 – Integration & Testing

- [ ] Verify navigation between all four modules.
- [ ] Test module loading and iframe integration where applicable.
- [ ] Verify shared and module-specific asset paths.
- [ ] Test the complete platform on supported browsers.
- [ ] Document implementation issues and limitations.
- [ ] Evaluate the four prototypes based on the research objectives.

## Phase 8 – Deployment

- [ ] Prepare the repository for deployment.
- [ ] Configure GitHub Pages.
- [ ] Deploy the Web Portal.
- [ ] Verify the deployed website and all accessible modules.
- [ ] Document the deployment URL and final results.

---

## AI Agent Task Management Rules

1. Read `TASKS.md` before starting a development task to understand the current project progress.
2. When starting a task, update its status from `[ ]` to `[/]`.
3. After completing and verifying a task, update its status from `[/]` to `[x]`.
4. If a task cannot be completed, keep it unchecked or mark it as in progress and explain the reason.
5. Only update tasks that were actually addressed during the current task.
6. Do not mark dependent or unrelated tasks as completed.
7. Do not mark a task as completed unless its implementation has been verified.
8. Keep task descriptions and the existing checklist structure consistent.
9. Include any `TASKS.md` changes in the final task report.
10. If additional work is identified, propose new tasks before adding them to the checklist. Do not silently expand the approved project scope.

---

## Development Notes

- This file is the shared progress tracker for the project.
- Update task statuses throughout development rather than waiting until an entire phase is completed.
- A task should only be marked as completed when its expected result has been implemented and verified.
- Tasks may be adjusted when technical limitations or research findings require changes to the implementation plan.
- The task checklist represents the planned development scope, not a claim that all features have already been implemented.
