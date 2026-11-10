/**
 * ============================================================================
 * Module 01: WebGL Graphics — Task 3.1, Task 3.2, Task 3.3 & Task 3.4:
 * WebGL 2.0 Lifecycle, GLSL ES 3.00 Shaders, Indexed 3D Cube, MVP Matrices,
 * Time-Based Animation (`deltaTime`) & Interactive DOM Controls
 * ============================================================================
 *
 * Educational Research Overview:
 * This script orchestrates the complete GPU rendering lifecycle for Module 1
 * using native WebGL 2.0 (`WebGL2RenderingContext`) and Vanilla JavaScript:
 *
 * Core Computer Graphics Responsibilities:
 * 1. [Task 3.1] Acquire a WebGL 2.0 context from the HTML5 `<canvas>` element
 *    and present an accessible fallback if WebGL 2.0 is unavailable.
 * 2. [Task 3.1] Configure the default framebuffer's Color Buffer and Depth Buffer
 *    states (`gl.clearColor`, `gl.clearDepth`, `gl.enable(gl.DEPTH_TEST)`,
 *    `gl.depthFunc(gl.LEQUAL)`).
 * 3. [Task 3.1 & 3.3] Synchronize the `<canvas>` GPU drawing-buffer resolution
 *    (`canvas.width` × `canvas.height`) with its CSS layout box (`ResizeObserver`)
 *    and Device Pixel Ratio (`window.devicePixelRatio`), updating both the
 *    affine viewport mapping (`gl.viewport()`) and the 3D Perspective Projection
 *    matrix aspect ratio (`drawingBufferWidth / drawingBufferHeight`).
 * 4. [Task 3.2 & 3.3] Compile GLSL ES 3.00 Vertex and Fragment Shaders, link
 *    them into a `WebGLProgram` (`js/shaders.js`), query matrix uniform locations
 *    (`u_modelMatrix`, `u_viewMatrix`, `u_projectionMatrix`), and allocate the
 *    procedural 3D Cube's Vertex Buffer Object (VBO, 24 face-specific vertices),
 *    Element Array Buffer (EBO, `Uint16Array` of 36 triangle indices), and
 *    Vertex Array Object (VAO) (`js/geometry.js`).
 *    Crucially, shader compilation and buffer creation occur ONCE at startup
 *    (and upon `webglcontextrestored`) — NEVER inside the per-frame render loop.
 * 5. [Task 3.3] Compute 4x4 Column-Major Homogeneous Transformation Matrices
 *    (`js/math.js`):
 *    - **Model Matrix (`u_modelMatrix`):** Transforms local cube vertices from
 *      Object Space to World Space (`M = T * Rz * Ry * Rx * S`).
 *    - **View Matrix (`u_viewMatrix`):** Transforms World Space to Right-Handed
 *      Camera/Eye Space (`lookAt(eye, target, up)`).
 *    - **Projection Matrix (`u_projectionMatrix`):** Transforms Eye Space into
 *      Homogeneous Clip Space (`perspective(fovYRad, aspect, zNear, zFar)`).
 * 6. [Task 3.4] Drive frame-rate-independent continuous 3D rotation using the
 *    `DOMHighResTimeStamp` passed to `requestAnimationFrame(timestampMs)`:
 *      `rotationDeltaDegrees = rotationSpeedDegreesPerSecond * deltaTimeSeconds`
 *    and synchronize lightweight, accessible DOM controls (Auto-Rotate toggle,
 *    Rotation Speed slider, Face/Object Color picker via `gl.bufferSubData()`,
 *    Pause/Resume Rendering button, and Reset Defaults button) with application
 *    state without reallocating GPU resources.
 * 7. [Task 3.1 – 3.4] Handle GPU context loss (`webglcontextlost`) and
 *    restoration (`webglcontextrestored`) by recreating invalidated GPU objects
 *    (program, VBO, EBO, VAO) from retained CPU state (including custom colors,
 *    rotation angles, speed, and Auto-Rotate settings) while preserving the
 *    user's intended running/paused loop state and resetting timing baselines.
 * ============================================================================
 */

