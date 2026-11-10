/**
 * ============================================================================
 * Module 01: WebGL Graphics — Tasks 3.2 – 3.5: GLSL ES 3.00 Shader Pipeline
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
 * 2. Attributes (`in`) vs. Uniforms (`uniform`):
 *    - **Vertex Attributes (`in vec3 a_position`, `in vec3 a_color`):** Change
 *      from vertex to vertex and are fetched from a Vertex Buffer Object (VBO).
 *    - **Uniforms (`uniform mat4 u_modelMatrix`, `u_viewMatrix`, `u_projectionMatrix`,
 *      `uniform vec3 u_partColor`):** Remain constant ("uniform") across all
 *      vertices and fragments processed within a single draw call. Their GPU
 *      slot handles (`WebGLUniformLocation`) are queried once after
 *      `gl.linkProgram()` via `gl.getUniformLocation()`.
 *
 * 3. Task 3.5 Geometry Reuse via Per-Draw-Call Uniforms (`u_modelMatrix` & `u_partColor`):
 *    When rendering a composite 3D object (such as the 13-part Desktop PC Case)
 *    by reusing a single unit-cube VAO/VBO/EBO across multiple `gl.drawElements()`
 *    calls, each draw call represents a different box component with its own
 *    world transform and material color. By uploading a per-part `u_modelMatrix`
 *    and `u_partColor` (`u_usePartColor = 1.0`) before each draw call, one 576-byte
 *    VBO can render any number of differently sized, positioned, and colored
 *    3D boxes without allocating additional GPU buffers!
 *
 * 4. Matrix Multiplication & Storage Agreement:
 *    In GLSL ES 3.00, `mat4` is stored in **Column-Major Order** and `vec4`
 *    behaves as a column vector when placed on the right of a matrix (`M * v`).
 *    Therefore, `u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0)`
 *    applies `u_modelMatrix` first (Object -> World Space), `u_viewMatrix` second
 *    (World -> View/Camera Space), and `u_projectionMatrix` third (View -> Clip Space).
 * ============================================================================
 */

