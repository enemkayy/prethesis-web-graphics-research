# Module 4 Specification – AR/VR

## 1. Overview

- **Module Name:** AR/VR
- **Official Display Label:** `Module 4: AR/VR`
- **Identifier:** `module4-webar`
- **Official Route:** `#/module4`
- **Physical Directory:** `modules/module4-webar/`
- **Entry Point:** `modules/module4-webar/index.html`

This module investigates browser-based 3D model visualization and immersive experiences using Google `<model-viewer>` for Augmented Reality (AR) alongside an investigation into WebXR Virtual Reality (VR) feasibility.

---

## 2. Technology Stack

- **AR & 3D Component:** Google `<model-viewer>` web component
- **VR Framework / API:** WebXR Device API
- **Model Formats:** glTF 2.0 / GLB (with USDZ fallback for iOS Quick Look where applicable)
- **Frontend Container:** HTML5, CSS3, Vanilla JavaScript

---

## 3. Core Objectives & Implementation Scope

1. **3D Model Visualization:**
   - Embed a 3D model using Google `<model-viewer>` within `modules/module4-webar/index.html`.
   - Provide standard interactive camera controls (pan, orbit rotation, zoom) and lighting presets.

2. **Augmented Reality (AR) Spatial Placement:**
   - Enable AR mode via `<model-viewer>` attributes (`ar`, `ar-modes="webxr scene-viewer quick-look"`).
   - Support 1:1 scale spatial placement on compatible mobile devices (ARCore on Android, ARKit/Quick Look on iOS).
   - Ensure model dimensions and scale are accurately defined for realistic physical placement.

3. **WebXR VR Feasibility Investigation:**
   - Investigate and document browser/hardware support for immersive VR sessions via the WebXR Device API (`navigator.xr`).
   - Assess compatibility on modern VR headsets and browsers (e.g. Meta Quest Browser, Chrome/Edge WebXR).

4. **Compatibility & Fallbacks:**
   - Implement diagnostic feature detection for WebXR and AR capabilities.
   - Display clear, user-friendly fallback messaging on non-compatible desktop or mobile browsers explaining hardware and sensor requirements.

---

## 4. Integration Requirements

- **Sandboxed Execution:** The module executes within its own HTML page loaded via an `<iframe>` inside the main portal.
- **Naming Rule:** The physical directory path is `modules/module4-webar/`, but all user-facing portal navigation items, breadcrumbs, headings, and cards must display **Module 4: AR/VR**.
- **Shared Assets:** Shared 3D assets (e.g. GLB models) are loaded from `assets/models/` using relative paths (`../../assets/models/`).
- **Secure Contexts:** Note that mobile AR and WebXR VR features require HTTPS or localhost (provided automatically when deployed to GitHub Pages).
