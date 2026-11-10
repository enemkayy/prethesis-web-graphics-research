/**
 * ============================================================================
 * Module 01: WebGL Graphics — Task 3.2 & Task 3.3: GLSL ES 3.00 Shader Pipeline
 * ============================================================================
 *
 * Educational Research Purpose:
 * Implements the programmable GPU shader compilation, linking, and uniform
 * location discovery pipeline using native WebGL 2.0 and GLSL ES 3.00
 * (`#version 300 es`).
 *
 * Key Computer Graphics Concepts Covered:
 * 1. Why WebGL Requires Shaders:
 *    Modern GPUs do not use a fixed-function pipeline. To draw any geometry,
 *    the application must supply two programmable stages written in GLSL ES 3.00:
 *    - Vertex Shader: Executes per submitted vertex (reusing cached results
 *      for shared indexed vertices via the post-transform vertex cache when
 *      drawing indexed meshes with `gl.drawElements`) to transform local vertex
 *      positions into clip space (`gl_Position`) and pass per-vertex attributes
 *      (such as color) downstream.
 *    - Fragment Shader: Executes once per rasterized candidate fragment to
 *      compute its output color (`outColor`), which is then subject to per-sample
 *      operations (such as the Depth Test and blending) before surviving
 *      fragments are written into the framebuffer's Color Buffer.
 *
 * 2. Attributes (`in`) vs. Uniforms (`uniform mat4`):
 *    - **Vertex Attributes (`in vec3 a_position`, `in vec3 a_color`):** Change
 *      from vertex to vertex and are fetched from a Vertex Buffer Object (VBO).
 *    - **Uniforms (`uniform mat4 u_modelMatrix`, `u_viewMatrix`, `u_projectionMatrix`):**
 *      Remain constant ("uniform") across all vertices and fragments processed
 *      within a single draw call. Their GPU slot handles (`WebGLUniformLocation`)
 *      are queried once after `gl.linkProgram()` via `gl.getUniformLocation()`,
 *      and their 16-float column-major values are uploaded via
 *      `gl.uniformMatrix4fv(location, false, float32Matrix)`.
 *
 * 3. Matrix Multiplication & Storage Agreement:
 *    In GLSL ES 3.00, `mat4` is stored in **Column-Major Order** and `vec4`
 *    behaves as a column vector when placed on the right of a matrix (`M * v`).
 *    Therefore, `u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0)`
 *    applies `u_modelMatrix` first (Object -> World Space), `u_viewMatrix` second
 *    (World -> View/Camera Space), and `u_projectionMatrix` third (View -> Clip Space).
 *
 * 4. GLSL ES 3.00 vs. Legacy GLSL ES 1.00 (WebGL 1.0):
 *    - `#version 300 es` must appear on the very first line of the shader string,
 *      with no preceding comments or non-whitespace tokens (only horizontal
 *      whitespace before `#version` on line 1 is permitted by the GLSL ES 3.00
 *      specification); otherwise compilation fails or falls back to GLSL ES 1.00.
 *    - Vertex inputs use `in` (replacing legacy `attribute`).
 *    - Data passed from Vertex Shader to Fragment Shader uses `out` in the
 *      Vertex Shader and matching `in` in the Fragment Shader (replacing `varying`).
 *    - Fragment outputs use an explicit `out vec4 outColor;` declaration
 *      (replacing the removed built-in `gl_FragColor`).
 * ============================================================================
 */

