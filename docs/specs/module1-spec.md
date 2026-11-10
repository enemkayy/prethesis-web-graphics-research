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

## 5. Rendering Lifecycle & Responsiveness

- The WebGL canvas must adapt to changes in its available display area, including changes caused by the Portal's collapsible sidebar.
- Implement responsive drawing-buffer resizing with appropriate device pixel ratio handling.
- Update the WebGL viewport whenever the drawing-buffer dimensions change.
- Configure depth testing and perspective projection for correct 3D visualization.
- Handle WebGL context loss and restoration gracefully.
- Manage animation loops, event listeners, and GPU resources to avoid unnecessary resource usage.
- Clean up module-owned resources during application teardown where possible.

## 6. Research & Learning Requirements

Module 1 is an academic research prototype. Implementation must prioritize conceptual understanding, readable code, and experimental verification.

The implementation must:

1. Explain the WebGL rendering pipeline, including vertex processing, fragment processing, and framebuffer output.
2. Explain the purpose and behavior of shader programs, VBOs, VAOs, and relevant WebGL API calls.
3. Explain Model, View, and Projection transformations, including the mathematical reasoning behind matrix operations.
4. Explain rendering lifecycle management, animation timing, and canvas resizing.
5. Include meaningful educational comments for non-trivial code, graphics algorithms, shader logic, and mathematical operations.
6. Provide code walkthroughs with references to actual functions and files.
7. Include small hands-on experiments demonstrating important graphics concepts.
8. Document technical limitations, test observations, and key learning outcomes.

All development must follow the Research-Oriented Development Rules defined in `AGENTS.md`.

## 7. Verification & Acceptance Criteria

Module 1 is considered complete when:

- A native WebGL 2.0 context initializes successfully in a supported browser.
- Custom vertex and fragment shaders compile and link successfully.
- Basic 3D geometry is rendered using GPU buffers.
- Model, View, and Projection transformations operate correctly.
- Animation and at least one interactive parameter control work as intended.
- The canvas responds correctly to viewport and container resizing.
- The module runs independently and inside the Portal iframe.
- Portal navigation and sidebar interactions do not break the module.
- Unsupported WebGL environments display an appropriate fallback.
- Rendering lifecycle and resource cleanup behavior have been reviewed and tested where feasible.
- No unhandled application errors occur during the tested scenarios.
- Implementation explanations, research notes, and actual testing observations are documented.

Record the browsers and devices actually tested. Do not claim compatibility or performance results that have not been verified.
