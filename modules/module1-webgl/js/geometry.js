/**
 * =============================================================================
 * Module 01: WebGL Graphics — Task 3.2 & Task 3.3:
 * Vertex Buffers (VBO), Element Array Buffers (EBO), VAOs & 3D Cube Geometry
 * =============================================================================
 *
 * Educational Research Overview:
 * ------------------------------
 * This module constructs the procedural 3D Cube mesh (Task 3.3 default scene)
 * as well as the Clip-Space Triangle mesh (Task 3.2 educational reference) and
 * uploads their geometric data into GPU-managed buffer memory using Vertex
 * Buffer Objects (VBOs), Element Array Buffers (EBOs / Index Buffers), and
 * Vertex Array Objects (VAOs).
 *
 * Key Computer Graphics Concepts Demonstrated in Task 3.3:
 * --------------------------------------------------------
 * 1. Why a Per-Face Colored (or Flat-Normal) Cube Needs 24 Vertex Records, Not 8:
 *    - Geometrically, a cube has **8 unique corner positions** in 3D space:
 *      `(±0.5, ±0.5, ±0.5)`.
 *    - However, in WebGL/OpenGL, a "vertex" in a VBO is a **complete attribute
 *      tuple** `[position, color, normal, uv]`. When `gl.drawElements()` looks
 *      up index `k`, it fetches position `k` AND color `k` from the same row `k`.
 *    - Each corner of a cube is shared by **3 orthogonal faces** (for example,
 *      corner `(+0.5, +0.5, +0.5)` belongs to the `+Z` Front face, the `+X` Right
 *      face, and the `+Y` Top face). If we used only 8 vertices in the VBO, that
 *      corner could hold only *one* color, causing colors to bleed across faces
 *      instead of giving each face a crisp, distinct color (or distinct surface
 *      normal in lighting calculations).
 *    - Therefore, we define **6 faces × 4 corners per face = 24 face-specific
 *      vertex records** in our interleaved `Float32Array` (`24 × 6 floats = 144`
 *      floats = `576` bytes).
 *
 * 2. Why Element Array Buffers (EBO) & `gl.drawElements()` Are Still Valuable:
 *    - Even with 24 face-specific vertices, each quadrilateral face is rasterized
 *      as **2 triangles** (`6` vertex references per face, or `6 faces × 6 = 36`
 *      indices total).
 *    - Without an Index Buffer (`gl.drawArrays`), we would have to duplicate the
 *      two diagonal corners of every face, storing `36` vertex records (`864` bytes).
 *    - With an **Element Array Buffer (`gl.ELEMENT_ARRAY_BUFFER`)** storing a
 *      `Uint16Array(36)`, each face's 4 vertices `(v0, v1, v2, v3)` are shared
 *      between its two triangles `(v0, v1, v2)` and `(v0, v2, v3)`, reducing
 *      VBO storage from 36 vertices to 24 vertices and allowing the GPU's
 *      post-transform vertex cache to reuse the 2 shared diagonal vertices on
 *      every face.
 *
 * 3. Critical VAO + EBO Binding Rule in WebGL 2.0:
 *    - Unlike `gl.ARRAY_BUFFER` (which is latched into an attribute slot only
 *      when `gl.vertexAttribPointer()` is called), the **`gl.ELEMENT_ARRAY_BUFFER`
 *      binding is stored directly inside the currently bound VAO's state table**.
 *    - Therefore, when configuring a VAO that uses indexed rendering:
 *        * You MUST bind `gl.ELEMENT_ARRAY_BUFFER` while the VAO is bound.
 *        * You MUST unbind the VAO (`gl.bindVertexArray(null)`) **BEFORE**
 *          unbinding `gl.ELEMENT_ARRAY_BUFFER` (otherwise unbinding the EBO
 *          while the VAO is still active erases the EBO reference from the VAO!).
 * =============================================================================
 */