(function () {
  "use strict";

  /**
   * Explicit attribute slot locations shared between JavaScript VAO setup and
   * the GLSL ES 3.00 Vertex Shader `layout(location = ...)` qualifiers.
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
    PART_COLOR: "u_partColor",
    USE_PART_COLOR: "u_usePartColor",
    FACE_SHADING_STRENGTH: "u_faceShadingStrength",
  });

  /**
   * Default GLSL ES 3.00 Vertex Shader Source (Tasks 3.3 – 3.5: 3D MVP Pipeline
   * with support for both per-vertex VBO colors and per-component uniform colors).
   *
   * Execution Role:
   * Runs for each vertex submitted by `gl.drawElements()` or `gl.drawArrays()`.
   *
   * Inputs (`in`):
   * - `a_position` (`vec3` at location 0): Local Object-Space coordinates (x, y, z)
   *   read from the bound Vertex Buffer Object (VBO).
   * - `a_color` (`vec3` at location 1): Normalized RGB vertex/face color in [0.0, 1.0].
   *
   * Uniforms:
   * - `u_modelMatrix` (`mat4`): Transforms Object Space -> World Space (`M_worldPart = M_root * M_localPart`).
   * - `u_viewMatrix` (`mat4`): Transforms World Space -> Camera/View Space (`lookAt`).
   * - `u_projectionMatrix` (`mat4`): Transforms View Space -> Homogeneous Clip Space (`perspective`).
   * - `u_partColor` (`vec3`): Base RGB material color for the current composite component.
   * - `u_usePartColor` (`float`): `1.0` when rendering composite PC Case components
   *   with `u_partColor`; `0.0` when rendering the single 6-face colored Cube or
   *   Clip-Space Triangle using the VBO `a_color` attribute.
   * - `u_faceShadingStrength` (`float` in `[0.0, 1.0]`): Controls directional
   *   per-face luminance differentiation in composite mode (`1.0` default so
   *   adjacent orthogonal faces of a single-color box remain visually distinct;
   *   `0.0` disables face shading to demonstrate how flat colors hide 3D edges).
   */
  const VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_partColor;
uniform float u_usePartColor;
uniform float u_faceShadingStrength;

out vec3 v_color;

void main() {
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);

  if (u_usePartColor > 0.5) {
    // In our 24-vertex unit cube VBO, every 4 consecutive vertices belong to
    // one of the 6 orthogonal faces (0: +Z Front, 1: -Z Back, 2: +Y Top,
    // 3: -Y Bottom, 4: +X Right, 5: -X Left). Using GLSL ES 3.00's built-in
    // gl_VertexID lets us apply a deterministic directional shade multiplier
    // per face without needing extra normal attributes in the VBO.
    // NOTE: These shade factors (1.00, 0.72, 1.14, 0.58, 0.88, 0.76) are
    // manually selected empirical visual multipliers chosen for aesthetic
    // 3D form contrast, NOT physically based lighting (PBR) or normal-based
    // illumination calculations (e.g. Lambertian N·L or Blinn-Phong).
    int faceId = gl_VertexID / 4;
    float faceShade = 1.0;
    if (faceId == 0) {
      faceShade = 1.00; // Front (+Z): primary studio key light
    } else if (faceId == 1) {
      faceShade = 0.72; // Back (-Z): rear shadow
    } else if (faceId == 2) {
      faceShade = 1.14; // Top (+Y): overhead zenith highlight
    } else if (faceId == 3) {
      faceShade = 0.58; // Bottom (-Y): underside occlusion
    } else if (faceId == 4) {
      faceShade = 0.88; // Right (+X): secondary fill light
    } else {
      faceShade = 0.76; // Left (-X): side shadow
    }
    float effectiveShade = mix(1.0, faceShade, clamp(u_faceShadingStrength, 0.0, 1.0));
    v_color = clamp(u_partColor * effectiveShade, 0.0, 1.0);
  } else {
    v_color = a_color;
  }
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
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 rendering context
   * @param {number} type `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`
   * @param {string} source GLSL ES 3.00 source string (must start with `#version 300 es`)
   * @returns {WebGLShader} Compiled WebGLShader handle
   * @throws {Error} If shader allocation or GLSL compilation fails
   */
  function compileShader(gl, type, source) {
    const stageName =
      type === gl.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER";

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(
        `Failed to allocate WebGLShader object for stage ${stageName}.`
      );
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiledSuccessfully = gl.getShaderParameter(
      shader,
      gl.COMPILE_STATUS
    );

    if (!compiledSuccessfully) {
      const infoLog =
        gl.getShaderInfoLog(shader) || "Unknown GLSL compilation error.";
      gl.deleteShader(shader);
      throw new Error(`[GLSL ${stageName} Compilation Failed]\n${infoLog.trim()}`);
    }

    return shader;
  }

  /**
   * Compiles Vertex and Fragment shaders, links them into a complete executable
   * `WebGLProgram`, and queries both attribute and uniform locations.
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
   *     projectionMatrix: WebGLUniformLocation | null,
   *     partColor: WebGLUniformLocation | null,
   *     usePartColor: WebGLUniformLocation | null,
   *     faceShadingStrength: WebGLUniformLocation | null
   *   }
   * }}
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
      vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

      program = gl.createProgram();
      if (!program) {
        throw new Error("Failed to allocate WebGLProgram object.");
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      const linkedSuccessfully = gl.getProgramParameter(
        program,
        gl.LINK_STATUS
      );
      if (!linkedSuccessfully) {
        const infoLog =
          gl.getProgramInfoLog(program) || "Unknown program linking error.";
        throw new Error(`[WebGLProgram Linking Failed]\n${infoLog.trim()}`);
      }

      gl.detachShader(program, vertexShader);
      gl.detachShader(program, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      vertexShader = null;
      fragmentShader = null;

      const positionLoc = gl.getAttribLocation(program, "a_position");
      const colorLoc = gl.getAttribLocation(program, "a_color");

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
      const partColorLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.PART_COLOR
      );
      const usePartColorLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.USE_PART_COLOR
      );
      const faceShadingStrengthLoc = gl.getUniformLocation(
        program,
        UNIFORM_NAMES.FACE_SHADING_STRENGTH
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
          partColor: partColorLoc,
          usePartColor: usePartColorLoc,
          faceShadingStrength: faceShadingStrengthLoc,
        },
      };
    } catch (error) {
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
