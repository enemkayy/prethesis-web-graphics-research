# Module 3 Specification – Web Games

## 1. Overview

- **Module Name:** Web Games
- **Identifier:** `module3-webgame`
- **Official Route:** `#/module3`
- **Physical Directory:** `modules/module3-webgame/`
- **Entry Point:** `modules/module3-webgame/index.html`

This module investigates browser-based interactive game experiences using Unity, focusing on first-person movement and physics-based interactions within a focused single-room environment.

---

## 2. Technology Stack

- **Engine & Framework:** Unity (Unity Web platform build / WebGL target)
- **Scripting Language:** C#
- **Export Target:** WebGL 2.0 Web Build (HTML5, JavaScript loader, WebAssembly)
- **Frontend Container:** HTML5, CSS3, Vanilla JavaScript

---

## 3. Core Objectives & Implementation Scope

1. **Interactive Environment:**
   - Construct a single-room 3D architectural interior environment.
   - Configure collision boundaries using Unity `BoxCollider` components to constrain player movement within the room perimeter.

2. **Player Controls:**
   - Implement first-person character movement using standard WASD keyboard inputs.
   - Implement first-person mouse-look camera controls with browser pointer lock integration.

3. **Physics Interaction:**
   - Implement raycast-based interaction using `Physics.Raycast()` from the player camera center.
   - Provide visual feedback (e.g. crosshair indication or state change) when interacting with designated objects in the room.

4. **Export & Packaging:**
   - Export an optimized Unity Web build targeting standard desktop web browsers.
   - Ensure the exported build is self-contained within `modules/module3-webgame/`.

---

## 4. Integration Requirements

- **Sandboxed Execution:** The game loads within an HTML `<iframe>` inside the main portal. This ensures pointer lock, keyboard capture, and audio contexts remain scoped to the module and do not block portal UI controls.
- **Relative Path Enforcement:** All loader, data, and wasm files must be referenced relatively to ensure functionality under GitHub Pages hosting.
- **Scope Limit:** The implementation is strictly limited to a small, single-room demonstration prototype rather than a multi-level or complex commercial game.