(function () {
  "use strict";

  /**
   * Explicit attribute slot locations shared between JavaScript VAO setup and
   * the GLSL ES 3.00 Vertex Shader `layout(location = ...)` qualifiers.
   *
   * WHY USE EXPLICIT ATTRIBUTE LOCATIONS?
   * In GLSL ES 3.00, `layout(location = N)` binds each vertex input variable to
   * a fixed hardware attribute slot at compile time. This guarantees that
   * position is always slot 0 and color is always slot 1 across both the
   * 3D Cube VAO and the Task 3.2 Triangle VAO without relying on arbitrary
   * compiler assignment order.
   */
  const ATTRIBUTE_LOCATIONS = Object.freeze({
    POSITION: 0,
    COLOR: 1,
  });

  /**
   * Canonical uniform variable names declared in the 3D MVP Vertex Shader.
   */
  const UNIFORM_NAMES = Object.freeze({
    MODEL_MATRIX: "u_modelMatrix",
    VIEW_MATRIX: "u_viewMatrix",
    PROJECTION_MATRIX: "u_projectionMatrix",
  });

  /**
   * Default GLSL ES 3.00 Vertex Shader Source (Task 3.3: 3D MVP Transformation Pipeline).
   *
   * Execution Role:
   * Runs for each vertex submitted by `gl.drawElements()` or `gl.drawArrays()`.
   *
   * Inputs (`in`):
   * - `a_position` (`vec3` at location 0): Local Object-Space coordinates (x, y, z)
   *   read from the bound Vertex Buffer Object (VBO).
   * - `a_color` (`vec3` at location 1): Normalized RGB vertex/face color in [0.0, 1.0].
   *
   * Uniforms (`uniform mat4`):
   * - `u_modelMatrix`: Transforms Object Space -> World Space (Scale, Rotate, Translate).
   * - `u_viewMatrix`: Transforms World Space -> Camera/View Space (`lookAt`).
   * - `u_projectionMatrix`: Transforms View Space -> Homogeneous Clip Space (`perspective`).
   *
   * Note on Compatibility with Task 3.2 Clip-Space Triangle Mode:
   * When `u_modelMatrix`, `u_viewMatrix`, and `u_projectionMatrix` are set to the
   * 4x4 Identity Matrix (`I_4`), `I * I * I * vec4(a_position, 1.0)` reduces
   * mathematically to `vec4(a_position, 1.0)` — the exact clip-space pass-through
   * equation from Task 3.2!
   */
  const VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec3 v_color;

void main() {
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
  v_color = a_color;
}
`;

  /**
   * Preserved Task 3.2 Clip-Space Pass-Through Vertex Shader Source for reference
   * and isolated shader compilation experiments.
   */
  const CLIP_SPACE_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;

out vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 1.0);
  v_color = a_color;
}
`;

  /**
   * GLSL ES 3.00 Fragment Shader Source.
   *
   * Execution Role:
   * Runs once for every candidate pixel fragment covered by a rasterized triangle.
   *
   * Precision Qualifier (`precision mediump float;`):
   * GLSL ES requires an explicit default floating-point precision in the
   * Fragment Shader (unlike Vertex Shaders, which default to `highp` for floats).
   * `mediump` provides at least 10-bit significand precision, which is standard
   * and sufficient for interpolated normalized color values in [0.0, 1.0].
   *
   * Inputs (`in`):
   * - `v_color` (`vec3`): The barycentrically interpolated RGB color at the
   *   current fragment's center, matching `out vec3 v_color` from the Vertex Shader.
   *   (For our 3D Cube, where all 4 vertices of a given face share the same
   *   color, barycentric interpolation produces a crisp, uniform face color;
   *   for the Task 3.2 triangle, it produces a smooth RGB gradient).
   *
   * Outputs (`out`):
   * - `outColor` (`vec4`): Explicit fragment color output sent to the per-fragment
   *   output merger (where fragments that pass `gl.DEPTH_TEST` write their RGBA
   *   value into attachment 0 of the default framebuffer's Color Buffer).
   */
  const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1.0);
}
`;

  /**
   * Creates and compiles an individual GLSL shader object on the GPU.
   *
   * Purpose:
   * Translates human-readable GLSL ES 3.00 source code into GPU-specific
   * intermediate instructions for either the Vertex or Fragment stage.
   *
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 rendering context
   * @param {number} type `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`
   * @param {string} source GLSL ES 3.00 source string (must start with `#version 300 es`)
   * @returns {WebGLShader} Compiled WebGLShader handle
   * @throws {Error} If shader allocation or GLSL compilation fails
   */
  function compileShader(gl, type, source) {
    const stageName =
      type === gl.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER";

    // 1. Allocate an empty shader object handle on the GPU driver.
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(
        `Failed to allocate WebGLShader object for stage ${stageName}.`
      );
    }

    // 2. Upload the GLSL source string into the shader object and invoke the
    //    driver's built-in GLSL ES 3.00 compiler.
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // 3. Query compilation status. WebGL never throws JavaScript exceptions on
    //    GLSL syntax errors; we must inspect `gl.COMPILE_STATUS` manually.
    const compiledSuccessfully = gl.getShaderParameter(
      shader,
      gl.COMPILE_STATUS
    );

    if (!compiledSuccessfully) {
      const infoLog =
        gl.getShaderInfoLog(shader) || "Unknown GLSL compilation error.";
      // Clean up the failed GPU shader handle immediately to prevent a resource leak.
      gl.deleteShader(shader);
      throw new Error(`[GLSL ${stageName} Compilation Failed]\n${infoLog.trim()}`);
    }

    return shader;
  }

  /**
   * Compiles Vertex and Fragment shaders, links them into a complete executable
   * `WebGLProgram`, and queries both attribute and matrix uniform locations.
   *
   * WHY LINKING IS REQUIRED AFTER COMPILATION:
   * Compiling checks each shader stage in isolation, whereas linking verifies
   * that the interface between stages matches (e.g., `out vec3 v_color` in the
   * Vertex Shader matches `in vec3 v_color` in the Fragment Shader in name,
   * type, and interpolation qualifier) and assigns uniform storage locations
   * (`WebGLUniformLocation`) inside the linked executable.
   *
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 rendering context
   * @param {string} [vertexSource=VERTEX_SHADER_SOURCE] GLSL ES 3.00 vertex shader source
   * @param {string} [fragmentSource=FRAGMENT_SHADER_SOURCE] GLSL ES 3.00 fragment shader source
   * @returns {{
   *   program: WebGLProgram,
   *   attribLocations: { position: number, color: number },
   *   uniformLocations: {
   *     modelMatrix: WebGLUniformLocation | null,
   *     viewMatrix: WebGLUniformLocation | null,
   *     projectionMatrix: WebGLUniformLocation | null
   *   }
   * }} Linked program, attribute locations, and matrix uniform locations
   * @throws {Error} If either shader fails to compile or the program fails to link
   */
  function createShaderProgram(
    gl,
    vertexSource = VERTEX_SHADER_SOURCE,
    fragmentSource = FRAGMENT_SHADER_SOURCE
  ) {
    let vertexShader = null;
    let fragmentShader = null;
    let program = null;

    try {
      // 1. Compile both programmable stages independently.
      vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

      // 2. Allocate a WebGLProgram container and attach the compiled stages.
      program = gl.createProgram();
      if (!program) {
        throw new Error("Failed to allocate WebGLProgram object.");
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);

      // 3. Link the attached stages into a single GPU pipeline executable.
      gl.linkProgram(program);

      // 4. Verify link status and retrieve diagnostic logs on failure.
      const linkedSuccessfully = gl.getProgramParameter(
        program,
        gl.LINK_STATUS
      );
      if (!linkedSuccessfully) {
        const infoLog =
          gl.getProgramInfoLog(program) || "Unknown program linking error.";
        throw new Error(`[WebGLProgram Linking Failed]\n${infoLog.trim()}`);
      }

      // 5. Detach and delete the intermediate WebGLShader objects now that the
      //    executable binary is stored inside `program`.
      gl.detachShader(program, vertexShader);
      gl.detachShader(program, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      vertexShader = null;
      fragmentShader = null;

      // 6. Query attribute locations (matching layout(location = 0) and 1).
      const positionLoc = gl.getAttribLocation(program, "a_position");
      const colorLoc = gl.getAttribLocation(program, "a_color");

      // 7. Query uniform locations for the 4x4 Model, View, and Projection matrices.
      //    Note: `gl.getUniformLocation()` returns `null` if a custom shader
      //    (such as a Task 3.2 clip-space test shader) does not declare or use
      //    that uniform.
      const modelMatrixLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.MODEL_MATRIX
      );
      const viewMatrixLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.VIEW_MATRIX
      );
      const projectionMatrixLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.PROJECTION_MATRIX
      );

      return {
        program,
        attribLocations: {
          position:
            positionLoc >= 0 ? positionLoc : ATTRIBUTE_LOCATIONS.POSITION,
          color: colorLoc >= 0 ? colorLoc : ATTRIBUTE_LOCATIONS.COLOR,
        },
        uniformLocations: {
          modelMatrix: modelMatrixLoc,
          viewMatrix: viewMatrixLoc,
          projectionMatrix: projectionMatrixLoc,
        },
      };
    } catch (error) {
      // Safely release any partially created GPU objects before re-throwing.
      if (vertexShader) {
        gl.deleteShader(vertexShader);
      }
      if (fragmentShader) {
        gl.deleteShader(fragmentShader);
      }
      if (program) {
        gl.deleteProgram(program);
      }
      throw error;
    }
  }

  /**
   * Safely deletes a `WebGLProgram` from GPU memory during teardown or reset.
   *
   * @param {WebGL2RenderingContext | null} gl
   * @param {WebGLProgram | null} program
   */
  function deleteShaderProgram(gl, program) {
    if (!gl || !program || gl.isContextLost()) {
      return;
    }
    gl.deleteProgram(program);
  }

  // Expose shader pipeline utilities to Module 1 scripts
  window.Module1Shaders = Object.freeze({
    ATTRIBUTE_LOCATIONS,
    UNIFORM_NAMES,
    VERTEX_SHADER_SOURCE,
    CLIP_SPACE_VERTEX_SHADER_SOURCE,
    FRAGMENT_SHADER_SOURCE,
    compileShader,
    createShaderProgram,
    deleteShaderProgram,
  });
})();
