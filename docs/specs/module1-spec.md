# Module 1 Specification – WebGL Graphics

## 1. Overview

- **Module Name:** WebGL Graphics
- **Identifier:** `module1-webgl`
- **Official Route:** `#/module1`
- **Physical Directory:** `modules/module1-webgl/`
- **Entry Point:** `modules/module1-webgl/index.html`

This module investigates native browser-based 3D graphics rendering using standard WebGL 2.0 and GLSL ES 3.0 shaders without external 3D libraries or abstractions.

---

## 2. Technology Stack

- **Rendering API:** WebGL 2.0
- **Shading Language:** GLSL ES 3.0 (Vertex and Fragment Shaders)
- **Programming Language:** Vanilla JavaScript (ES6+)
- **External Dependencies:** None. No Three.js, Babylon.js, or math helper libraries unless explicitly approved.

---

## 3. Core Objectives & Implementation Scope

1. **Context Initialization:**
   - Initialize and configure an HTML5 `<canvas>` with a WebGL 2.0 rendering context (`canvas.getContext("webgl2")`).
   - Implement graceful error detection and user fallback notification if WebGL 2.0 is not supported by the client browser.

2. **Shader Pipeline:**
   - Author custom GLSL ES 3.0 vertex shader (`#version 300 es`) handling attribute inputs, uniform MVP matrices, and position outputs.
   - Author custom GLSL ES 3.0 fragment shader handling basic surface lighting/coloring and outputting to `outColor`.
   - Implement shader compilation, program linking, and diagnostic error log reporting.

3. **Geometry & Buffers:**
   - Define vertex attributes (positions, normals, color/UV coordinates) for basic 3D geometry (e.g. cube or geometric solid).
   - Set up Vertex Buffer Objects (VBO) and Vertex Array Objects (VAO) to organize GPU vertex data.

4. **Transformations & Animation:**
   - Implement client-side 4x4 matrix mathematical operations (Model, View, Projection matrices).
   - Implement continuous animation (rotation/oscillation) via `requestAnimationFrame`.

5. **User Interaction:**
   - Provide lightweight DOM controls (e.g. rotation toggle, animation speed slider, or wireframe/shading toggle) to demonstrate interactive parameter updates to shader uniforms.

---

## 4. Integration Requirements

- **Sandboxed Execution:** The module executes within its own document context (`modules/module1-webgl/index.html`) loaded via an `<iframe>` within the main portal.
- **Resource Paths:** All script references and local assets must use relative paths (`./` and `../`).
- **Memory & Lifecycle:** When embedded, the WebGL context must release resources cleanly upon frame unmount or navigation change.