(function () {
  "use strict";

  const Math3D = window.Module1Math;
  const Shaders = window.Module1Shaders;
  const Geometry = window.Module1Geometry;

  // --------------------------------------------------------------------------
  // 1. Constants & Initial WebGL / 3D Scene / Animation Configuration
  // --------------------------------------------------------------------------

  /**
   * Maximum Device Pixel Ratio (DPR) multiplier applied to the drawing buffer.
   *
   * WHY CAP DPR AT 2.0?
   * High-DPI desktop and mobile displays often report DPR values of 3.0 or 4.0.
   * Because framebuffer pixel count scales quadratically with DPR
   * (width * DPR * height * DPR = width * height * DPR^2), a DPR of 3.0
   * allocates 9x as many pixels as DPR 1.0 (versus 4x at DPR 2.0). Capping at
   * 2.0 bounds framebuffer memory and per-fragment GPU workload across devices.
   */
  const MAX_DEVICE_PIXEL_RATIO = 2.0;

  /**
   * Default RGBA clear color for the Color Buffer.
   * WebGL normalized color channels use floating-point values in [0.0, 1.0]
   * rather than 8-bit integers [0, 255].
   * Here (0.06, 0.11, 0.20, 1.00) corresponds to a deep laboratory navy (#0F1C33).
   */
  const DEFAULT_CLEAR_COLOR = Object.freeze({
    r: 0.06,
    g: 0.11,
    b: 0.20,
    a: 1.0,
  });

  /**
   * Default initial 3D Model transformation parameters for the Cube.
   *
   * WHY USE AN INITIAL NON-ZERO ROTATION?
   * Starting at `rotationDeg: [18, -28, 0]` tilts the cube slightly forward
   * (`+18°` pitch around X) and turns it (`-28°` yaw around Y) so three adjacent
   * faces (`+Z` Front, `+Y` Top, and `+X` Right) are immediately visible at
   * startup and whenever the user clicks "Reset Defaults".
   */
  const DEFAULT_MODEL_PARAMS = Object.freeze({
    translation: [0.0, 0.0, 0.0],
    rotationDeg: [18.0, -28.0, 0.0],
    scale: [1.0, 1.0, 1.0],
  });

  /**
   * Default fixed Camera and Perspective Projection parameters.
   */
  const DEFAULT_CAMERA_PARAMS = Object.freeze({
    eye: [1.9, 1.5, 2.6],
    target: [0.0, 0.0, 0.0],
    up: [0.0, 1.0, 0.0],
    fovYDeg: 45.0,
    zNear: 0.1,
    zFar: 50.0,
  });

  /**
   * Task 3.4 Time-Based Animation Constants.
   *
   * WHY EXPRESS ANGULAR VELOCITY IN DEGREES PER SECOND (`°/s`)?
   * -----------------------------------------------------------
   * If we rotated the cube by a fixed angle every frame (e.g., `angle += 0.75°`),
   * the visual speed would depend on the user's monitor refresh rate:
   *   - On a 60 Hz display:  `60 frames/s * 0.75°/frame = 45°/s` (1 full turn in 8 s).
   *   - On a 120 Hz display: `120 frames/s * 0.75°/frame = 90°/s` (twice as fast!).
   *   - On a 144 Hz display: `144 frames/s * 0.75°/frame = 108°/s` (2.4x as fast!).
   * By expressing angular velocity $\omega$ in **degrees per second** (`45°/s`
   * default) and multiplying by the elapsed frame time $\Delta t$ in seconds:
   *   $$\Delta \theta = \omega_{\text{deg/s}} \times \Delta t_{\text{seconds}}$$
   * the cube completes one $360^\circ$ revolution in exactly $360 / 45 = 8.0\text{ s}$
   * regardless of whether the display runs at 30 Hz, 60 Hz, 120 Hz, or 144 Hz.
   * (Downstream in `Math3D.composeModelMatrix()`, degrees are converted to
   * radians via `radians = degrees * (Math.PI / 180)` before calling `Math.sin`
   * and `Math.cos`).
   *
   * WHY CLAMP `deltaTimeSeconds` TO `MAX_DELTA_TIME_SECONDS = 0.1` (100 ms)?
   * ------------------------------------------------------------------------
   * If a background tab is throttled, the OS sleeps, or the main thread stalls
   * for several seconds between two `requestAnimationFrame` callbacks, raw
   * `timestampMs - lastFrameTimeMs` could be 5,000 ms (5.0 s). Unclamped,
   * the cube would lurch forward by `45°/s * 5 s = 225°` in a single frame.
   * Clamping `deltaTimeSeconds` to `0.1 s` (equivalent to a 10 FPS floor) bounds
   * the maximum single-frame step to `4.5°` at default speed, keeping motion
   * predictable while we also reset the time baseline (`lastFrameTimeMs = null`)
   * on explicit pause/resume, tab visibility changes, and context restoration.
   */
  const DEFAULT_AUTO_ROTATE = true;
  const DEFAULT_ROTATION_SPEED_DEG_PER_SEC = 45.0;
  const MIN_ROTATION_SPEED_DEG_PER_SEC = 0.0;
  const MAX_ROTATION_SPEED_DEG_PER_SEC = 180.0;
  const MAX_DELTA_TIME_SECONDS = 0.1;
  const DEFAULT_FIXED_STEP_DEG_PER_FRAME = 0.75;
  const DEFAULT_COLOR_HEX = "#5c94ff";

  // --------------------------------------------------------------------------
  // 2. DOM Element References
  // --------------------------------------------------------------------------

  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("webgl-canvas")
  );
  const canvasStage = document.getElementById("canvas-stage");
  const stageCaption = document.getElementById("stage-caption");
  const stageCaptionTitle = document.getElementById("stage-caption-title");
  const stageCaptionText = document.getElementById("stage-caption-text");
  const shaderErrorOverlay = document.getElementById("shader-error-overlay");
  const shaderErrorLog = document.getElementById("shader-error-log");
  const contextLostOverlay = document.getElementById("context-lost-overlay");
  const fallbackOverlay = document.getElementById("webgl-fallback");
  const fallbackReasonEl = document.getElementById("fallback-reason");

  // Telemetry UI elements
  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const telemetryCssSize = document.getElementById("telemetry-css-size");
  const telemetryBufferSize = document.getElementById("telemetry-buffer-size");
  const telemetryDpr = document.getElementById("telemetry-dpr");
  const telemetryGeometry = document.getElementById("telemetry-geometry");
  const telemetryRotation = document.getElementById("telemetry-rotation");
  const telemetryCamera = document.getElementById("telemetry-camera");
  const telemetryClearColor = document.getElementById("telemetry-clear-color");
  const telemetryFrames = document.getElementById("telemetry-frames");

  // Task 3.4 Interactive Control Panel DOM elements
  const controlAutoRotate = /** @type {HTMLInputElement | null} */ (
    document.getElementById("control-auto-rotate")
  );
  const controlAutoRotateState = document.getElementById(
    "control-auto-rotate-state"
  );
  const controlRotationSpeed = /** @type {HTMLInputElement | null} */ (
    document.getElementById("control-rotation-speed")
  );
  const controlSpeedValue = document.getElementById("control-speed-value");
  const controlColorTarget = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("control-color-target")
  );
  const controlObjectColor = /** @type {HTMLInputElement | null} */ (
    document.getElementById("control-object-color")
  );
  const controlColorPaletteBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById("control-color-palette")
  );
  const controlPauseResumeBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById("control-pause-resume")
  );
  const controlResetBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById("control-reset")
  );

  if (!canvas || !canvasStage) {
    return;
  }

  // --------------------------------------------------------------------------
  // 3. Runtime Lifecycle, GPU Resource, 3D Transformation & Animation State
  // --------------------------------------------------------------------------

  /**
   * Centralized application state object.
   *
   * WHY SEPARATE ANIMATION STATE FROM RENDERING STATE?
   * --------------------------------------------------
   * - **Animation State (`state.autoRotate`, `state.rotationSpeedDegPerSec`):**
   *   Governs whether the cube's Euler angles advance as time passes. Disabling
   *   `autoRotate` freezes the cube's orientation at its current angle while
   *   keeping the `requestAnimationFrame` rendering loop alive so interactive
   *   camera/transform experiments continue to render in real time.
   * - **Rendering State (`state.isRunning`, `state.shouldRunWhenActive`):**
   *   Governs whether `requestAnimationFrame` schedules continuous GPU draw
   *   passes. Pausing the rendering loop stops continuous GPU work completely
   *   (0% per-frame scheduling overhead), while still allowing on-demand single
   *   redraws (`drawScene()`) when the user resizes the window, changes a face
   *   color, or resets the scene.
   */
  const state = {
    /** @type {WebGL2RenderingContext | null} */
    gl: null,
    /** @type {WebGLProgram | null} Linked GLSL ES 3.00 shader program */
    program: null,
    /**
     * @type {{
     *   modelMatrix: WebGLUniformLocation | null,
     *   viewMatrix: WebGLUniformLocation | null,
     *   projectionMatrix: WebGLUniformLocation | null
     * } | null}
     */
    uniformLocations: null,
    /**
     * @type {"cube" | "triangle"} Active mesh mode (`"cube"` is Task 3.3/3.4 default;
     * `"triangle"` is preserved for Task 3.2 educational continuity).
     */
    meshMode: "cube",
    /**
     * @type {{
     *   meshType: "cube" | "triangle",
     *   indexed: boolean,
     *   vao: WebGLVertexArrayObject | null,
     *   vbo: WebGLBuffer | null,
     *   ebo: WebGLBuffer | null,
     *   vertexData: Float32Array,
     *   indexData: Uint16Array | null,
     *   vertexCount: number,
     *   indexCount: number,
     *   indexType: number,
     *   strideBytes: number,
     *   positionOffsetBytes: number,
     *   colorOffsetBytes: number,
     *   byteLength: number,
     *   indexByteLength: number
     * } | null}
     */
    geometry: null,
    /** @type {Float32Array} Retained CPU copy of 3D cube vertices (144 floats = 576 bytes) */
    cpuCubeVertexData: Geometry
      ? Geometry.createDefaultCubeVertexData()
      : new Float32Array(144),
    /** @type {Uint16Array} Retained CPU copy of 3D cube indices (36 uint16 = 72 bytes) */
    cpuCubeIndexData: Geometry
      ? Geometry.createDefaultCubeIndexData()
      : new Uint16Array(36),
    /** @type {Float32Array} Retained CPU copy of Task 3.2 triangle vertices (18 floats) */
    cpuTriangleVertexData: Geometry
      ? Geometry.createDefaultVertexData()
      : new Float32Array(18),
    /** @type {{ strideBytes: number, positionOffsetBytes: number, colorOffsetBytes: number }} */
    attributeLayout: {
      strideBytes: Geometry ? Geometry.DEFAULT_STRIDE_BYTES : 24,
      positionOffsetBytes: Geometry ? Geometry.DEFAULT_POSITION_OFFSET_BYTES : 0,
      colorOffsetBytes: Geometry ? Geometry.DEFAULT_COLOR_OFFSET_BYTES : 12,
    },
    /** @type {{ translation: [number, number, number], rotationDeg: [number, number, number], scale: [number, number, number] }} */
    modelParams: {
      translation: [...DEFAULT_MODEL_PARAMS.translation],
      rotationDeg: [...DEFAULT_MODEL_PARAMS.rotationDeg],
      scale: [...DEFAULT_MODEL_PARAMS.scale],
    },
    /** @type {{ eye: [number, number, number], target: [number, number, number], up: [number, number, number], fovYDeg: number, zNear: number, zFar: number, aspect: number }} */
    cameraParams: {
      eye: [...DEFAULT_CAMERA_PARAMS.eye],
      target: [...DEFAULT_CAMERA_PARAMS.target],
      up: [...DEFAULT_CAMERA_PARAMS.up],
      fovYDeg: DEFAULT_CAMERA_PARAMS.fovYDeg,
      zNear: DEFAULT_CAMERA_PARAMS.zNear,
      zFar: DEFAULT_CAMERA_PARAMS.zFar,
      aspect: 1.0,
    },
    /** @type {Float32Array} 4x4 Column-Major Model Matrix */
    modelMatrix: Math3D
      ? Math3D.createIdentityMatrix()
      : new Float32Array(16),
    /** @type {Float32Array} 4x4 Column-Major View Matrix */
    viewMatrix: Math3D
      ? Math3D.createIdentityMatrix()
      : new Float32Array(16),
    /** @type {Float32Array} 4x4 Column-Major Perspective Projection Matrix */
    projectionMatrix: Math3D
      ? Math3D.createIdentityMatrix()
      : new Float32Array(16),
    /** @type {Float32Array} 4x4 Identity Matrix used when rendering in clip-space triangle mode */
    identityMatrix: Math3D
      ? Math3D.createIdentityMatrix()
      : new Float32Array(16),
    /** @type {boolean} Task 3.4: True when automatic time-based rotation is active */
    autoRotate: DEFAULT_AUTO_ROTATE,
    /** @type {number} Task 3.4: Angular velocity in degrees per second (0..180) */
    rotationSpeedDegPerSec: DEFAULT_ROTATION_SPEED_DEG_PER_SEC,
    /**
     * @type {boolean} Educational comparison mode for Experiment 1: when true,
     * increments rotation by `fixedStepDegPerFrame` each frame instead of `speed * dt`.
     */
    fixedStepMode: false,
    /** @type {number} Fixed angle per frame used only when `fixedStepMode === true` */
    fixedStepDegPerFrame: DEFAULT_FIXED_STEP_DEG_PER_FRAME,
    /** @type {string} Currently selected face target in `#control-color-target` (`"all"` or `"0".."5"`) */
    colorTarget: "all",
    /** @type {string} Currently selected hex color in `#control-object-color` */
    selectedColorHex: DEFAULT_COLOR_HEX,
    /** @type {boolean} True when the cube's VBO holds the canonical 6-face palette */
    isDefaultPalette: true,
    /** @type {string} Active WebGL primitive assembly mode name */
    primitiveModeName: "TRIANGLES",
    /** @type {number | null} Active GLenum primitive mode (e.g., gl.TRIANGLES) */
    primitiveMode: null,
    /** @type {string | null} Most recent shader/program compilation diagnostic error */
    lastShaderError: null,
    /** @type {number | null} Active requestAnimationFrame ID; null when stopped */
    animationFrameId: null,
    /** @type {boolean} True when the requestAnimationFrame rendering loop is actively running */
    isRunning: false,
    /**
     * @type {boolean} Preserves whether the user intended the loop to be running
     * prior to a temporary interruption (such as `webglcontextlost` or `bfcache`
     * `pagehide`), so a manually paused loop stays paused upon restoration.
     */
    shouldRunWhenActive: true,
    /** @type {boolean} True while between webglcontextlost and webglcontextrestored */
    isContextLost: false,
    /** @type {boolean} True after destroy() has been called on non-persisted unload */
    isDestroyed: false,
    /** @type {number} Total frames rendered by the requestAnimationFrame loop */
    frameCount: 0,
    /**
     * @type {number | null} High-resolution timestamp (ms) of the previous rendered
     * frame, or `null` when resetting the timing baseline after startup, pause,
     * tab visibility change, or context restoration.
     */
    lastFrameTimeMs: null,
    /** @type {number} Most recent unclamped elapsed frame time in seconds */
    lastRawDeltaSeconds: 0.0,
    /** @type {number} Most recent clamped elapsed frame time in seconds (`<= 0.1s`) */
    lastDeltaSeconds: 0.0,
    /** @type {number} Cumulative animated duration in seconds */
    totalAnimatedSeconds: 0.0,
    /** @type {number} Diagnostic counter: total shader program compilations */
    shaderCompileCount: 0,
    /** @type {number} Diagnostic counter: total VAO/VBO/EBO allocations */
    geometryAllocCount: 0,
    /** @type {number} Diagnostic counter: total in-place VBO `gl.bufferSubData` updates */
    vboSubDataUpdateCount: 0,
    /** @type {number} Current CSS layout width of the canvas in CSS pixels */
    cssWidth: 0,
    /** @type {number} Current CSS layout height of the canvas in CSS pixels */
    cssHeight: 0,
    /** @type {number} Current effective Device Pixel Ratio */
    effectiveDpr: 1,
    /** @type {{ r: number, g: number, b: number, a: number }} Active clear color */
    clearColor: { ...DEFAULT_CLEAR_COLOR },
    /** @type {ResizeObserver | null} Observer tracking canvas layout changes */
    resizeObserver: null,
    /** @type {WEBGL_lose_context | null} Cached extension for testing context loss */
    loseContextExt: null,
  };

  // --------------------------------------------------------------------------
  // 4. 3D Matrix Recomputation & Angle Wrapping Helpers
  // --------------------------------------------------------------------------

  /**
   * Wraps an Euler angle in degrees into the canonical interval `[-180.0, +180.0)`.
   * Keeping animated angles bounded prevents floating-point precision drift over
   * long sessions and keeps the telemetry readout concise.
   *
   * @param {number} degrees Angle in degrees
   * @returns {number} Wrapped angle in `[-180, 180)`
   */
  function wrapAngleDegrees(degrees) {
    let wrapped = ((Number(degrees) || 0.0) + 180.0) % 360.0;
    if (wrapped < 0.0) {
      wrapped += 360.0;
    }
    return wrapped - 180.0;
  }

  /**
   * Recomputes `state.modelMatrix` from `state.modelParams` (`M = T * Rz * Ry * Rx * S`).
   *
   * WHY UPDATE `u_modelMatrix` DURING ANIMATION INSTEAD OF VBO VERTICES?
   * --------------------------------------------------------------------
   * Rotating a mesh by modifying its 24 vertex positions on the CPU and calling
   * `gl.bufferSubData()` every frame would require transforming every vertex in
   * JavaScript and streaming vertex arrays across the CPU-to-GPU bus at 60–144 Hz
   * (which becomes a severe bottleneck for meshes with thousands of vertices).
   * Instead, the 24 local-space cube vertices (`[-0.5, +0.5]^3`) remain completely
   * static in GPU VBO memory, and the CPU only recomputes a single 16-float
   * `u_modelMatrix` once per frame, letting the massively parallel GPU Vertex
   * Shader transform all vertices simultaneously.
   */
  function updateModelMatrix() {
    if (!Math3D) {
      return;
    }
    Math3D.composeModelMatrix(state.modelParams, state.modelMatrix);
  }

  /**
   * Recomputes `state.viewMatrix` from `state.cameraParams` (`lookAt(eye, target, up)`).
   */
  function updateViewMatrix() {
    if (!Math3D) {
      return;
    }
    Math3D.lookAt(
      state.cameraParams.eye,
      state.cameraParams.target,
      state.cameraParams.up,
      state.viewMatrix
    );
  }

  /**
   * Recomputes `state.projectionMatrix` using the current drawing-buffer aspect
   * ratio (`canvas.width / canvas.height`) and camera frustum parameters.
   */
  function updateProjectionMatrix() {
    if (!Math3D || !canvas) {
      return;
    }
    const bufW = Math.max(1, canvas.width || 1);
    const bufH = Math.max(1, canvas.height || 1);
    const aspect = bufW / bufH;
    state.cameraParams.aspect = aspect;

    Math3D.perspective(
      Math3D.degToRad(state.cameraParams.fovYDeg),
      aspect,
      state.cameraParams.zNear,
      state.cameraParams.zFar,
      state.projectionMatrix
    );
  }

  /**
   * Recomputes all three 3D transformation matrices (`Model`, `View`, `Projection`).
   */
  function updateAllMatrices() {
    updateModelMatrix();
    updateViewMatrix();
    updateProjectionMatrix();
  }

  /**
   * Resets the animation timestamp baseline (`state.lastFrameTimeMs = null`) so
   * that the next scheduled `requestAnimationFrame` callback establishes a fresh
   * time reference with `deltaTimeSeconds = 0`, preventing a sudden rotation jump
   * after any pause, tab switch, or GPU context loss.
   */
  function resetAnimationTimeBaseline() {
    state.lastFrameTimeMs = null;
    state.lastRawDeltaSeconds = 0.0;
    state.lastDeltaSeconds = 0.0;
  }

  // --------------------------------------------------------------------------
  // 5. Telemetry & Interactive Control UI Synchronization
  // --------------------------------------------------------------------------

  /**
   * Updates the status badge in the top telemetry bar.
   *
   * @param {"active" | "paused" | "lost" | "unsupported"} mode Visual status token
   * @param {string} label Human-readable status text
   */
  function updateStatusBadge(mode, label) {
    if (statusPill) {
      statusPill.setAttribute("data-state", mode);
    }
    if (statusText) {
      statusText.textContent = label;
    }
  }

  /**
   * Synchronizes the read-only telemetry bar and stage caption with current
   * canvas, buffer, geometry, rotation, and camera metrics.
   */
  function updateTelemetryDisplay() {
    if (telemetryCssSize) {
      telemetryCssSize.textContent = `${state.cssWidth} × ${state.cssHeight} px`;
    }
    if (telemetryBufferSize && canvas) {
      telemetryBufferSize.textContent = `${canvas.width} × ${canvas.height} px`;
    }
    if (telemetryDpr) {
      telemetryDpr.textContent = `${state.effectiveDpr.toFixed(2)}×`;
    }
    if (telemetryGeometry) {
      const vCount = state.geometry ? state.geometry.vertexCount : 0;
      const iCount = state.geometry ? state.geometry.indexCount : 0;
      const stride = state.geometry
        ? state.geometry.strideBytes
        : state.attributeLayout.strideBytes;
      if (state.geometry && state.geometry.indexed) {
        telemetryGeometry.textContent = `${vCount} verts · ${iCount} idx · ${stride}B`;
      } else {
        telemetryGeometry.textContent = `${vCount} verts · ${stride}B stride`;
      }
    }
    if (telemetryRotation) {
      const [rx, ry, rz] = state.modelParams.rotationDeg;
      telemetryRotation.textContent = `(${Math.round(rx)}°, ${Math.round(ry)}°, ${Math.round(rz)}°)`;
    }
    if (telemetryCamera) {
      const fov = state.cameraParams.fovYDeg.toFixed(0);
      const aspect = state.cameraParams.aspect.toFixed(2);
      telemetryCamera.textContent = `FOV ${fov}° · Aspect ${aspect}`;
    }
    if (telemetryClearColor) {
      const { r, g, b, a } = state.clearColor;
      telemetryClearColor.textContent = `(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)})`;
    }
    if (telemetryFrames) {
      telemetryFrames.textContent = String(state.frameCount);
    }
    if (stageCaptionTitle && stageCaptionText) {
      if (state.geometry && state.geometry.indexed) {
        stageCaptionTitle.textContent =
          "GLSL ES 3.00 3D Pipeline · VAO + VBO (24v) + EBO (Uint16Array 36i)";
        const rotModeLabel = state.autoRotate
          ? `Auto-Rotate ${Math.round(state.rotationSpeedDegPerSec)}°/s`
          : "Auto-Rotate Off";
        stageCaptionText.textContent = `gl.drawElements(gl.${state.primitiveModeName}, ${state.geometry.indexCount}, gl.UNSIGNED_SHORT, 0) · ${rotModeLabel}`;
      } else {
        const vCount = state.geometry ? state.geometry.vertexCount : 3;
        stageCaptionTitle.textContent =
          "GLSL ES 3.00 Pipeline · VAO + Interleaved VBO (Float32Array)";
        stageCaptionText.textContent = `gl.drawArrays(gl.${state.primitiveModeName}, 0, ${vCount}) · Attributes: a_position (loc 0), a_color (loc 1)`;
      }
    }
  }

  /**
   * Synchronizes all Task 3.4 DOM controls (`#control-auto-rotate`,
   * `#control-rotation-speed`, `#control-color-target`, `#control-object-color`,
   * `#control-pause-resume`) with the single source of truth in `state`.
   *
   * Calling this function from both DOM event handlers AND programmatic
   * `window.Module1WebGL` helpers guarantees that DevTools experiments never
   * leave the UI controls out of sync with the actual rendering state.
   */
  function syncControlsUI() {
    if (controlAutoRotate) {
      controlAutoRotate.checked = Boolean(state.autoRotate);
    }
    if (controlAutoRotateState) {
      controlAutoRotateState.textContent = state.autoRotate ? "On" : "Off";
      controlAutoRotateState.setAttribute(
        "data-active",
        state.autoRotate ? "true" : "false"
      );
    }
    if (controlRotationSpeed) {
      const roundedSpeed = Math.round(state.rotationSpeedDegPerSec);
      controlRotationSpeed.value = String(roundedSpeed);
    }
    if (controlSpeedValue) {
      const roundedSpeed = Math.round(state.rotationSpeedDegPerSec);
      controlSpeedValue.textContent = `${roundedSpeed}°/s`;
    }
    if (controlColorTarget) {
      controlColorTarget.value = String(state.colorTarget);
    }
    if (controlObjectColor) {
      controlObjectColor.value = state.selectedColorHex;
    }
    if (controlPauseResumeBtn) {
      const isPaused = !state.isRunning;
      controlPauseResumeBtn.textContent = isPaused
        ? "Resume Rendering"
        : "Pause Rendering";
      controlPauseResumeBtn.setAttribute(
        "aria-pressed",
        isPaused ? "true" : "false"
      );
    }
  }

  /**
   * Displays the accessible fallback overlay when WebGL 2.0 is unavailable.
   *
   * @param {string} [customReason] Optional explanation message
   */
  function showUnsupportedFallback(customReason) {
    updateStatusBadge("unsupported", "WebGL 2.0 Unsupported");
    if (customReason && fallbackReasonEl) {
      fallbackReasonEl.textContent = customReason;
    }
    if (fallbackOverlay) {
      fallbackOverlay.hidden = false;
    }
    if (stageCaption) {
      stageCaption.hidden = true;
    }
  }

  /**
   * Displays or hides the GLSL shader/program compilation diagnostic overlay.
   *
   * @param {string | null} errorMessage Diagnostic info log, or null to hide
   */
  function updateShaderErrorOverlay(errorMessage) {
    state.lastShaderError = errorMessage;
    if (!shaderErrorOverlay || !shaderErrorLog) {
      return;
    }
    if (errorMessage) {
      shaderErrorLog.textContent = errorMessage;
      shaderErrorOverlay.hidden = false;
      updateStatusBadge("unsupported", "GLSL Pipeline Error");
    } else {
      shaderErrorLog.textContent = "";
      shaderErrorOverlay.hidden = true;
    }
  }

  // --------------------------------------------------------------------------
  // 6. WebGL 2.0 Context Initialization & GPU Pipeline State Configuration
  // --------------------------------------------------------------------------

  /**
   * Checks whether the current URL includes `?webgl=unsupported` or `?nowebgl=1`.
   *
   * @returns {boolean} True if fallback simulation is requested via URL query
   */
  function isUnsupportedSimulationRequested() {
    try {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("webgl") === "unsupported" || params.get("nowebgl") === "1"
      );
    } catch (_err) {
      return false;
    }
  }

  /**
   * Acquires the native `WebGL2RenderingContext` from the `<canvas>` element.
   *
   * @param {HTMLCanvasElement} targetCanvas The DOM canvas element
   * @returns {WebGL2RenderingContext | null} The initialized WebGL 2.0 context,
   *          or `null` if WebGL 2.0 is unavailable or simulated as unsupported.
   */
  function initWebGL2Context(targetCanvas) {
    if (isUnsupportedSimulationRequested()) {
      showUnsupportedFallback(
        "Simulated unsupported environment via URL query parameter (?webgl=unsupported). Native WebGL2RenderingContext initialization was intentionally bypassed for verification."
      );
      return null;
    }

    const contextAttributes = {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: true,
      powerPreference: "default",
    };

    let gl = null;
    try {
      gl = /** @type {WebGL2RenderingContext | null} */ (
        targetCanvas.getContext("webgl2", contextAttributes)
      );
    } catch (_err) {
      gl = null;
    }

    if (!gl) {
      showUnsupportedFallback();
      return null;
    }

    return gl;
  }

  /**
   * Configures the baseline OpenGL ES 3.0 / WebGL 2.0 state machine on the context.
   *
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 rendering context
   */
  function configureWebGLState(gl) {
    const { r, g, b, a } = state.clearColor;

    gl.clearColor(r, g, b, a);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    if (state.primitiveMode === null) {
      state.primitiveMode = gl.TRIANGLES;
    }
  }

  /**
   * Compiles the GLSL ES 3.00 shaders, links the `WebGLProgram`, and creates
   * the active mesh's GPU buffers (VAO + VBO + EBO for `"cube"`, or VAO + VBO
   * for `"triangle"`).
   *
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 rendering context
   * @param {string} [customVertexSource] Optional custom vertex shader source
   * @param {string} [customFragmentSource] Optional custom fragment shader source
   * @returns {boolean} True if both shader program and geometry succeeded
   */
  function initSceneResources(gl, customVertexSource, customFragmentSource) {
    if (!Shaders || !Geometry) {
      console.error(
        "[Module1 WebGL] Shaders or Geometry module is missing. Verify script load order in index.html."
      );
      return false;
    }

    releaseGpuResources();

    const vSource = customVertexSource || Shaders.VERTEX_SHADER_SOURCE;
    const fSource = customFragmentSource || Shaders.FRAGMENT_SHADER_SOURCE;

    let newProgram = null;
    let newGeometry = null;

    try {
      const compiled = Shaders.createShaderProgram(gl, vSource, fSource);
      newProgram = compiled.program;
      state.shaderCompileCount += 1;

      if (state.meshMode === "triangle") {
        newGeometry = Geometry.createTriangleGeometry(
          gl,
          Shaders.ATTRIBUTE_LOCATIONS,
          state.cpuTriangleVertexData,
          state.attributeLayout
        );
      } else {
        newGeometry = Geometry.createCubeGeometry(
          gl,
          Shaders.ATTRIBUTE_LOCATIONS,
          state.cpuCubeVertexData,
          state.cpuCubeIndexData,
          state.attributeLayout
        );
      }
      state.geometryAllocCount += 1;

      state.program = newProgram;
      state.uniformLocations = compiled.uniformLocations;
      state.geometry = newGeometry;
      updateShaderErrorOverlay(null);
      updateTelemetryDisplay();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Module1 WebGL] GPU resource initialization failed:\n", message);
      if (newProgram) {
        Shaders.deleteShaderProgram(gl, newProgram);
        newProgram = null;
      }
      if (newGeometry) {
        Geometry.deleteGeometryResources(gl, newGeometry);
        newGeometry = null;
      }
      releaseGpuResources();
      updateShaderErrorOverlay(message);
      updateTelemetryDisplay();
      return false;
    }
  }

  /**
   * Safely deletes the linked `WebGLProgram`, `WebGLVertexArrayObject` (VAO),
   * `WebGLBuffer` (VBO), and `WebGLBuffer` (EBO) when the context is still valid.
   */
  function releaseGpuResources() {
    const gl = state.gl;
    if (gl && !state.isContextLost && !gl.isContextLost()) {
      if (Shaders && state.program) {
        Shaders.deleteShaderProgram(gl, state.program);
      }
      if (Geometry && state.geometry) {
        Geometry.deleteGeometryResources(gl, state.geometry);
      }
    }
    state.program = null;
    state.uniformLocations = null;
    state.geometry = null;
  }

  // --------------------------------------------------------------------------
  // 7. Responsive Drawing-Buffer Resizing, Aspect Ratio & DPR Synchronization
  // --------------------------------------------------------------------------

  /**
   * Synchronizes the `<canvas>` GPU drawing-buffer dimensions (`canvas.width`
   * and `canvas.height`) with its CSS layout box and Device Pixel Ratio, then
   * updates `gl.viewport()` and recalculates `state.projectionMatrix`.
   *
   * @param {number} [observedCssWidth] Optional CSS width from ResizeObserverEntry
   * @param {number} [observedCssHeight] Optional CSS height from ResizeObserverEntry
   * @returns {boolean} True if the drawing buffer was resized; false if unchanged
   */
  function syncCanvasSize(observedCssWidth, observedCssHeight) {
    if (!canvas || state.isDestroyed) {
      return false;
    }

    let rawCssWidth = observedCssWidth;
    let rawCssHeight = observedCssHeight;

    if (typeof rawCssWidth !== "number" || typeof rawCssHeight !== "number") {
      const rect = canvas.getBoundingClientRect();
      rawCssWidth = rect.width;
      rawCssHeight = rect.height;
    }

    const cssWidth = Math.max(1, Math.round(rawCssWidth));
    const cssHeight = Math.max(1, Math.round(rawCssHeight));

    const rawDpr = window.devicePixelRatio || 1;
    const effectiveDpr = Math.min(Math.max(rawDpr, 1), MAX_DEVICE_PIXEL_RATIO);

    const targetBufferWidth = Math.max(1, Math.round(cssWidth * effectiveDpr));
    const targetBufferHeight = Math.max(1, Math.round(cssHeight * effectiveDpr));

    const cssChanged =
      state.cssWidth !== cssWidth ||
      state.cssHeight !== cssHeight ||
      state.effectiveDpr !== effectiveDpr;

    const bufferChanged =
      canvas.width !== targetBufferWidth ||
      canvas.height !== targetBufferHeight;

    state.cssWidth = cssWidth;
    state.cssHeight = cssHeight;
    state.effectiveDpr = effectiveDpr;

    if (bufferChanged) {
      canvas.width = targetBufferWidth;
      canvas.height = targetBufferHeight;

      if (state.gl && !state.isContextLost) {
        state.gl.viewport(
          0,
          0,
          state.gl.drawingBufferWidth,
          state.gl.drawingBufferHeight
        );
      }

      updateProjectionMatrix();
    }

    if (cssChanged || bufferChanged) {
      updateTelemetryDisplay();
    }

    return bufferChanged;
  }

  /**
   * Sets up a `ResizeObserver` on the `<canvas>` element so the drawing buffer
   * and perspective projection adapt whenever the viewport, iframe container,
   * or Portal collapsible sidebar changes size.
   */
  function setupResizeHandling() {
    if (!canvas) {
      return;
    }

    if (typeof ResizeObserver === "function") {
      state.resizeObserver = new ResizeObserver((entries) => {
        if (state.isDestroyed) {
          return;
        }
        for (const entry of entries) {
          if (entry.target === canvas) {
            const width = entry.contentRect
              ? entry.contentRect.width
              : canvas.clientWidth;
            const height = entry.contentRect
              ? entry.contentRect.height
              : canvas.clientHeight;
            syncCanvasSize(width, height);

            // Repaint the 3D scene immediately after resize (even when the
            // rendering loop is manually paused) so the canvas never turns blank
            // after `canvas.width` / `canvas.height` reallocation.
            drawScene();
          }
        }
      });

      state.resizeObserver.observe(canvas);
    }

    window.addEventListener("resize", handleWindowResize);
  }

  /**
   * Window `resize` event callback to catch Device Pixel Ratio (browser zoom)
   * changes or window resizes.
   */
  function handleWindowResize() {
    if (state.isDestroyed) {
      return;
    }
    if (syncCanvasSize()) {
      drawScene();
    }
  }

  // --------------------------------------------------------------------------
  // 8. Per-Frame Rendering & Time-Based Animation Loop (`deltaTime`)
  // --------------------------------------------------------------------------

  /**
   * Clears the default framebuffer's Color Buffer and Depth Buffer.
   */
  function clearFramebuffer() {
    const gl = state.gl;
    if (!gl || state.isContextLost || state.isDestroyed) {
      return;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Renders the current scene into the default framebuffer without advancing
   * animation time or incrementing the `requestAnimationFrame` counter.
   *
   * WHY `drawScene()` IS SEPARATE FROM `renderFrame(timestampMs)`:
   * --------------------------------------------------------------
   * When the user pauses continuous rendering (`Pause Rendering`), we stop
   * scheduling `requestAnimationFrame` callbacks. However, if the user resizes
   * the browser window, collapses the Portal sidebar, picks a new cube color,
   * or clicks `Reset Defaults` while paused, the canvas still needs a single
   * immediate repaint to reflect that change without restarting the continuous
   * animation loop or advancing `frameCount`.
   */
  function drawScene() {
    const gl = state.gl;
    if (!gl || state.isContextLost || state.isDestroyed) {
      return;
    }

    clearFramebuffer();

    if (!state.program || !state.geometry || !state.geometry.vao) {
      return;
    }

    gl.useProgram(state.program);

    if (state.uniformLocations) {
      const useIdentity = state.meshMode === "triangle";
      const mMat = useIdentity ? state.identityMatrix : state.modelMatrix;
      const vMat = useIdentity ? state.identityMatrix : state.viewMatrix;
      const pMat = useIdentity ? state.identityMatrix : state.projectionMatrix;

      if (state.uniformLocations.modelMatrix !== null) {
        gl.uniformMatrix4fv(state.uniformLocations.modelMatrix, false, mMat);
      }
      if (state.uniformLocations.viewMatrix !== null) {
        gl.uniformMatrix4fv(state.uniformLocations.viewMatrix, false, vMat);
      }
      if (state.uniformLocations.projectionMatrix !== null) {
        gl.uniformMatrix4fv(state.uniformLocations.projectionMatrix, false, pMat);
      }
    }

    gl.bindVertexArray(state.geometry.vao);

    const mode =
      typeof state.primitiveMode === "number" ? state.primitiveMode : gl.TRIANGLES;

    if (state.geometry.indexed) {
      gl.drawElements(
        mode,
        state.geometry.indexCount,
        state.geometry.indexType,
        0
      );
    } else {
      gl.drawArrays(mode, 0, state.geometry.vertexCount);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Executes one scheduled animation frame pass:
   * 1. Computes `deltaTimeSeconds` from the browser's `DOMHighResTimeStamp`.
   * 2. Clamps unusually large intervals (`> 0.1 s`) caused by tab backgrounding.
   * 3. If `state.autoRotate` is enabled, advances `state.modelParams.rotationDeg[1]`
   *    by `rotationSpeedDegPerSec * deltaTimeSeconds` and updates `state.modelMatrix`.
   * 4. Calls `drawScene()` to render the frame and updates telemetry periodically.
   *
   * @param {DOMHighResTimeStamp} timestampMs High-resolution timestamp from rAF
   */
  function renderFrame(timestampMs) {
    if (!state.gl || state.isContextLost || state.isDestroyed) {
      return;
    }

    let rawDeltaSeconds = 0.0;
    if (
      typeof timestampMs === "number" &&
      state.lastFrameTimeMs !== null &&
      timestampMs >= state.lastFrameTimeMs
    ) {
      rawDeltaSeconds = (timestampMs - state.lastFrameTimeMs) / 1000.0;
    }

    if (typeof timestampMs === "number") {
      state.lastFrameTimeMs = timestampMs;
    }

    const clampedDeltaSeconds = Math.min(
      Math.max(0.0, rawDeltaSeconds),
      MAX_DELTA_TIME_SECONDS
    );
    state.lastRawDeltaSeconds = rawDeltaSeconds;
    state.lastDeltaSeconds = clampedDeltaSeconds;

    if (state.autoRotate && state.meshMode === "cube") {
      const rotationDeltaDegrees = state.fixedStepMode
        ? state.fixedStepDegPerFrame
        : state.rotationSpeedDegPerSec * clampedDeltaSeconds;

      if (rotationDeltaDegrees !== 0.0) {
        state.modelParams.rotationDeg[1] = wrapAngleDegrees(
          state.modelParams.rotationDeg[1] + rotationDeltaDegrees
        );
        state.totalAnimatedSeconds += clampedDeltaSeconds;
        updateModelMatrix();
      }
    }

    state.frameCount += 1;

    drawScene();

    if (state.frameCount <= 5 || state.frameCount % 6 === 0) {
      if (telemetryFrames) {
        telemetryFrames.textContent = String(state.frameCount);
      }
      if (telemetryRotation) {
        const [rx, ry, rz] = state.modelParams.rotationDeg;
        telemetryRotation.textContent = `(${Math.round(rx)}°, ${Math.round(ry)}°, ${Math.round(rz)}°)`;
      }
    }
  }

  /**
   * Internal `requestAnimationFrame` callback that renders one frame and
   * schedules the next tick only if the loop is still active.
   *
   * @param {DOMHighResTimeStamp} timestampMs High-resolution timestamp from browser
   */
  function animationLoopTick(timestampMs) {
    state.animationFrameId = null;

    if (!state.isRunning || state.isContextLost || state.isDestroyed) {
      return;
    }

    renderFrame(timestampMs);

    if (state.isRunning && state.animationFrameId === null) {
      state.animationFrameId = window.requestAnimationFrame(animationLoopTick);
    }
  }

  /**
   * Starts or resumes the `requestAnimationFrame` rendering loop with
   * duplicate-scheduling protection and resets the animation time baseline
   * when transitioning from a stopped state so no delta-time jump occurs.
   */
  function startRenderLoop() {
    if (state.isDestroyed || !state.gl) {
      return;
    }

    const wasRunning = state.isRunning;
    state.shouldRunWhenActive = true;

    if (state.isContextLost) {
      syncControlsUI();
      return;
    }

    if (!wasRunning) {
      resetAnimationTimeBaseline();
    }

    state.isRunning = true;
    updateStatusBadge("active", "WebGL 2.0 Active");
    syncControlsUI();

    if (state.animationFrameId === null) {
      state.animationFrameId = window.requestAnimationFrame(animationLoopTick);
    }
  }

  /**
   * Cancels any pending `requestAnimationFrame` callback and marks the loop
   * as stopped.
   *
   * @param {boolean} [isUserPause=true] True when explicitly paused by the user;
   *        false when suspended internally due to context loss, bfcache, or teardown.
   */
  function stopRenderLoop(isUserPause = true) {
    state.isRunning = false;
    if (isUserPause) {
      state.shouldRunWhenActive = false;
    }

    if (state.animationFrameId !== null) {
      window.cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    resetAnimationTimeBaseline();

    if (isUserPause && !state.isContextLost && !state.isDestroyed) {
      updateStatusBadge("paused", "Loop Paused");
      updateTelemetryDisplay();
    }
    syncControlsUI();
  }

  // --------------------------------------------------------------------------
  // 9. Interactive Control State Mutators & DOM Event Handlers (Task 3.4)
  // --------------------------------------------------------------------------

  /**
   * Enables or disables automatic time-based cube rotation (`state.autoRotate`)
   * without stopping the `requestAnimationFrame` rendering loop.
   *
   * @param {boolean} enabled True to enable Auto-Rotate; false to freeze rotation
   * @returns {boolean} Updated `state.autoRotate` value
   */
  function setAutoRotate(enabled) {
    const nextValue = Boolean(enabled);
    if (!state.autoRotate && nextValue) {
      resetAnimationTimeBaseline();
    }
    state.autoRotate = nextValue;
    syncControlsUI();
    updateTelemetryDisplay();
    return state.autoRotate;
  }

  /**
   * Sets the cube's angular velocity in degrees per second (clamped to `[0, 180]`).
   * Does not reallocate any GPU buffers or recompile shaders.
   *
   * @param {number} speedDegPerSec Angular velocity in degrees/second
   * @returns {number} Updated `state.rotationSpeedDegPerSec`
   */
  function setRotationSpeed(speedDegPerSec) {
    const numeric = Number(speedDegPerSec);
    const safeSpeed = Number.isFinite(numeric)
      ? Math.min(
          MAX_ROTATION_SPEED_DEG_PER_SEC,
          Math.max(MIN_ROTATION_SPEED_DEG_PER_SEC, numeric)
        )
      : DEFAULT_ROTATION_SPEED_DEG_PER_SEC;
    state.rotationSpeedDegPerSec = safeSpeed;
    syncControlsUI();
    updateTelemetryDisplay();
    return state.rotationSpeedDegPerSec;
  }

  /**
   * Applies a color (given as a CSS `#RRGGBB` hex string or normalized `[r, g, b]`
   * array) to the specified `faceTarget` (`"all"` for all 6 faces / 24 vertices,
   * or `0..5` for a single face / 4 vertices) and updates the GPU VBO in-place
   * via `gl.bufferSubData()`.
   *
   * @param {string | [number, number, number]} colorInput Hex string `"#rrggbb"` or `[r, g, b]` in `[0..1]`
   * @param {"all" | number | string} [faceTarget] `"all"` or face index `0..5` (defaults to `state.colorTarget`)
   * @returns {{ target: string, hex: string, rgb: [number, number, number], vboSubDataUpdateCount: number } | null}
   */
  function applyObjectColor(colorInput, faceTarget) {
    if (!Geometry) {
      return null;
    }

    const target =
      faceTarget !== undefined ? String(faceTarget) : String(state.colorTarget);
    let rgb;
    let hex;

    if (Array.isArray(colorInput) && colorInput.length >= 3) {
      const clamp01 = (v) => Math.min(1.0, Math.max(0.0, Number(v) || 0.0));
      rgb = /** @type {[number, number, number]} */ ([
        clamp01(colorInput[0]),
        clamp01(colorInput[1]),
        clamp01(colorInput[2]),
      ]);
      hex = Geometry.normalizedRgbToHex(rgb[0], rgb[1], rgb[2]);
    } else {
      rgb = Geometry.hexToNormalizedRgb(String(colorInput || DEFAULT_COLOR_HEX));
      hex = Geometry.normalizedRgbToHex(rgb[0], rgb[1], rgb[2]);
    }

    const updated = Geometry.applyCubeFaceColor(
      state.cpuCubeVertexData,
      target === "all" ? "all" : Number(target),
      rgb
    );
    if (!updated) {
      return null;
    }

    state.colorTarget = target;
    state.selectedColorHex = hex;
    state.isDefaultPalette = false;

    if (
      state.geometry &&
      state.geometry.meshType === "cube" &&
      state.gl &&
      !state.isContextLost
    ) {
      state.geometry.vertexData.set(state.cpuCubeVertexData);
      if (Geometry.updateGeometryBuffer(state.gl, state.geometry)) {
        state.vboSubDataUpdateCount += 1;
      }
      if (!state.isRunning) {
        drawScene();
      }
    }

    syncControlsUI();
    return {
      target: state.colorTarget,
      hex: state.selectedColorHex,
      rgb,
      vboSubDataUpdateCount: state.vboSubDataUpdateCount,
    };
  }

  /**
   * Restores the canonical 6-face scientific color palette in `state.cpuCubeVertexData`
   * and uploads it to the existing GPU VBO via `gl.bufferSubData()` without
   * reallocating buffers or recompiling shaders.
   */
  function restoreDefaultCubePalette() {
    if (!Geometry) {
      return null;
    }
    state.cpuCubeVertexData = Geometry.createDefaultCubeVertexData();
    state.isDefaultPalette = true;
    state.selectedColorHex = DEFAULT_COLOR_HEX;

    if (
      state.geometry &&
      state.geometry.meshType === "cube" &&
      state.gl &&
      !state.isContextLost
    ) {
      state.geometry.vertexData.set(state.cpuCubeVertexData);
      if (Geometry.updateGeometryBuffer(state.gl, state.geometry)) {
        state.vboSubDataUpdateCount += 1;
      }
      if (!state.isRunning) {
        drawScene();
      }
    }

    syncControlsUI();
    return {
      isDefaultPalette: state.isDefaultPalette,
      vboSubDataUpdateCount: state.vboSubDataUpdateCount,
    };
  }

  /**
   * Restores all Task 3.3 & Task 3.4 parameters to their documented defaults:
   * - Mesh mode (`"cube"`, 24 vertices, 36 indices)
   * - Model transformation (`translation: [0,0,0]`, `rotationDeg: [18,-28,0]`, `scale: [1,1,1]`)
   * - Camera and Perspective Projection parameters (`eye: [1.9,1.5,2.6]`, `fovYDeg: 45°`)
   * - Animation state (`autoRotate: true`, `rotationSpeedDegPerSec: 45°/s`, `fixedStepMode: false`)
   * - Default 6-face vertex colors (updated in-place via `gl.bufferSubData()` when
   *   the cube VAO/VBO/EBO and shader program are already valid, avoiding
   *   unnecessary shader recompilation or buffer reallocation!)
   * - Active rendering loop (`startRenderLoop()`)
   */
  function resetToDefaults() {
    const needsResourceRebuild =
      !state.program ||
      Boolean(state.lastShaderError) ||
      !state.geometry ||
      state.geometry.meshType !== "cube" ||
      state.meshMode !== "cube";

    const needsLayoutRestore =
      Geometry &&
      (state.attributeLayout.strideBytes !== Geometry.DEFAULT_STRIDE_BYTES ||
        state.attributeLayout.positionOffsetBytes !==
          Geometry.DEFAULT_POSITION_OFFSET_BYTES ||
        state.attributeLayout.colorOffsetBytes !==
          Geometry.DEFAULT_COLOR_OFFSET_BYTES);

    state.meshMode = "cube";
    if (Geometry) {
      state.cpuCubeVertexData = Geometry.createDefaultCubeVertexData();
      state.cpuCubeIndexData = Geometry.createDefaultCubeIndexData();
      state.cpuTriangleVertexData = Geometry.createDefaultVertexData();
      state.attributeLayout = {
        strideBytes: Geometry.DEFAULT_STRIDE_BYTES,
        positionOffsetBytes: Geometry.DEFAULT_POSITION_OFFSET_BYTES,
        colorOffsetBytes: Geometry.DEFAULT_COLOR_OFFSET_BYTES,
      };
    }

    state.modelParams = {
      translation: [...DEFAULT_MODEL_PARAMS.translation],
      rotationDeg: [...DEFAULT_MODEL_PARAMS.rotationDeg],
      scale: [...DEFAULT_MODEL_PARAMS.scale],
    };
    state.cameraParams = {
      eye: [...DEFAULT_CAMERA_PARAMS.eye],
      target: [...DEFAULT_CAMERA_PARAMS.target],
      up: [...DEFAULT_CAMERA_PARAMS.up],
      fovYDeg: DEFAULT_CAMERA_PARAMS.fovYDeg,
      zNear: DEFAULT_CAMERA_PARAMS.zNear,
      zFar: DEFAULT_CAMERA_PARAMS.zFar,
      aspect: state.cameraParams.aspect || 1.0,
    };

    state.autoRotate = DEFAULT_AUTO_ROTATE;
    state.rotationSpeedDegPerSec = DEFAULT_ROTATION_SPEED_DEG_PER_SEC;
    state.fixedStepMode = false;
    state.fixedStepDegPerFrame = DEFAULT_FIXED_STEP_DEG_PER_FRAME;
    state.colorTarget = "all";
    state.selectedColorHex = DEFAULT_COLOR_HEX;
    state.isDefaultPalette = true;
    state.primitiveModeName = "TRIANGLES";
    if (state.gl) {
      state.primitiveMode = state.gl.TRIANGLES;
    }
    state.clearColor = { ...DEFAULT_CLEAR_COLOR };

    resetAnimationTimeBaseline();
    updateAllMatrices();

    if (state.gl && !state.isContextLost) {
      configureWebGLState(state.gl);

      if (needsResourceRebuild) {
        initSceneResources(state.gl);
      } else if (Geometry && state.geometry) {
        // Fast in-place reset path: update VBO colors via gl.bufferSubData
        // without recompiling shaders or reallocating VAO/VBO/EBO!
        state.geometry.vertexData.set(state.cpuCubeVertexData);
        if (Geometry.updateGeometryBuffer(state.gl, state.geometry)) {
          state.vboSubDataUpdateCount += 1;
        }
        if (needsLayoutRestore && Shaders) {
          Geometry.updateGeometryLayout(
            state.gl,
            state.geometry,
            Shaders.ATTRIBUTE_LOCATIONS,
            state.attributeLayout
          );
        }
      }

      startRenderLoop();
      drawScene();
    }

    syncControlsUI();
    updateTelemetryDisplay();
  }

  /**
   * Registers DOM event listeners for the Task 3.4 interactive control strip.
   */
  function handleAutoRotateChange() {
    if (!controlAutoRotate) {
      return;
    }
    setAutoRotate(controlAutoRotate.checked);
  }

  function handleRotationSpeedInput() {
    if (!controlRotationSpeed) {
      return;
    }
    setRotationSpeed(Number(controlRotationSpeed.value));
  }

  function handleColorTargetChange() {
    if (!controlColorTarget) {
      return;
    }
    state.colorTarget = controlColorTarget.value;
    // Sync color picker preview with the selected face's current vertex color
    if (state.colorTarget !== "all" && Geometry) {
      const faceIdx = Number(state.colorTarget);
      if (faceIdx >= 0 && faceIdx < 6) {
        const base = faceIdx * 4 * Geometry.FLOATS_PER_VERTEX;
        const r = state.cpuCubeVertexData[base + 3];
        const g = state.cpuCubeVertexData[base + 4];
        const b = state.cpuCubeVertexData[base + 5];
        state.selectedColorHex = Geometry.normalizedRgbToHex(r, g, b);
      }
    }
    syncControlsUI();
  }

  function handleObjectColorInput() {
    if (!controlObjectColor) {
      return;
    }
    applyObjectColor(controlObjectColor.value, state.colorTarget);
  }

  function handleColorPaletteClick() {
    restoreDefaultCubePalette();
  }

  function handlePauseResumeClick() {
    if (state.isRunning) {
      stopRenderLoop(true);
    } else {
      startRenderLoop();
    }
  }

  function handleResetClick() {
    resetToDefaults();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      // Reset the delta-time baseline when the browser tab becomes visible again
      // so the first frame after returning from a background tab does not jump.
      resetAnimationTimeBaseline();
    }
  }

  function setupControlListeners() {
    if (controlAutoRotate) {
      controlAutoRotate.addEventListener("change", handleAutoRotateChange);
    }
    if (controlRotationSpeed) {
      controlRotationSpeed.addEventListener("input", handleRotationSpeedInput);
    }
    if (controlColorTarget) {
      controlColorTarget.addEventListener("change", handleColorTargetChange);
    }
    if (controlObjectColor) {
      controlObjectColor.addEventListener("input", handleObjectColorInput);
    }
    if (controlColorPaletteBtn) {
      controlColorPaletteBtn.addEventListener("click", handleColorPaletteClick);
    }
    if (controlPauseResumeBtn) {
      controlPauseResumeBtn.addEventListener("click", handlePauseResumeClick);
    }
    if (controlResetBtn) {
      controlResetBtn.addEventListener("click", handleResetClick);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  function teardownControlListeners() {
    if (controlAutoRotate) {
      controlAutoRotate.removeEventListener("change", handleAutoRotateChange);
    }
    if (controlRotationSpeed) {
      controlRotationSpeed.removeEventListener("input", handleRotationSpeedInput);
    }
    if (controlColorTarget) {
      controlColorTarget.removeEventListener("change", handleColorTargetChange);
    }
    if (controlObjectColor) {
      controlObjectColor.removeEventListener("input", handleObjectColorInput);
    }
    if (controlColorPaletteBtn) {
      controlColorPaletteBtn.removeEventListener("click", handleColorPaletteClick);
    }
    if (controlPauseResumeBtn) {
      controlPauseResumeBtn.removeEventListener("click", handlePauseResumeClick);
    }
    if (controlResetBtn) {
      controlResetBtn.removeEventListener("click", handleResetClick);
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  // --------------------------------------------------------------------------
  // 10. WebGL Context Loss & Restoration Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Handles the `webglcontextlost` event fired by the browser when the GPU
   * context is preempted, reset, or forcibly lost.
   *
   * @param {Event} event WebGLContextEvent
   */
  function handleContextLost(event) {
    event.preventDefault();

    state.isContextLost = true;
    state.program = null;
    state.uniformLocations = null;
    state.geometry = null;

    stopRenderLoop(false);

    updateStatusBadge("lost", "Context Lost");
    if (contextLostOverlay) {
      contextLostOverlay.hidden = false;
    }
  }

  /**
   * Handles the `webglcontextrestored` event fired when the GPU is available
   * again after a prior context loss.
   *
   * Re-applies all WebGL pipeline state (clear color, depth test, viewport),
   * recomputes matrices, recompiles the GLSL shaders, recreates the VBO, EBO,
   * and VAO from `state.cpuCubeVertexData` (preserving any custom face colors!),
   * resets the animation timing baseline to prevent time jumps, and — only if
   * GPU resource reconstruction succeeds — either resumes the rendering loop
   * or keeps it paused while drawing once.
   */
  function handleContextRestored() {
    if (state.isDestroyed || !state.gl) {
      return;
    }

    state.isContextLost = false;
    if (contextLostOverlay) {
      contextLostOverlay.hidden = true;
    }

    resetAnimationTimeBaseline();
    syncCanvasSize();
    configureWebGLState(state.gl);
    updateAllMatrices();

    const resourcesReady = initSceneResources(state.gl);
    if (!resourcesReady) {
      stopRenderLoop(false);
      clearFramebuffer();
      updateTelemetryDisplay();
      return;
    }

    if (state.shouldRunWhenActive) {
      startRenderLoop();
    } else {
      drawScene();
      updateStatusBadge("paused", "Loop Paused");
      updateTelemetryDisplay();
      syncControlsUI();
    }
  }

  // --------------------------------------------------------------------------
  // 11. Page Lifecycle (`pagehide` / `pageshow`) & Resource Teardown
  // --------------------------------------------------------------------------

  /**
   * Handles the `pagehide` lifecycle event.
   *
   * @param {PageTransitionEvent} event
   */
  function handlePageHide(event) {
    if (event && event.persisted) {
      stopRenderLoop(false);
      return;
    }
    destroy();
  }

  /**
   * Handles the `pageshow` lifecycle event when restoring from the browser's
   * Back/Forward Cache (`event.persisted === true`).
   *
   * @param {PageTransitionEvent} event
   */
  function handlePageShow(event) {
    if (!event || !event.persisted || state.isDestroyed || !state.gl) {
      return;
    }
    resetAnimationTimeBaseline();
    syncCanvasSize();
    if (!state.program || !state.geometry) {
      return;
    }
    if (state.shouldRunWhenActive && !state.isContextLost) {
      startRenderLoop();
    } else if (!state.isContextLost) {
      drawScene();
      updateStatusBadge("paused", "Loop Paused");
      updateTelemetryDisplay();
      syncControlsUI();
    }
  }

  /**
   * Cleans up all module-owned GPU resources (Program, VAO, VBO, EBO), timers,
   * observers, and event listeners when the document is permanently unloaded.
   */
  function destroy() {
    if (state.isDestroyed) {
      return;
    }
    state.isDestroyed = true;

    stopRenderLoop(false);
    releaseGpuResources();
    teardownControlListeners();

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    window.removeEventListener("resize", handleWindowResize);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);

    if (canvas) {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    }
  }

  // --------------------------------------------------------------------------
  // 12. Public Educational & Diagnostic API (`window.Module1WebGL`)
  // --------------------------------------------------------------------------

  /**
   * Exposes a safe, read/experimentation helper on `window.Module1WebGL` so the
   * student can run hands-on DevTools console experiments for Tasks 3.1 – 3.4.
   */
  function exposeEducationalDebugAPI() {
    window.Module1WebGL = {
      /**
       * Returns a snapshot of current runtime metrics, GPU resources, animation
       * timing state, UI control settings, and 3D matrices.
       */
      getDiagnostics() {
        const activeVertexArray =
          state.meshMode === "triangle"
            ? state.cpuTriangleVertexData
            : state.cpuCubeVertexData;
        return {
          hasWebGL2: Boolean(state.gl),
          hasShaderProgram: Boolean(state.program),
          hasVAO: Boolean(state.geometry && state.geometry.vao),
          hasVBO: Boolean(state.geometry && state.geometry.vbo),
          hasEBO: Boolean(state.geometry && state.geometry.ebo),
          meshMode: state.meshMode,
          isIndexed: Boolean(state.geometry && state.geometry.indexed),
          vertexCount: state.geometry ? state.geometry.vertexCount : 0,
          indexCount: state.geometry ? state.geometry.indexCount : 0,
          vboByteLength: state.geometry ? state.geometry.byteLength : 0,
          eboByteLength: state.geometry ? state.geometry.indexByteLength : 0,
          strideBytes: state.geometry
            ? state.geometry.strideBytes
            : state.attributeLayout.strideBytes,
          positionOffsetBytes: state.geometry
            ? state.geometry.positionOffsetBytes
            : state.attributeLayout.positionOffsetBytes,
          colorOffsetBytes: state.geometry
            ? state.geometry.colorOffsetBytes
            : state.attributeLayout.colorOffsetBytes,
          primitiveMode: state.primitiveModeName,
          autoRotate: state.autoRotate,
          rotationSpeedDegPerSec: state.rotationSpeedDegPerSec,
          fixedStepMode: state.fixedStepMode,
          fixedStepDegPerFrame: state.fixedStepDegPerFrame,
          lastRawDeltaSeconds: state.lastRawDeltaSeconds,
          lastDeltaSeconds: state.lastDeltaSeconds,
          totalAnimatedSeconds: state.totalAnimatedSeconds,
          colorTarget: state.colorTarget,
          selectedColorHex: state.selectedColorHex,
          isDefaultPalette: state.isDefaultPalette,
          shaderCompileCount: state.shaderCompileCount,
          geometryAllocCount: state.geometryAllocCount,
          vboSubDataUpdateCount: state.vboSubDataUpdateCount,
          modelParams: {
            translation: [...state.modelParams.translation],
            rotationDeg: [...state.modelParams.rotationDeg],
            scale: [...state.modelParams.scale],
          },
          cameraParams: {
            eye: [...state.cameraParams.eye],
            target: [...state.cameraParams.target],
            up: [...state.cameraParams.up],
            fovYDeg: state.cameraParams.fovYDeg,
            zNear: state.cameraParams.zNear,
            zFar: state.cameraParams.zFar,
            aspect: state.cameraParams.aspect,
          },
          matrices: {
            modelMatrix: Array.from(state.modelMatrix),
            viewMatrix: Array.from(state.viewMatrix),
            projectionMatrix: Array.from(state.projectionMatrix),
          },
          lastShaderError: state.lastShaderError,
          isRunning: state.isRunning,
          shouldRunWhenActive: state.shouldRunWhenActive,
          isContextLost: state.isContextLost,
          animationFrameId: state.animationFrameId,
          frameCount: state.frameCount,
          cssWidth: state.cssWidth,
          cssHeight: state.cssHeight,
          drawingBufferWidth: state.gl ? state.gl.drawingBufferWidth : 0,
          drawingBufferHeight: state.gl ? state.gl.drawingBufferHeight : 0,
          devicePixelRatio: window.devicePixelRatio || 1,
          effectiveDpr: state.effectiveDpr,
          clearColor: { ...state.clearColor },
          vertexData: Array.from(activeVertexArray),
        };
      },

      /**
       * [Task 3.4 Helper] Enables or disables continuous time-based cube rotation
       * (`state.autoRotate`) and synchronizes the `#control-auto-rotate` checkbox.
       *
       * @param {boolean} enabled
       */
      setAutoRotate(enabled) {
        return setAutoRotate(enabled);
      },

      /**
       * [Task 3.4 Helper] Updates the cube's angular velocity in degrees/second
       * (`0..180`) and synchronizes the `#control-rotation-speed` slider.
       *
       * @param {number} speedDegPerSec
       */
      setRotationSpeed(speedDegPerSec) {
        return setRotationSpeed(speedDegPerSec);
      },

      /**
       * [Task 3.4 Experiment 1 Helper] Switches between frame-rate-independent
       * delta-time rotation (`enabled = false`, default) and frame-dependent
       * fixed-angle-per-frame rotation (`enabled = true`, adding `stepDegPerFrame`
       * on every `requestAnimationFrame` callback regardless of elapsed time).
       *
       * @param {boolean} enabled True for fixed-step-per-frame; false for delta-time
       * @param {number} [stepDegPerFrame=0.75] Degrees added per frame when enabled
       */
      setFixedStepMode(enabled, stepDegPerFrame = DEFAULT_FIXED_STEP_DEG_PER_FRAME) {
        state.fixedStepMode = Boolean(enabled);
        if (typeof stepDegPerFrame === "number" && Number.isFinite(stepDegPerFrame)) {
          state.fixedStepDegPerFrame = stepDegPerFrame;
        }
        resetAnimationTimeBaseline();
        return {
          fixedStepMode: state.fixedStepMode,
          fixedStepDegPerFrame: state.fixedStepDegPerFrame,
        };
      },

      /**
       * [Task 3.4 Helper] Updates the cube's vertex colors in the VBO via
       * `gl.bufferSubData()` for either all 6 faces (`target = "all"`) or a
       * specific face (`target = 0..5`) without recompiling shaders or reallocating
       * GPU buffers.
       *
       * @param {string | [number, number, number]} colorInput Hex `"#rrggbb"` or `[r, g, b]` in `[0..1]`
       * @param {"all" | number | string} [faceTarget="all"] `"all"` or face index `0..5`
       */
      setCubeColor(colorInput, faceTarget = "all") {
        return applyObjectColor(colorInput, faceTarget);
      },

      /**
       * [Task 3.4 Helper] Restores the default 6-face scientific color palette
       * in the VBO via `gl.bufferSubData()`.
       */
      restoreDefaultPalette() {
        return restoreDefaultCubePalette();
      },

      /**
       * [Task 3.4 Testing Helper] Simulates a single animation frame step with
       * an explicit `deltaTimeSeconds` interval (subject to the same `0.1 s`
       * safety clamp as `renderFrame`) for deterministic verification of
       * `rotationDeltaDegrees = rotationSpeedDegreesPerSecond * deltaTimeSeconds`
       * and large-interval clamping.
       *
       * @param {number} rawDeltaSeconds Simulated elapsed time in seconds
       */
      stepAnimationBySeconds(rawDeltaSeconds) {
        const raw = Math.max(0.0, Number(rawDeltaSeconds) || 0.0);
        const clamped = Math.min(raw, MAX_DELTA_TIME_SECONDS);
        state.lastRawDeltaSeconds = raw;
        state.lastDeltaSeconds = clamped;

        let appliedDeltaDeg = 0.0;
        if (state.autoRotate && state.meshMode === "cube") {
          appliedDeltaDeg = state.fixedStepMode
            ? state.fixedStepDegPerFrame
            : state.rotationSpeedDegPerSec * clamped;
          state.modelParams.rotationDeg[1] = wrapAngleDegrees(
            state.modelParams.rotationDeg[1] + appliedDeltaDeg
          );
          state.totalAnimatedSeconds += clamped;
          updateModelMatrix();
        }
        drawScene();
        updateTelemetryDisplay();
        return {
          rawDeltaSeconds: raw,
          clampedDeltaSeconds: clamped,
          appliedDeltaDegrees: appliedDeltaDeg,
          rotationDeg: [...state.modelParams.rotationDeg],
        };
      },

      /**
       * [Task 3.3 Helper] Updates the cube's Euler rotation angles (in degrees)
       * in the Model Matrix (`M = T * Rz * Ry * Rx * S`) and redraws immediately
       * if the loop is paused.
       *
       * @param {number} rxDeg Pitch rotation around X axis in degrees
       * @param {number} ryDeg Yaw rotation around Y axis in degrees
       * @param {number} [rzDeg=0] Roll rotation around Z axis in degrees
       */
      setModelRotation(rxDeg, ryDeg, rzDeg = 0.0) {
        state.modelParams.rotationDeg = [
          Number(rxDeg) || 0.0,
          Number(ryDeg) || 0.0,
          Number(rzDeg) || 0.0,
        ];
        updateModelMatrix();
        updateTelemetryDisplay();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return [...state.modelParams.rotationDeg];
      },

      /**
       * [Task 3.3 Helper] Updates the cube's World-Space translation `(tx, ty, tz)`
       * in the Model Matrix (`M = T * Rz * Ry * Rx * S`).
       *
       * @param {number} tx Translation along World X
       * @param {number} ty Translation along World Y
       * @param {number} tz Translation along World Z
       */
      setModelTranslation(tx, ty, tz) {
        state.modelParams.translation = [
          Number(tx) || 0.0,
          Number(ty) || 0.0,
          Number(tz) || 0.0,
        ];
        updateModelMatrix();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return [...state.modelParams.translation];
      },

      /**
       * [Task 3.3 Helper] Updates the cube's local scale factors `(sx, sy, sz)`
       * in the Model Matrix (`M = T * Rz * Ry * Rx * S`).
       *
       * @param {number} sx Scale along local X (or uniform scale if sy/sz omitted)
       * @param {number} [sy] Scale along local Y
       * @param {number} [sz] Scale along local Z
       */
      setModelScale(sx, sy, sz) {
        const x = Number(sx) || 1.0;
        const y = sy !== undefined ? Number(sy) : x;
        const z = sz !== undefined ? Number(sz) : x;
        state.modelParams.scale = [x, y, z];
        updateModelMatrix();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return [...state.modelParams.scale];
      },

      /**
       * [Task 3.3 Helper] Updates multiple Model Matrix parameters at once.
       */
      setModelTransform(params) {
        if (!params || typeof params !== "object") {
          return null;
        }
        if (Array.isArray(params.translation) && params.translation.length === 3) {
          state.modelParams.translation = [
            Number(params.translation[0]) || 0.0,
            Number(params.translation[1]) || 0.0,
            Number(params.translation[2]) || 0.0,
          ];
        }
        if (Array.isArray(params.rotationDeg) && params.rotationDeg.length === 3) {
          state.modelParams.rotationDeg = [
            Number(params.rotationDeg[0]) || 0.0,
            Number(params.rotationDeg[1]) || 0.0,
            Number(params.rotationDeg[2]) || 0.0,
          ];
        }
        if (Array.isArray(params.scale) && params.scale.length === 3) {
          state.modelParams.scale = [
            Number(params.scale[0]) || 1.0,
            Number(params.scale[1]) || 1.0,
            Number(params.scale[2]) || 1.0,
          ];
        }
        updateModelMatrix();
        updateTelemetryDisplay();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return {
          translation: [...state.modelParams.translation],
          rotationDeg: [...state.modelParams.rotationDeg],
          scale: [...state.modelParams.scale],
          modelMatrix: Array.from(state.modelMatrix),
        };
      },

      /**
       * [Task 3.3 Helper] Updates the camera's `lookAt(eye, target, up)` parameters
       * and recomputes the 4x4 View Matrix (`u_viewMatrix`).
       */
      setCameraLookAt(eye, target, up) {
        if (Array.isArray(eye) && eye.length === 3) {
          state.cameraParams.eye = [
            Number(eye[0]) || 0.0,
            Number(eye[1]) || 0.0,
            Number(eye[2]) || 0.0,
          ];
        }
        if (Array.isArray(target) && target.length === 3) {
          state.cameraParams.target = [
            Number(target[0]) || 0.0,
            Number(target[1]) || 0.0,
            Number(target[2]) || 0.0,
          ];
        }
        if (Array.isArray(up) && up.length === 3) {
          state.cameraParams.up = [
            Number(up[0]) || 0.0,
            Number(up[1]) || 0.0,
            Number(up[2]) || 0.0,
          ];
        }
        updateViewMatrix();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return {
          eye: [...state.cameraParams.eye],
          target: [...state.cameraParams.target],
          up: [...state.cameraParams.up],
          viewMatrix: Array.from(state.viewMatrix),
        };
      },

      /**
       * [Task 3.3 Helper] Updates the vertical Field of View (`fovYDeg` in degrees,
       * clamped to `[10, 140]`) and optionally `zNear` / `zFar`.
       */
      setPerspectiveFov(fovYDeg, zNear, zFar) {
        const clampedFov = Math.min(140.0, Math.max(10.0, Number(fovYDeg) || 45.0));
        state.cameraParams.fovYDeg = clampedFov;
        if (typeof zNear === "number" && zNear > 0) {
          state.cameraParams.zNear = zNear;
        }
        if (typeof zFar === "number" && zFar > state.cameraParams.zNear) {
          state.cameraParams.zFar = zFar;
        }
        updateProjectionMatrix();
        updateTelemetryDisplay();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return {
          fovYDeg: state.cameraParams.fovYDeg,
          zNear: state.cameraParams.zNear,
          zFar: state.cameraParams.zFar,
          aspect: state.cameraParams.aspect,
          projectionMatrix: Array.from(state.projectionMatrix),
        };
      },

      /**
       * [Task 3.3 Helper] Projects a 3D Object-Space point `[x, y, z]` through
       * the active `Model`, `View`, and `Projection` matrices.
       */
      projectLocalPoint(localPoint3D = [0, 0, 0]) {
        if (!Math3D) {
          return null;
        }
        return Math3D.projectPointToNdc(
          localPoint3D,
          state.modelMatrix,
          state.viewMatrix,
          state.projectionMatrix
        );
      },

      /**
       * [Task 3.2 / 3.3 Helper] Switches the active scene geometry between the
       * Task 3.3 Indexed 3D Cube (`"cube"`) and the Task 3.2 Clip-Space Triangle
       * (`"triangle"`).
       *
       * @param {"cube" | "triangle"} mode
       */
      setMeshMode(mode) {
        const normalized = String(mode || "cube").toLowerCase();
        if (normalized !== "cube" && normalized !== "triangle") {
          throw new Error(
            `Unsupported meshMode "${mode}". Choose "cube" (Task 3.3) or "triangle" (Task 3.2).`
          );
        }
        state.meshMode = /** @type {"cube" | "triangle"} */ (normalized);
        if (state.gl && !state.isContextLost) {
          initSceneResources(state.gl);
          drawScene();
        }
        return this.getDiagnostics();
      },

      /**
       * Updates `gl.clearColor(r, g, b, a)` with normalized values in [0.0, 1.0].
       */
      setClearColor(r, g, b, a = 1.0) {
        const clamp01 = (v) => Math.min(1.0, Math.max(0.0, Number(v) || 0.0));
        state.clearColor = {
          r: clamp01(r),
          g: clamp01(g),
          b: clamp01(b),
          a: clamp01(a),
        };
        if (state.gl && !state.isContextLost) {
          state.gl.clearColor(
            state.clearColor.r,
            state.clearColor.g,
            state.clearColor.b,
            state.clearColor.a
          );
          if (!state.isRunning) {
            drawScene();
          }
        }
        updateTelemetryDisplay();
        return { ...state.clearColor };
      },

      /**
       * Restores the default laboratory navy clear color.
       */
      resetClearColor() {
        return this.setClearColor(
          DEFAULT_CLEAR_COLOR.r,
          DEFAULT_CLEAR_COLOR.g,
          DEFAULT_CLEAR_COLOR.b,
          DEFAULT_CLEAR_COLOR.a
        );
      },

      /**
       * [Task 3.2 / 3.3 Helper] Modifies the position `(x, y, z)` of a specific
       * vertex in the active mesh and uploads the updated `Float32Array` to the
       * GPU VBO via `gl.bufferSubData`.
       */
      setVertexPosition(vertexIndex, x, y, z = 0.0) {
        if (!Geometry) {
          return null;
        }
        const activeBuffer =
          state.meshMode === "triangle"
            ? state.cpuTriangleVertexData
            : state.cpuCubeVertexData;
        const maxVerts = Math.floor(
          activeBuffer.length / Geometry.FLOATS_PER_VERTEX
        );
        const idx = Math.floor(Number(vertexIndex));
        if (idx < 0 || idx >= maxVerts) {
          return null;
        }
        const base = idx * Geometry.FLOATS_PER_VERTEX;
        activeBuffer[base + 0] = Number(x) || 0.0;
        activeBuffer[base + 1] = Number(y) || 0.0;
        activeBuffer[base + 2] = Number(z) || 0.0;

        if (state.geometry && state.gl && !state.isContextLost) {
          state.geometry.vertexData.set(activeBuffer);
          if (Geometry.updateGeometryBuffer(state.gl, state.geometry)) {
            state.vboSubDataUpdateCount += 1;
          }
          if (!state.isRunning) {
            drawScene();
          }
        }
        return Array.from(activeBuffer.slice(base, base + 3));
      },

      /**
       * [Task 3.2 / 3.3 Helper] Modifies the normalized RGB color `(r, g, b)` of
       * a specific vertex in the active mesh and uploads the updated `Float32Array`
       * to the GPU VBO via `gl.bufferSubData`.
       */
      setVertexColor(vertexIndex, r, g, b) {
        if (!Geometry) {
          return null;
        }
        const activeBuffer =
          state.meshMode === "triangle"
            ? state.cpuTriangleVertexData
            : state.cpuCubeVertexData;
        const maxVerts = Math.floor(
          activeBuffer.length / Geometry.FLOATS_PER_VERTEX
        );
        const idx = Math.floor(Number(vertexIndex));
        if (idx < 0 || idx >= maxVerts) {
          return null;
        }
        const clamp01 = (v) => Math.min(1.0, Math.max(0.0, Number(v) || 0.0));
        const base = idx * Geometry.FLOATS_PER_VERTEX;
        activeBuffer[base + 3] = clamp01(r);
        activeBuffer[base + 4] = clamp01(g);
        activeBuffer[base + 5] = clamp01(b);
        state.isDefaultPalette = false;

        if (state.geometry && state.gl && !state.isContextLost) {
          state.geometry.vertexData.set(activeBuffer);
          if (Geometry.updateGeometryBuffer(state.gl, state.geometry)) {
            state.vboSubDataUpdateCount += 1;
          }
          if (!state.isRunning) {
            drawScene();
          }
        }
        return Array.from(activeBuffer.slice(base + 3, base + 6));
      },

      /**
       * [Task 3.2 / 3.3 Helper] Changes the primitive assembly mode passed to
       * `gl.drawElements` / `gl.drawArrays`.
       */
      setPrimitiveMode(modeName) {
        if (!state.gl) {
          return null;
        }
        const normalized = String(modeName || "TRIANGLES").toUpperCase();
        const allowed = ["TRIANGLES", "LINE_LOOP", "LINES", "POINTS"];
        if (!allowed.includes(normalized)) {
          throw new Error(
            `Unsupported primitive mode "${modeName}". Choose one of: ${allowed.join(", ")}`
          );
        }
        state.primitiveModeName = normalized;
        state.primitiveMode = state.gl[normalized];
        updateTelemetryDisplay();
        if (!state.isRunning && !state.isContextLost) {
          drawScene();
        }
        return state.primitiveModeName;
      },

      /**
       * [Task 3.2 / 3.3 Helper] Reconfigures the VAO's `vertexAttribPointer`
       * `stride` and byte `offset` values.
       */
      setAttributeLayout(layoutOptions) {
        if (!layoutOptions || typeof layoutOptions !== "object" || !Geometry) {
          return null;
        }
        if (typeof layoutOptions.strideBytes === "number") {
          state.attributeLayout.strideBytes = layoutOptions.strideBytes;
        }
        if (typeof layoutOptions.positionOffsetBytes === "number") {
          state.attributeLayout.positionOffsetBytes =
            layoutOptions.positionOffsetBytes;
        }
        if (typeof layoutOptions.colorOffsetBytes === "number") {
          state.attributeLayout.colorOffsetBytes = layoutOptions.colorOffsetBytes;
        }

        if (state.gl && state.geometry && !state.isContextLost && Shaders) {
          Geometry.updateGeometryLayout(
            state.gl,
            state.geometry,
            Shaders.ATTRIBUTE_LOCATIONS,
            state.attributeLayout
          );
          updateTelemetryDisplay();
          if (!state.isRunning) {
            drawScene();
          }
        }
        return { ...state.attributeLayout };
      },

      /**
       * [Task 3.2 / 3.3 Helper] Intentionally attempts to compile and link a
       * custom (or broken) GLSL shader source to verify `gl.COMPILE_STATUS`.
       */
      testShaderCompileError(brokenVertexSource, applyToScene = false) {
        if (!state.gl || state.isContextLost || !Shaders) {
          return { ok: false, error: "WebGL 2.0 context is not active." };
        }
        const sourceToTest =
          typeof brokenVertexSource === "string" && brokenVertexSource.length > 0
            ? brokenVertexSource
            : "#version 300 es\nin vec3 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 1.0) // Missing semicolon syntax error\n}";

        if (applyToScene) {
          const ok = initSceneResources(
            state.gl,
            sourceToTest,
            Shaders.FRAGMENT_SHADER_SOURCE
          );
          if (!ok) {
            stopRenderLoop(false);
            clearFramebuffer();
          }
          return { ok, error: state.lastShaderError };
        }

        try {
          const tempCompiled = Shaders.createShaderProgram(
            state.gl,
            sourceToTest,
            Shaders.FRAGMENT_SHADER_SOURCE
          );
          Shaders.deleteShaderProgram(state.gl, tempCompiled.program);
          return { ok: true, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false, error: message };
        }
      },

      /**
       * [Task 3.3 / 3.4 Helper] Resets mesh mode (`"cube"`), vertex/index buffers,
       * Model/View/Projection matrices, camera parameters, animation speed,
       * Auto-Rotate state, default 6-face colors, attribute layout, primitive mode,
       * clear color, and rendering state back to the canonical baseline.
       */
      resetScene() {
        resetToDefaults();
        return this.getDiagnostics();
      },

      /**
       * Pauses the `requestAnimationFrame` rendering loop.
       */
      pauseLoop() {
        stopRenderLoop(true);
        return this.getDiagnostics();
      },

      /**
       * Resumes the `requestAnimationFrame` rendering loop (safe to call multiple
       * times; will not schedule duplicate loops).
       */
      resumeLoop() {
        startRenderLoop();
        return this.getDiagnostics();
      },

      /**
       * Simulates a GPU context loss using the standard `WEBGL_lose_context`
       * extension for testing and learning.
       */
      simulateContextLoss() {
        if (!state.gl) {
          return false;
        }
        if (!state.loseContextExt) {
          state.loseContextExt = state.gl.getExtension("WEBGL_lose_context");
        }
        if (state.loseContextExt && !state.isContextLost) {
          state.loseContextExt.loseContext();
          return true;
        }
        return false;
      },

      /**
       * Restores a previously simulated GPU context loss via `WEBGL_lose_context`.
       */
      simulateContextRestore() {
        if (state.loseContextExt && state.isContextLost) {
          state.loseContextExt.restoreContext();
          return true;
        }
        return false;
      },

      /**
       * Renders a synchronous frame pass (`drawScene()`) and reads the 8-bit RGBA
       * values [0..255] at any Normalized Device Coordinate `(ndcX, ndcY)` in
       * `[-1.0, +1.0]^2`.
       */
      samplePixelAtNdc(ndcX = 0.0, ndcY = 0.0) {
        if (!state.gl || state.isContextLost) {
          return null;
        }
        drawScene();
        const width = state.gl.drawingBufferWidth;
        const height = state.gl.drawingBufferHeight;
        const clampedX = Math.min(1.0, Math.max(-1.0, Number(ndcX) || 0.0));
        const clampedY = Math.min(1.0, Math.max(-1.0, Number(ndcY) || 0.0));

        const px = Math.min(
          width - 1,
          Math.max(0, Math.floor(((clampedX + 1.0) * 0.5) * width))
        );
        const py = Math.min(
          height - 1,
          Math.max(0, Math.floor(((clampedY + 1.0) * 0.5) * height))
        );

        const pixel = new Uint8Array(4);
        state.gl.readPixels(
          px,
          py,
          1,
          1,
          state.gl.RGBA,
          state.gl.UNSIGNED_BYTE,
          pixel
        );
        return Array.from(pixel);
      },

      /**
       * Performs a synchronous scene render and reads the center pixel's 8-bit
       * RGBA values [0..255] at NDC (0.0, 0.0).
       */
      sampleCenterPixel() {
        return this.samplePixelAtNdc(0.0, 0.0);
      },

      /**
       * Tears down GPU resources, observers, listeners, and the render loop.
       */
      destroy,
    };
  }

  // --------------------------------------------------------------------------
  // 13. Application Entry Point
  // --------------------------------------------------------------------------

  /**
   * Bootstraps the Module 1 WebGL 2.0 application lifecycle.
   */
  function bootstrap() {
    exposeEducationalDebugAPI();
    setupControlListeners();
    syncControlsUI();

    // 1. Measure initial layout and size the canvas drawing buffer before context
    //    creation so the initial framebuffer and aspect ratio match immediately.
    syncCanvasSize();

    // 2. Compute initial Model, View, and Perspective Projection matrices.
    updateAllMatrices();

    // 3. Register context loss/restoration listeners on the canvas element.
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    // 4. Register page lifecycle listeners (supporting both bfcache and teardown).
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    // 5. Initialize the WebGL 2.0 rendering context.
    const gl = initWebGL2Context(canvas);
    if (!gl) {
      updateTelemetryDisplay();
      return;
    }
    state.gl = gl;

    // 6. Configure clear color, depth buffer, depth testing, and initial viewport.
    configureWebGLState(gl);

    // 7. Compile GLSL ES 3.00 shaders, link WebGLProgram, and create Cube VAO/VBO/EBO once.
    const resourcesReady = initSceneResources(gl);
    updateTelemetryDisplay();

    // 8. Start observing layout and DPR changes (including Portal sidebar toggle).
    setupResizeHandling();

    // 9. Start the single-instance requestAnimationFrame rendering loop if GPU resources are ready.
    if (resourcesReady) {
      startRenderLoop();
    }
  }

  bootstrap();
})();