(function () {
  "use strict";

  const FLOAT_SIZE_BYTES = Float32Array.BYTES_PER_ELEMENT; // 4 bytes per 32-bit float
  const POSITION_COMPONENTS = 3; // (X, Y, Z)
  const COLOR_COMPONENTS = 3; // (R, G, B)
  const FLOATS_PER_VERTEX = POSITION_COMPONENTS + COLOR_COMPONENTS; // 6 floats per vertex
  const DEFAULT_STRIDE_BYTES = FLOATS_PER_VERTEX * FLOAT_SIZE_BYTES; // 24 bytes per vertex
  const DEFAULT_POSITION_OFFSET_BYTES = 0; // X, Y, Z start at byte 0
  const DEFAULT_COLOR_OFFSET_BYTES = POSITION_COMPONENTS * FLOAT_SIZE_BYTES; // R, G, B start at byte 12

  // ---------------------------------------------------------------------------
  // 1. Task 3.3 Procedural 3D Cube Definition (24 Vertices, 36 Indices)
  // ---------------------------------------------------------------------------

  /**
   * Distinct, high-contrast scientific palette for the 6 faces of the unit cube
   * (`x, y, z in [-0.5, +0.5]`, side length = `1.0`).
   *
   * Each face's 4 vertices are ordered Counter-Clockwise (CCW) when viewed from
   * outside the cube looking toward the origin (standard Right-Handed front-face
   * winding order).
   */
  const CUBE_FACE_DEFINITIONS = Object.freeze([
    {
      name: "Front (+Z)",
      normal: [0, 0, 1],
      color: [0.36, 0.58, 1.00], // Signal Blue
      corners: [
        [-0.5, -0.5,  0.5], // 0: Bottom-Left
        [ 0.5, -0.5,  0.5], // 1: Bottom-Right
        [ 0.5,  0.5,  0.5], // 2: Top-Right
        [-0.5,  0.5,  0.5], // 3: Top-Left
      ],
    },
    {
      name: "Back (-Z)",
      normal: [0, 0, -1],
      color: [0.95, 0.52, 0.28], // Warm Amber-Orange
      corners: [
        [ 0.5, -0.5, -0.5], // 4: Bottom-Left (looking at -Z face from outside)
        [-0.5, -0.5, -0.5], // 5: Bottom-Right
        [-0.5,  0.5, -0.5], // 6: Top-Right
        [ 0.5,  0.5, -0.5], // 7: Top-Left
      ],
    },
    {
      name: "Top (+Y)",
      normal: [0, 1, 0],
      color: [0.22, 0.78, 0.85], // Scan Cyan
      corners: [
        [-0.5,  0.5,  0.5], // 8:  Front-Left
        [ 0.5,  0.5,  0.5], // 9:  Front-Right
        [ 0.5,  0.5, -0.5], // 10: Back-Right
        [-0.5,  0.5, -0.5], // 11: Back-Left
      ],
    },
    {
      name: "Bottom (-Y)",
      normal: [0, -1, 0],
      color: [0.60, 0.44, 0.96], // Soft Violet
      corners: [
        [-0.5, -0.5, -0.5], // 12: Back-Left (looking at -Y face from below)
        [ 0.5, -0.5, -0.5], // 13: Back-Right
        [ 0.5, -0.5,  0.5], // 14: Front-Right
        [-0.5, -0.5,  0.5], // 15: Front-Left
      ],
    },
    {
      name: "Right (+X)",
      normal: [1, 0, 0],
      color: [0.20, 0.82, 0.56], // Emerald Green
      corners: [
        [ 0.5, -0.5,  0.5], // 16: Bottom-Front
        [ 0.5, -0.5, -0.5], // 17: Bottom-Back
        [ 0.5,  0.5, -0.5], // 18: Top-Back
        [ 0.5,  0.5,  0.5], // 19: Top-Front
      ],
    },
    {
      name: "Left (-X)",
      normal: [-1, 0, 0],
      color: [0.94, 0.38, 0.48], // Coral Rose
      corners: [
        [-0.5, -0.5, -0.5], // 20: Bottom-Back
        [-0.5, -0.5,  0.5], // 21: Bottom-Front
        [-0.5,  0.5,  0.5], // 22: Top-Front
        [-0.5,  0.5, -0.5], // 23: Top-Back
      ],
    },
  ]);

  /**
   * Procedurally builds the interleaved `Float32Array` (24 vertices × 6 floats =
   * 144 floats = 576 bytes) and `Uint16Array` index buffer (6 faces × 2 triangles ×
   * 3 indices = 36 indices = 72 bytes) for the unit 3D cube centered at `(0, 0, 0)`.
   *
   * @returns {{ vertices: Float32Array, indices: Uint16Array }}
   */
  function buildProceduralCubeArrays() {
    const vertices = new Float32Array(24 * FLOATS_PER_VERTEX); // 144 floats
    const indices = new Uint16Array(6 * 6); // 36 uint16 indices

    let floatCursor = 0;
    let indexCursor = 0;

    for (let faceIdx = 0; faceIdx < CUBE_FACE_DEFINITIONS.length; faceIdx += 1) {
      const face = CUBE_FACE_DEFINITIONS[faceIdx];
      const baseVertex = faceIdx * 4;
      const [r, g, b] = face.color;

      for (let cornerIdx = 0; cornerIdx < 4; cornerIdx += 1) {
        const [x, y, z] = face.corners[cornerIdx];
        vertices[floatCursor++] = x;
        vertices[floatCursor++] = y;
        vertices[floatCursor++] = z;
        vertices[floatCursor++] = r;
        vertices[floatCursor++] = g;
        vertices[floatCursor++] = b;
      }

      // Two Counter-Clockwise (CCW) triangles per 4-corner quad face:
      // Triangle 1: (base + 0, base + 1, base + 2)
      // Triangle 2: (base + 0, base + 2, base + 3)
      indices[indexCursor++] = baseVertex + 0;
      indices[indexCursor++] = baseVertex + 1;
      indices[indexCursor++] = baseVertex + 2;

      indices[indexCursor++] = baseVertex + 0;
      indices[indexCursor++] = baseVertex + 2;
      indices[indexCursor++] = baseVertex + 3;
    }

    return { vertices, indices };
  }

  const BUILT_CUBE = buildProceduralCubeArrays();
  const DEFAULT_CUBE_VERTICES = BUILT_CUBE.vertices;
  const DEFAULT_CUBE_INDICES = BUILT_CUBE.indices;

  /**
   * Returns a fresh copy of the 24-vertex interleaved cube `Float32Array` (144 floats).
   *
   * @returns {Float32Array}
   */
  function createDefaultCubeVertexData() {
    return new Float32Array(DEFAULT_CUBE_VERTICES);
  }

  /**
   * Returns a fresh copy of the 36-element cube `Uint16Array` index buffer.
   *
   * @returns {Uint16Array}
   */
  function createDefaultCubeIndexData() {
    return new Uint16Array(DEFAULT_CUBE_INDICES);
  }

  // ---------------------------------------------------------------------------
  // 2. Task 3.2 Clip-Space Triangle Definition (Preserved for Learning Helpers)
  // ---------------------------------------------------------------------------

  /**
   * Default interleaved vertex data for the Task 3.2 Clip-Space triangle
   * (3 vertices × 6 floats = 18 floats = 72 bytes).
   */
  const DEFAULT_TRIANGLE_VERTICES = new Float32Array([
    // X,     Y,    Z,     R,    G,    B
     0.00,  0.65, 0.00,  1.00, 0.36, 0.36, // Vertex 0: Top Apex (Coral Red)
    -0.65, -0.55, 0.00,  0.22, 0.86, 0.54, // Vertex 1: Bottom-Left (Emerald Green)
     0.65, -0.55, 0.00,  0.30, 0.58, 1.00  // Vertex 2: Bottom-Right (Signal Blue)
  ]);

  /**
   * Returns a fresh copy of the 18-float Task 3.2 triangle vertex dataset.
   *
   * @returns {Float32Array}
   */
  function createDefaultVertexData() {
    return new Float32Array(DEFAULT_TRIANGLE_VERTICES);
  }

  // ---------------------------------------------------------------------------
  // 3. GPU Buffer & VAO Creation Functions
  // ---------------------------------------------------------------------------

  /**
   * Creates and configures the GPU Vertex Array Object (VAO), Vertex Buffer
   * Object (VBO, `gl.ARRAY_BUFFER`), and Element Array Buffer (EBO,
   * `gl.ELEMENT_ARRAY_BUFFER`) for the indexed 3D Cube mesh.
   *
   * Execution Flow & Side Effects:
   * 1. Allocates `vao` (`gl.createVertexArray`), `vbo` (`gl.createBuffer`), and
   *    `ebo` (`gl.createBuffer`).
   * 2. Binds `vao` first so both vertex attribute pointers AND the
   *    `gl.ELEMENT_ARRAY_BUFFER` binding are recorded directly inside `vao`.
   * 3. Binds `vbo` to `gl.ARRAY_BUFFER` and uploads the 24 interleaved vertices
   *    (`Float32Array`, 576 bytes) with `gl.STATIC_DRAW`.
   * 4. Binds `ebo` to `gl.ELEMENT_ARRAY_BUFFER` and uploads the 36 triangle
   *    indices (`Uint16Array`, 72 bytes) with `gl.STATIC_DRAW`.
   * 5. Enables and configures Attribute 0 (`a_position`) and Attribute 1
   *    (`a_color`) with `stride = 24` bytes and `offset = 0` / `12` bytes.
   * 6. Unbinds `vao` (`gl.bindVertexArray(null)`) **BEFORE** unbinding
   *    `gl.ARRAY_BUFFER` and `gl.ELEMENT_ARRAY_BUFFER` so `vao` retains its
   *    recorded `ebo` association.
   * 7. On any exception, unbinds targets and deletes any partially allocated
   *    `vao`, `vbo`, and `ebo` handles before re-throwing.
   *
   * @param {WebGL2RenderingContext} gl Active WebGL 2.0 context
   * @param {{ POSITION: number, COLOR: number }} attribLocations Attribute slot indices
   * @param {Float32Array} [customVertexData] Optional custom 144-float vertex array
   * @param {Uint16Array} [customIndexData] Optional custom 36-uint16 index array
   * @param {{ strideBytes?: number, positionOffsetBytes?: number, colorOffsetBytes?: number }} [layoutOptions]
   * @returns {{
   *   meshType: "cube",
   *   indexed: true,
   *   vao: WebGLVertexArrayObject,
   *   vbo: WebGLBuffer,
   *   ebo: WebGLBuffer,
   *   vertexData: Float32Array,
   *   indexData: Uint16Array,
   *   vertexCount: number,
   *   indexCount: number,
   *   indexType: number,
   *   strideBytes: number,
   *   positionOffsetBytes: number,
   *   colorOffsetBytes: number,
   *   byteLength: number,
   *   indexByteLength: number
   * }}
   */
  function createCubeGeometry(
    gl,
    attribLocations,
    customVertexData,
    customIndexData,
    layoutOptions
  ) {
    const vertexData =
      customVertexData instanceof Float32Array
        ? new Float32Array(customVertexData)
        : createDefaultCubeVertexData();

    const indexData =
      customIndexData instanceof Uint16Array
        ? new Uint16Array(customIndexData)
        : createDefaultCubeIndexData();

    const strideBytes =
      layoutOptions && typeof layoutOptions.strideBytes === "number"
        ? layoutOptions.strideBytes
        : DEFAULT_STRIDE_BYTES;

    const positionOffsetBytes =
      layoutOptions && typeof layoutOptions.positionOffsetBytes === "number"
        ? layoutOptions.positionOffsetBytes
        : DEFAULT_POSITION_OFFSET_BYTES;

    const colorOffsetBytes =
      layoutOptions && typeof layoutOptions.colorOffsetBytes === "number"
        ? layoutOptions.colorOffsetBytes
        : DEFAULT_COLOR_OFFSET_BYTES;

    let vao = null;
    let vbo = null;
    let ebo = null;

    try {
      vao = gl.createVertexArray();
      if (!vao) {
        throw new Error(
          "Failed to allocate WebGLVertexArrayObject for 3D Cube (gl.createVertexArray returned null)."
        );
      }

      vbo = gl.createBuffer();
      if (!vbo) {
        throw new Error(
          "Failed to allocate vertex WebGLBuffer for 3D Cube (gl.createBuffer returned null)."
        );
      }

      ebo = gl.createBuffer();
      if (!ebo) {
        throw new Error(
          "Failed to allocate index WebGLBuffer (EBO) for 3D Cube (gl.createBuffer returned null)."
        );
      }

      // Step 1: Bind the VAO first so all subsequent attribute specifications
      // AND the ELEMENT_ARRAY_BUFFER binding are captured in this VAO.
      gl.bindVertexArray(vao);

      // Step 2: Bind the VBO (`gl.ARRAY_BUFFER`) and upload the 24 interleaved vertices.
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

      // Step 3: Bind the EBO (`gl.ELEMENT_ARRAY_BUFFER`) while the VAO is bound
      // and upload the 36 unsigned 16-bit triangle indices (`Uint16Array`).
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

      // Step 4: Configure Attribute 0 — Vertex Position (`a_position`, vec3).
      gl.enableVertexAttribArray(attribLocations.POSITION);
      gl.vertexAttribPointer(
        attribLocations.POSITION,
        POSITION_COMPONENTS,
        gl.FLOAT,
        false,
        strideBytes,
        positionOffsetBytes
      );

      // Step 5: Configure Attribute 1 — Vertex Color (`a_color`, vec3).
      gl.enableVertexAttribArray(attribLocations.COLOR);
      gl.vertexAttribPointer(
        attribLocations.COLOR,
        COLOR_COMPONENTS,
        gl.FLOAT,
        false,
        strideBytes,
        colorOffsetBytes
      );

      // Step 6: CRITICAL — Unbind the VAO BEFORE unbinding ELEMENT_ARRAY_BUFFER!
      // If we unbound `gl.ELEMENT_ARRAY_BUFFER` while `vao` was still bound,
      // `vao` would record `null` as its index buffer and `gl.drawElements` would fail.
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

      const vertexCount = Math.floor(vertexData.length / FLOATS_PER_VERTEX);

      return {
        meshType: "cube",
        indexed: true,
        vao,
        vbo,
        ebo,
        vertexData,
        indexData,
        vertexCount,
        indexCount: indexData.length,
        indexType: gl.UNSIGNED_SHORT,
        strideBytes,
        positionOffsetBytes,
        colorOffsetBytes,
        byteLength: vertexData.byteLength,
        indexByteLength: indexData.byteLength,
      };
    } catch (error) {
      if (!gl.isContextLost()) {
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        if (vao) {
          gl.deleteVertexArray(vao);
        }
        if (vbo) {
          gl.deleteBuffer(vbo);
        }
        if (ebo) {
          gl.deleteBuffer(ebo);
        }
      }
      throw error;
    }
  }

  /**
   * Creates and configures the GPU Vertex Buffer Object (VBO) and Vertex Array
   * Object (VAO) for the non-indexed Task 3.2 clip-space triangle.
   *
   * @param {WebGL2RenderingContext} gl - Active WebGL 2.0 rendering context.
   * @param {{ POSITION: number, COLOR: number }} attribLocations - Attribute slot indices.
   * @param {Float32Array} [customVertexData] - Optional custom interleaved vertex data.
   * @param {{ strideBytes?: number, positionOffsetBytes?: number, colorOffsetBytes?: number }} [layoutOptions]
   */
  function createTriangleGeometry(gl, attribLocations, customVertexData, layoutOptions) {
    const vertexData =
      customVertexData instanceof Float32Array
        ? new Float32Array(customVertexData)
        : createDefaultVertexData();

    const strideBytes =
      layoutOptions && typeof layoutOptions.strideBytes === "number"
        ? layoutOptions.strideBytes
        : DEFAULT_STRIDE_BYTES;

    const positionOffsetBytes =
      layoutOptions && typeof layoutOptions.positionOffsetBytes === "number"
        ? layoutOptions.positionOffsetBytes
        : DEFAULT_POSITION_OFFSET_BYTES;

    const colorOffsetBytes =
      layoutOptions && typeof layoutOptions.colorOffsetBytes === "number"
        ? layoutOptions.colorOffsetBytes
        : DEFAULT_COLOR_OFFSET_BYTES;

    let vao = null;
    let vbo = null;

    try {
      vao = gl.createVertexArray();
      if (!vao) {
        throw new Error(
          "Failed to allocate WebGLVertexArrayObject (gl.createVertexArray returned null)."
        );
      }

      vbo = gl.createBuffer();
      if (!vbo) {
        throw new Error(
          "Failed to allocate WebGLBuffer (gl.createBuffer returned null)."
        );
      }

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(attribLocations.POSITION);
      gl.vertexAttribPointer(
        attribLocations.POSITION,
        POSITION_COMPONENTS,
        gl.FLOAT,
        false,
        strideBytes,
        positionOffsetBytes
      );

      gl.enableVertexAttribArray(attribLocations.COLOR);
      gl.vertexAttribPointer(
        attribLocations.COLOR,
        COLOR_COMPONENTS,
        gl.FLOAT,
        false,
        strideBytes,
        colorOffsetBytes
      );

      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      const vertexCount = Math.floor(vertexData.length / FLOATS_PER_VERTEX);

      return {
        meshType: "triangle",
        indexed: false,
        vao,
        vbo,
        ebo: null,
        vertexData,
        indexData: null,
        vertexCount,
        indexCount: 0,
        indexType: 0,
        strideBytes,
        positionOffsetBytes,
        colorOffsetBytes,
        byteLength: vertexData.byteLength,
        indexByteLength: 0,
      };
    } catch (error) {
      if (!gl.isContextLost()) {
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (vao) {
          gl.deleteVertexArray(vao);
        }
        if (vbo) {
          gl.deleteBuffer(vbo);
        }
      }
      throw error;
    }
  }

  /**
   * Updates the existing VBO contents in-place using `gl.bufferSubData` without
   * reallocating GPU objects (`gl.createBuffer` / `gl.bufferData`) or recompiling
   * the GLSL shader program.
   *
   * WHY VERTEX COLORS REQUIRE `gl.bufferSubData()` INSTEAD OF `gl.uniform*()`:
   * --------------------------------------------------------------------------
   * In our GLSL ES 3.00 Vertex Shader (`js/shaders.js`), surface color enters
   * the pipeline as a per-vertex attribute (`layout(location = 1) in vec3 a_color;`)
   * fetched from the bound Vertex Buffer Object (VBO), NOT as a constant
   * `uniform vec3 u_color`.
   * - A shader `uniform` is constant across an entire draw call (`gl.drawElements`),
   *   so a single `uniform vec3` could not give the 6 faces of our cube 6
   *   different colors in a single draw call.
   * - Because colors live inside the interleaved VBO (`[X, Y, Z, R, G, B]` × 24
   *   vertices = 576 bytes), changing a face's color requires mutating the
   *   RGB floats in the CPU-side `Float32Array` and transferring those updated
   *   bytes into the existing GPU VBO via `gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData)`.
   * - Using `gl.bufferSubData()` overwrites the data inside the existing GPU
   *   allocation in-place, avoiding the overhead of destroying and recreating
   *   `WebGLBuffer` or `WebGLVertexArrayObject` handles.
   *
   * @param {WebGL2RenderingContext} gl - Active WebGL 2.0 rendering context.
   * @param {{ vbo: WebGLBuffer, vertexData: Float32Array }} geometry - Active geometry state.
   * @returns {boolean} True if `gl.bufferSubData` was executed on the active VBO.
   */
  function updateGeometryBuffer(gl, geometry) {
    if (!gl || !geometry || !geometry.vbo || gl.isContextLost()) {
      return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, geometry.vertexData);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return true;
  }

  /**
   * Converts a 6-digit CSS hexadecimal color string (`"#RRGGBB"`) from an HTML
   * `<input type="color">` control into normalized WebGL floating-point RGB
   * channels in `[0.0, 1.0]`.
   *
   * Formula: `c_norm = parseInt(HEX_BYTE, 16) / 255.0`
   *
   * @param {string} hexColor - Hex color string (e.g., `"#5b93ff"`).
   * @returns {[number, number, number]} Normalized `[r, g, b]` in `[0.0, 1.0]`.
   */
  function hexToNormalizedRgb(hexColor) {
    const clean = String(hexColor || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return [0.36, 0.58, 1.0]; // Default Signal Blue fallback
    }
    const r = parseInt(clean.slice(0, 2), 16) / 255.0;
    const g = parseInt(clean.slice(2, 4), 16) / 255.0;
    const b = parseInt(clean.slice(4, 6), 16) / 255.0;
    return [r, g, b];
  }

  /**
   * Converts normalized WebGL RGB floats (`[0.0, 1.0]`) into a 6-digit CSS
   * hexadecimal string (`"#rrggbb"`) for synchronizing `<input type="color">`.
   *
   * @param {number} r - Normalized Red `[0.0, 1.0]`.
   * @param {number} g - Normalized Green `[0.0, 1.0]`.
   * @param {number} b - Normalized Blue `[0.0, 1.0]`.
   * @returns {string} Lowercase hex string `"#rrggbb"`.
   */
  function normalizedRgbToHex(r, g, b) {
    const toByteHex = (v) =>
      Math.min(255, Math.max(0, Math.round((Number(v) || 0) * 255)))
        .toString(16)
        .padStart(2, "0");
    return `#${toByteHex(r)}${toByteHex(g)}${toByteHex(b)}`;
  }

  /**
   * Updates the per-vertex RGB color attributes inside a 24-vertex Cube
   * `Float32Array(144)` either across all 6 faces (`faceTarget = "all"`) or on
   * a single face (`faceTarget = 0..5`, which modifies the 4 vertices belonging
   * to that face: `faceIdx * 4` through `faceIdx * 4 + 3`).
   *
   * @param {Float32Array} cubeVertexData - 144-float interleaved cube VBO array.
   * @param {"all" | number | string} faceTarget - `"all"` or face index `0..5`.
   * @param {[number, number, number]} rgb - Normalized `[r, g, b]` in `[0.0, 1.0]`.
   * @returns {boolean} True if vertex colors were updated.
   */
  function applyCubeFaceColor(cubeVertexData, faceTarget, rgb) {
    if (!cubeVertexData || cubeVertexData.length < 24 * FLOATS_PER_VERTEX || !Array.isArray(rgb)) {
      return false;
    }
    const clamp01 = (v) => Math.min(1.0, Math.max(0.0, Number(v) || 0.0));
    const r = clamp01(rgb[0]);
    const g = clamp01(rgb[1]);
    const b = clamp01(rgb[2]);

    if (faceTarget === "all" || faceTarget === -1 || faceTarget === "-1") {
      for (let v = 0; v < 24; v += 1) {
        const base = v * FLOATS_PER_VERTEX;
        cubeVertexData[base + 3] = r;
        cubeVertexData[base + 4] = g;
        cubeVertexData[base + 5] = b;
      }
      return true;
    }

    const faceIdx = Math.floor(Number(faceTarget));
    if (Number.isNaN(faceIdx) || faceIdx < 0 || faceIdx >= CUBE_FACE_DEFINITIONS.length) {
      return false;
    }

    const startVertex = faceIdx * 4;
    for (let corner = 0; corner < 4; corner += 1) {
      const base = (startVertex + corner) * FLOATS_PER_VERTEX;
      cubeVertexData[base + 3] = r;
      cubeVertexData[base + 4] = g;
      cubeVertexData[base + 5] = b;
    }
    return true;
  }

  /**
   * Re-applies vertex attribute pointer layout (stride and offsets) on an existing
   * VAO/VBO pair.
   *
   * @param {WebGL2RenderingContext} gl - Active WebGL 2.0 rendering context.
   * @param {{ vao: WebGLVertexArrayObject, vbo: WebGLBuffer, strideBytes: number, positionOffsetBytes: number, colorOffsetBytes: number }} geometry
   * @param {{ POSITION: number, COLOR: number }} attribLocations
   * @param {{ strideBytes?: number, positionOffsetBytes?: number, colorOffsetBytes?: number }} layoutOptions
   */
  function updateGeometryLayout(gl, geometry, attribLocations, layoutOptions) {
    if (!gl || !geometry || !geometry.vao || !geometry.vbo || gl.isContextLost()) {
      return;
    }

    if (typeof layoutOptions.strideBytes === "number") {
      geometry.strideBytes = layoutOptions.strideBytes;
    }
    if (typeof layoutOptions.positionOffsetBytes === "number") {
      geometry.positionOffsetBytes = layoutOptions.positionOffsetBytes;
    }
    if (typeof layoutOptions.colorOffsetBytes === "number") {
      geometry.colorOffsetBytes = layoutOptions.colorOffsetBytes;
    }

    gl.bindVertexArray(geometry.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vbo);

    gl.enableVertexAttribArray(attribLocations.POSITION);
    gl.vertexAttribPointer(
      attribLocations.POSITION,
      POSITION_COMPONENTS,
      gl.FLOAT,
      false,
      geometry.strideBytes,
      geometry.positionOffsetBytes
    );

    gl.enableVertexAttribArray(attribLocations.COLOR);
    gl.vertexAttribPointer(
      attribLocations.COLOR,
      COLOR_COMPONENTS,
      gl.FLOAT,
      false,
      geometry.strideBytes,
      geometry.colorOffsetBytes
    );

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Safely deletes the VAO, VBO, and EBO (if present) from GPU memory during
   * teardown or scene reset. Skips deletion if the WebGL context is already lost.
   *
   * @param {WebGL2RenderingContext | null} gl - WebGL 2.0 context.
   * @param {{ vao?: WebGLVertexArrayObject | null, vbo?: WebGLBuffer | null, ebo?: WebGLBuffer | null } | null} geometry
   */
  function deleteGeometryResources(gl, geometry) {
    if (!gl || !geometry || gl.isContextLost()) {
      return;
    }
    if (geometry.vao) {
      gl.deleteVertexArray(geometry.vao);
      geometry.vao = null;
    }
    if (geometry.vbo) {
      gl.deleteBuffer(geometry.vbo);
      geometry.vbo = null;
    }
    if (geometry.ebo) {
      gl.deleteBuffer(geometry.ebo);
      geometry.ebo = null;
    }
  }

  window.Module1Geometry = {
    FLOAT_SIZE_BYTES,
    POSITION_COMPONENTS,
    COLOR_COMPONENTS,
    FLOATS_PER_VERTEX,
    DEFAULT_STRIDE_BYTES,
    DEFAULT_POSITION_OFFSET_BYTES,
    DEFAULT_COLOR_OFFSET_BYTES,
    CUBE_FACE_DEFINITIONS,
    DEFAULT_CUBE_VERTICES,
    DEFAULT_CUBE_INDICES,
    DEFAULT_TRIANGLE_VERTICES,
    createDefaultCubeVertexData,
    createDefaultCubeIndexData,
    createDefaultVertexData,
    createCubeGeometry,
    createTriangleGeometry,
    updateGeometryBuffer,
    updateGeometryLayout,
    deleteGeometryResources,
    hexToNormalizedRgb,
    normalizedRgbToHex,
    applyCubeFaceColor,
  };
})();
