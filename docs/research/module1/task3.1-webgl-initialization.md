# Module 1 Research Notes — Task 3.1: WebGL 2.0 Initialization & Canvas Lifecycle

- **Module:** Module 01 – WebGL Graphics (`modules/module1-webgl/`)
- **Phase & Task:** Phase 3 – Task 3.1
- **Technologies:** HTML5 `<canvas>`, Vanilla JavaScript (ES6+), WebGL 2.0 (`WebGL2RenderingContext`), Browser Lifecycle APIs (`ResizeObserver`, `requestAnimationFrame`, `pagehide`/`pageshow`, `WEBGL_lose_context`)
- **Date Verified:** 2026-11-10

---

## 1. Research Objective & Theoretical Background

### 1.1. Research Objective

The objective of **Task 3.1** is to investigate and implement the foundational runtime lifecycle required before any 3D geometry or GLSL shaders can be executed in a browser environment:

1. Acquiring a hardware-accelerated **WebGL 2.0 rendering context** (`WebGL2RenderingContext`) from an HTML5 `<canvas>` element and providing a transparent, accessible fallback when WebGL 2.0 is unavailable.
2. Configuring the **default framebuffer**—specifically the **Color Buffer** and **Depth Buffer (Z-buffer)**—and establishing per-frame buffer clearing.
3. Synchronizing the canvas **CSS layout dimensions** (`clientWidth × clientHeight`) with its physical GPU **drawing-buffer resolution** (`canvas.width × canvas.height`) and **Device Pixel Ratio (DPR)** across window resizes and parent container layout changes (such as collapsing or expanding the Web Portal's desktop sidebar).
4. Managing a single-instance **`requestAnimationFrame()` rendering loop** with safeguards against duplicate frame scheduling, alongside **GPU context loss/restoration** (`webglcontextlost` / `webglcontextrestored` preserving intended running/paused state) and page lifecycle management (`pagehide` / `pageshow`).

### 1.2. Theoretical Background

- **HTML5 `<canvas>` vs. `WebGL2RenderingContext`:** The `<canvas>` element is a rectangular bitmap container in the HTML DOM. By itself, it has no drawing logic. Calling `canvas.getContext("webgl2", attributes)` binds an OpenGL ES 3.0 state machine (`WebGL2RenderingContext`) to that canvas and allocates a GPU-backed **default framebuffer**.
- **Framebuffer Attachments (Color Buffer & Depth Buffer):**
  - **Color Buffer (`gl.COLOR_BUFFER_BIT`):** Stores the RGBA color of each pixel. WebGL represents normalized color channels as floating-point numbers in `[0.0, 1.0]`, which are quantized to 8-bit unsigned integers `[0, 255]` in standard `RGBA8` backbuffers.
  - **Depth Buffer (`gl.DEPTH_BUFFER_BIT`):** Also called the **Z-buffer**. Stores a **window-space depth value** $z_w \in [0.0, 1.0]$ for every pixel (`0.0` = near clipping plane, `1.0` = far clipping plane).
- **Coordinate System Distinction — NDC Depth vs. Window-Space Depth:**
  - In WebGL 2.0 (OpenGL ES 3.0), **Normalized Device Coordinates (NDC)** $(x_{\text{ndc}}, y_{\text{ndc}}, z_{\text{ndc}})$ occupy the symmetric cube $[-1.0, +1.0]^3$, where $z_{\text{ndc}} = -1.0$ corresponds to the near clipping plane and $z_{\text{ndc}} = +1.0$ corresponds to the far clipping plane.
  - After clipping and perspective division, the **Viewport Transformation** (`gl.viewport(x, y, width, height)`) maps $(x_{\text{ndc}}, y_{\text{ndc}}) \in [-1.0, +1.0]^2$ to framebuffer pixel coordinates $[x, x + \text{width}] \times [y, y + \text{height}]$.
  - Simultaneously, the **Depth Range Transformation** (`gl.depthRange(zNear, zFar)`, which defaults to `[0.0, 1.0]`) maps $z_{\text{ndc}} \in [-1.0, +1.0]$ into **window-space depth values** $z_w \in [0.0, 1.0]$ via:
    $$z_w = \frac{\text{zFar} - \text{zNear}}{2} \cdot z_{\text{ndc}} + \frac{\text{zFar} + \text{zNear}}{2}$$
  - Both `gl.clearDepth(1.0)` and `gl.depthFunc(gl.LEQUAL)` operate on these **window-space depth values** in $[0.0, 1.0]$ stored in the Depth Buffer, not raw NDC $z_{\text{ndc}}$ coordinates.
- **Two Coordinate Spaces of a Canvas (CSS Pixels vs. Device Pixels):**
  - **CSS Display Size:** Controlled by CSS rules (`width: 100%; height: 100%`) and measured in CSS pixels.
  - **Drawing-Buffer Size:** Controlled by the DOM attributes `canvas.width` and `canvas.height` (which default to `300 × 150` if not updated). If `canvas.width` and `canvas.height` are updated without calling `gl.viewport()`, WebGL renders into an outdated sub-rectangle or clipped region of the canvas.

---

## 2. Relevant WebGL 2.0 & Browser APIs

| API / Interface | Role in Task 3.1 |
|---|---|
| `canvas.getContext("webgl2", attrs)` | Initializes the OpenGL ES 3.0 rendering context with `{ alpha: false, depth: true, stencil: false, antialias: true }`. |
| `gl.clearColor(r, g, b, a)` | Sets the state-machine RGBA values in $[0.0, 1.0]$ used whenever the Color Buffer is cleared. |
| `gl.clearDepth(1.0)` | Sets the state-machine **window-space depth** value ($1.0$ = far clipping plane) written into the Depth Buffer when cleared. |
| `gl.enable(gl.DEPTH_TEST)` | Enables per-fragment Z-buffer depth comparisons in window space. |
| `gl.depthFunc(gl.LEQUAL)` | Passes incoming fragments whose window-space depth $z_w \in [0.0, 1.0]$ is less than or equal to the current Depth Buffer value. |
| `gl.viewport(0, 0, w, h)` | Maps horizontal and vertical Normalized Device Coordinates $(x_{\text{ndc}}, y_{\text{ndc}}) \in [-1, +1]^2$ to the full drawing buffer $(w \times h)$. |
| `gl.clear(COLOR_BUFFER_BIT \| DEPTH_BUFFER_BIT)` | Resets both the Color Buffer and Depth Buffer to their configured clear values. |
| `ResizeObserver` | Observes layout box changes on `#webgl-canvas`, firing both on browser window resizes and when the host Portal sidebar expands or collapses. |
| `window.requestAnimationFrame(cb)` / `cancelAnimationFrame(id)` | Schedules per-frame rendering synchronized with the display refresh rate and cancels pending callbacks on pause/teardown. |
| `webglcontextlost` / `webglcontextrestored` | DOM events on `<canvas>` used to suspend the loop when GPU resources are preempted (`event.preventDefault()`) and restore WebGL state and the prior running/paused state once the GPU recovers. |
| `pagehide` / `pageshow` | Page lifecycle events used to suspend animation during Back/Forward Cache (`bfcache`, `event.persisted === true`) and execute full `destroy()` cleanup on non-persisted document unload. |

---

## 3. Implementation Architecture & Execution Flow

### 3.1. File Structure

- `modules/module1-webgl/index.html`: Standalone and iframe-compatible HTML document containing the read-only telemetry header bar, responsive `.canvas-stage`, accessible `<canvas id="webgl-canvas">`, context-loss overlay (`#context-lost-overlay`), and unsupported-WebGL fallback (`#webgl-fallback`).
- `modules/module1-webgl/style.css`: Module-local stylesheet using relative font imports (`../../css/fonts.css`), dark laboratory navy tokens, and a flex-column `100dvh` stage.
- `modules/module1-webgl/js/main.js`: Modular Vanilla JavaScript lifecycle controller managing context creation, state setup, `ResizeObserver` DPR synchronization, single-instance animation scheduling, context loss recovery, `pagehide`/`pageshow` lifecycle handling, and `window.Module1WebGL` diagnostics.

### 3.2. Runtime Execution Flow

```text
[bootstrap()]
     │
     ├──► exposeEducationalDebugAPI()  ──► Attaches window.Module1WebGL
     ├──► syncCanvasSize()             ──► Measures CSS rect, clamps DPR ≤ 2.0, sets canvas.width/height
     ├──► Register Lifecycle Listeners ──► webglcontextlost, webglcontextrestored, pagehide, pageshow
     ├──► initWebGL2Context(canvas)
     │         │
     │         ├─(null / unsupported)──► showUnsupportedFallback() ──► [Halt safely]
     │         │
     │         └─(WebGL2RenderingContext)
     │                 │
     ├──► configureWebGLState(gl)      ──► gl.clearColor, gl.clearDepth, gl.enable(DEPTH_TEST), gl.depthFunc, gl.viewport
     ├──► setupResizeHandling()        ──► ResizeObserver.observe(canvas) + window resize listener
     └──► startRenderLoop()            ──► Schedules requestAnimationFrame(animationLoopTick) if animationFrameId === null
               │
               ▼
      [animationLoopTick(timestampMs)] (Per Frame)
               │
               ├──► renderFrame(timestampMs) ──► Increments frameCount, calls clearFramebuffer()
               └──► Schedules next requestAnimationFrame if state.isRunning === true
```

---

## 4. Testing Procedures & Actual Observations

All tests below were executed against a local static HTTP server (`http://127.0.0.1`) using headless Google Chrome (Windows x64) via the Chrome DevTools Protocol (CDP):

| Test Case | Procedure | Observed Result | Status |
|---|---|---|---|
| **1. WebGL 2.0 Context & Framebuffer Clearing** | Loaded `modules/module1-webgl/index.html` at `1440 × 900` (DPR `1.0`). Queried `gl.getParameter()` and `gl.readPixels()` at canvas center. | `hasWebGL2: true`, `COLOR_CLEAR_VALUE: [0.06, 0.11, 0.2, 1]`, `DEPTH_CLEAR_VALUE: 1`, `DEPTH_TEST: true`, `DEPTH_FUNC: LEQUAL`. `gl.readPixels` returned `[15, 28, 51, 255]`, matching $\text{round}([0.06, 0.11, 0.20, 1.0] \times 255)$. | **Passed** |
| **2. Console & Asset Loading** | Monitored `Runtime.consoleAPICalled`, `Runtime.exceptionThrown`, `Log.entryAdded`, and `Network.loadingFailed` across standalone and Portal routes. | `Console Errors: []`, `Network Failures: []`. Local WOFF2 fonts (`../../css/fonts.css`), `style.css`, and `js/main.js` loaded with HTTP 200. | **Passed** |
| **3. Responsive Resizing & High-DPR Capping** | Emulated Desktop (`1024 × 768`, DPR `2.0`) and Mobile (`390 × 844`, DPR `3.0`). | At `1024 × 768` (DPR 2.0): CSS size `1024 × 658 px`, drawing buffer `2048 × 1316 px`, `gl.viewport` `[0, 0, 2048, 1316]`. At `390 × 844` (DPR 3.0): CSS size `390 × 716 px`, effective DPR capped at `2.00×`, drawing buffer `780 × 1432 px`. | **Passed** |
| **4. Portal Iframe & Collapsible Sidebar Resize** | Loaded `index.html#/module1` at `1440 × 900` (DPR `1.0`). Clicked `#sidebar-collapse-btn` to collapse (`280px → 72px`) and expand (`72px → 280px`). | Before collapse: `1094 × 469 px`. After collapse: `1302 × 469 px` (`+208 px` width matching `280 - 72 = 208 px`). After expand: `1094 × 469 px`. Drawing buffer and `gl.viewport` updated automatically via `ResizeObserver`. | **Passed** |
| **5. Duplicate Render Loop Prevention & Pause/Resume** | Called `Module1WebGL.resumeLoop()` three times consecutively, then `pauseLoop()` for 200 ms, then `resumeLoop()`. | All three `resumeLoop()` calls returned identical `animationFrameId: 108`. While paused (`animationFrameId: null`), `frameCount` stayed at `107` for 200 ms, then resumed incrementing (`136`) upon `resumeLoop()`. | **Passed** |
| **6A. Context Loss & Restoration (While Running)** | Triggered `simulateContextLoss()` while running, then `simulateContextRestore()`. | On loss: `isContextLost: true`, `isRunning: false`, `shouldRunWhenActive: true`, `#context-lost-overlay` visible, badge `"lost"`. On restore: overlay hid, WebGL state restored, loop resumed (`isRunning: true`). | **Passed** |
| **6B. Context Loss & Restoration (While Manually Paused)** | Called `pauseLoop()`, triggered `simulateContextLoss()`, then `simulateContextRestore()`. | After restore: `isContextLost: false`, `isRunning: false`, `shouldRunWhenActive: false`, `animationFrameId: null`, `badgeState: "paused"` (`"Loop Paused"`), `frameCount` remained unchanged (`172`), and `sampleCenterPixel()` confirmed restored clear color `[15, 28, 51, 255]`. | **Passed** |
| **7. Page Lifecycle (`pagehide` / `pageshow` & `bfcache`)** | Dispatched synthetic `pagehide` (`persisted: true`) followed by `pageshow` (`persisted: true`), and tested iframe reload (`#module-reload-btn`). | Persisted `pagehide` suspended the loop (`isRunning: false, animationFrameId: null`) without destroying observers; persisted `pageshow` resumed rendering (`isRunning: true`). Non-persisted unload on iframe reload executed `destroy()` and initialized a clean session. | **Passed** |
| **8. Unsupported WebGL 2.0 Fallback** | Navigated to `modules/module1-webgl/index.html?webgl=unsupported`. | `hasWebGL2: false`, `isRunning: false`, `#webgl-fallback` visible (`hidden: false`), status badge `"unsupported"` (`"WebGL 2.0 Unsupported"`), zero uncaught errors. | **Passed** |
| **9. Physical Mobile / Non-Chromium Browser Hardware** | Real iOS Safari / Android physical device testing. | Emulated mobile viewports were tested in Chromium; physical mobile hardware and native Safari/Firefox binaries were not executed in this automated test pass. | **Not Tested** |

---

## 5. Technical Limitations Identified

1. **Backbuffer Lifetime (`preserveDrawingBuffer: false`):** By specification, WebGL defaults to `preserveDrawingBuffer: false` so the browser can swap front/back buffers without copying memory. Consequently, calling `gl.readPixels()` asynchronously outside a rendering pass reads a cleared `(0, 0, 0, 255)` buffer unless `gl.clear()` is invoked in the same synchronous execution turn (handled in `Module1WebGL.sampleCenterPixel()`).
2. **DPR Quadratic Pixel Scaling:** Because drawing-buffer pixel count scales as $w \times h \times \text{DPR}^2$, an uncapped `window.devicePixelRatio` of `3.0` allocates $9\times$ as many pixels as `DPR = 1.0` (versus $4\times$ at `DPR = 2.0`). Capping `MAX_DEVICE_PIXEL_RATIO` at `2.0` bounds framebuffer memory allocation and per-fragment workload on high-DPI screens.
3. **Synthetic vs. Hardware Context Loss & BFCache:** While `WEBGL_lose_context` and synthetic `PageTransitionEvent` dispatches verify our event handlers deterministically, real OS-level GPU driver resets or browser-specific `bfcache` eviction policies may still discard the entire document or require a full page reload depending on browser heuristics.

---

## 6. Key Learning Outcomes

- **NDC Depth vs. Window-Space Depth:** In WebGL 2.0, Normalized Device Coordinates span $[-1.0, +1.0]^3$, whereas the Depth Buffer stores window-space depth values in $[0.0, 1.0]$ after the `gl.depthRange(0.0, 1.0)` mapping. `gl.clearDepth(1.0)` and `gl.depthFunc(gl.LEQUAL)` operate in window-space depth $[0.0, 1.0]$.
- **State Machine Discipline & Intended Loop State:** WebGL functions like `gl.clearColor()` and `gl.clearDepth()` only mutate driver state until `gl.clear()` runs. Furthermore, separating active loop state (`isRunning`) from intended user state (`shouldRunWhenActive`) ensures that a manually paused loop is not unexpectedly restarted after GPU context restoration.
- **Container-Driven Resize vs. Window Resize:** Inside a multi-panel application shell (such as our Portal with a collapsible sidebar), the `<canvas>` size can change even when the browser window size stays constant. `ResizeObserver` on the `<canvas>` element is essential for container responsiveness without polling `getBoundingClientRect()` on every animation frame.

---

## 7. Questions for Further Investigation (Leading into Tasks 3.2 & 3.3)

1. When GPU buffers (VBOs, VAOs) and compiled GLSL shader programs are introduced in Tasks 3.2 and 3.3, how must `handleContextRestored()` be extended so that invalidated GPU buffer/program handles are recreated upon context restoration?
2. How does the canvas aspect ratio ($\text{aspect} = \text{drawingBufferWidth} / \text{drawingBufferHeight}$) affect the Perspective Projection Matrix in Task 3.4 when the Portal sidebar expands or collapses?
