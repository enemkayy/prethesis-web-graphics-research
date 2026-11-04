# Module 2 Specification – Graphical Applications

## 1. Overview

- **Module Name:** Graphical Applications
- **Identifier:** `module2-graphical-application`
- **Official Route:** `#/module2`
- **Physical Directory:** `modules/module2-graphical-application/`
- **Entry Point:** `modules/module2-graphical-application/index.html`

This module investigates interactive 3D object visualization and material customization using Unity exported as a client-side Web build.

---

## 2. Technology Stack

- **Engine & Framework:** Unity (Unity Web platform build / WebGL target)
- **Scripting Language:** C#
- **Export Target:** WebGL 2.0 Web Build (HTML5, JavaScript loader, WebAssembly)
- **Frontend Container:** HTML5, CSS3, Vanilla JavaScript

---

## 3. Core Objectives & Implementation Scope

1. **3D Scene & Object Setup:**
   - Establish a 3D inspection environment with balanced studio lighting.
   - Load and display a central 3D model for interactive examination.

2. **Camera Controls:**
   - Implement an orbit camera system providing smooth 360-degree horizontal and vertical rotation around the target object.
   - Implement bounded zoom controls restricting camera distance to predefined minimum and maximum limits.

3. **PBR Materials & Appearance Customization:**
   - Configure Physically Based Rendering (PBR) materials with standard smoothness, metallic, and albedo properties.
   - Provide interactive UI controls to customize object appearance (e.g. toggling color palettes or switching surface material properties).

4. **Export & Packaging:**
   - Export an optimized Unity Web build targeting modern browsers without requiring browser plugins.
   - Ensure the exported build is self-contained within `modules/module2-graphical-application/`.

---

## 4. Integration Requirements

- **Sandboxed Execution:** The module loads within an HTML `<iframe>` inside the main portal to prevent Unity runtime globals and memory usage from interfering with portal navigation.
- **Relative Path Enforcement:** Unity Web build loader files (`Build/*.loader.js`, `Build/*.wasm`, `Build/*.data`) and HTML entry files must reference assets using relative paths to ensure portability under GitHub Pages repository subpaths.
- **Repository Boundaries:** Intermediate Unity project files and large development caches remain outside git tracking; only exported web distribution files are included in the repository deployment.
