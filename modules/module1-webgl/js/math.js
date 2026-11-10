/**
 * =============================================================================
 * Module 01: WebGL Graphics — Task 3.3: 3D Matrix & Vector Mathematics (`math.js`)
 * =============================================================================
 *
 * Educational Research Overview:
 * ------------------------------
 * This module implements the core 3D linear algebra and homogeneous 4x4 matrix
 * transformations required to project a 3D scene onto a 2D HTML5 `<canvas>`
 * using native WebGL 2.0 and Vanilla JavaScript (without external libraries
 * such as glMatrix or Three.js).
 *
 * Mathematical & Graphics Conventions Established in Module 1:
 * ------------------------------------------------------------
 * 1. Coordinate System Handedness:
 *    - **Right-Handed Coordinate System** in Object Space, World Space, and
 *      View (Camera/Eye) Space:
 *        * `+X` points right
 *        * `+Y` points up
 *        * `+Z` points out of the screen (toward the viewer); therefore, the
 *          camera looks down its local `-Z` axis (`forward = -Z_eye`).
 *    - After the Perspective Projection matrix and perspective division (`xyz / w`),
 *      coordinates enter OpenGL ES 3.0 / WebGL 2.0 **Normalized Device Coordinates
 *      (NDC)** `[-1.0, +1.0]^3`, which is Left-Handed (`-1.0` near plane,
 *      `+1.0` far plane).
 *
 * 2. Vector & Matrix Multiplication Convention:
 *    - **Column-Vector Convention:** A 3D point `(x, y, z)` is represented as a
 *      4x1 homogeneous column vector `v = [x, y, z, 1]^T`.
 *    - Matrices multiply column vectors from the left (`v' = M * v`), so chained
 *      transformations read right-to-left:
 *        `clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0)`
 *    - Why Matrix Multiplication Is Not Commutative (`A * B != B * A`):
 *      Rotating an object around the origin and then translating it along `+X`
 *      moves the rotated object along the world X axis (`T * R * v`), whereas
 *      translating it first and then rotating around the origin orbits the
 *      entire translated object around the origin (`R * T * v`).
 *
 * 3. Memory Layout (`Float32Array` Column-Major Order):
 *    - GLSL ES 3.00 `mat4` expects 16 contiguous 32-bit floats stored in
 *      **Column-Major Order** (indices `0..3` are Column 0, `4..7` are Column 1,
 *      `8..11` are Column 2, and `12..15` are Column 3 — where translation
 *      components `(tx, ty, tz, 1)` reside at indices `12, 13, 14, 15`).
 *
 *        | m[0]  m[4]  m[8]   m[12] |   | c0r0  c1r0  c2r0  tx |
 *        | m[1]  m[5]  m[9]   m[13] | = | c0r1  c1r1  c2r1  ty |
 *        | m[2]  m[6]  m[10]  m[14] |   | c0r2  c1r2  c2r2  tz |
 *        | m[3]  m[7]  m[11]  m[15] |   | c0r3  c1r3  c2r3  1  |
 *
 *    - Storing matrices directly in Column-Major order allows us to pass
 *      `transpose = false` to `gl.uniformMatrix4fv(location, false, matrix)`.
 *
 * 4. Angle Units:
 *    - Low-level trigonometric matrix constructors (`fromXRotation`, `fromYRotation`,
 *      `fromZRotation`, `perspective`) accept angles in **radians** (`Math.sin` /
 *      `Math.cos` native unit).
 *    - Helper utilities `degToRad(degrees)` and `radToDeg(radians)` are provided
 *      so human-readable degree values (e.g., `45°` FOV or `25°` rotation) can
 *      be converted cleanly.
 * =============================================================================
 */

(function () {
  "use strict";

  const DEG_TO_RAD = Math.PI / 180.0;
  const RAD_TO_DEG = 180.0 / Math.PI;
  const EPSILON = 1e-6;

  /**
   * Converts an angle from degrees to radians.
   * Formula: `radians = degrees * (pi / 180)`
   *
   * @param {number} degrees Angle in degrees
   * @returns {number} Angle in radians
   */
  function degToRad(degrees) {
    return Number(degrees) * DEG_TO_RAD;
  }

  /**
   * Converts an angle from radians to degrees.
   * Formula: `degrees = radians * (180 / pi)`
   *
   * @param {number} radians Angle in radians
   * @returns {number} Angle in degrees
   */
  function radToDeg(radians) {
    return Number(radians) * RAD_TO_DEG;
  }

  // ---------------------------------------------------------------------------
  // 1. 3D Vector Utilities (Required for Camera Basis Construction in `lookAt`)
  // ---------------------------------------------------------------------------

  /**
   * Subtracts 3D vector `b` from `a`: `result = a - b`.
   * Geometrically, `a - b` produces the displacement vector pointing from `b` to `a`.
   *
   * @param {ArrayLike<number>} a 3-element vector `[ax, ay, az]`
   * @param {ArrayLike<number>} b 3-element vector `[bx, by, bz]`
   * @returns {number[]} `[ax - bx, ay - by, az - bz]`
   */
  function subtractVec3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  /**
   * Computes the Euclidean dot product (scalar product) of two 3D vectors:
   * `dot(a, b) = ax*bx + ay*by + az*bz = |a| * |b| * cos(theta)`.
   *
   * @param {ArrayLike<number>} a 3-element vector
   * @param {ArrayLike<number>} b 3-element vector
   * @returns {number} Scalar dot product
   */
  function dotVec3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Computes the 3D cross product `a × b`, which produces a vector perpendicular
   * to both `a` and `b` following the Right-Hand Rule.
   *
   * @param {ArrayLike<number>} a 3-element vector `[ax, ay, az]`
   * @param {ArrayLike<number>} b 3-element vector `[bx, by, bz]`
   * @returns {number[]} Perpendicular 3D vector
   */
  function crossVec3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  /**
   * Normalizes a 3D vector to unit length (`|v| = 1.0`).
   * If the vector length is near zero, returns `[0, 0, 0]` safely without dividing by zero.
   *
   * @param {ArrayLike<number>} v 3-element vector `[vx, vy, vz]`
   * @returns {number[]} Unit vector `[vx/|v|, vy/|v|, vz/|v|]`
   */
  function normalizeVec3(v) {
    const lenSq = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if (lenSq <= EPSILON * EPSILON) {
      return [0, 0, 0];
    }
    const invLen = 1.0 / Math.sqrt(lenSq);
    return [v[0] * invLen, v[1] * invLen, v[2] * invLen];
  }

  // ---------------------------------------------------------------------------
  // 2. 4x4 Homogeneous Matrix Operations (Column-Major `Float32Array(16)`)
  // ---------------------------------------------------------------------------

  /**
   * Creates a 4x4 Identity Matrix (`I_4`) in column-major order.
   * Multiplying any vector or matrix by `I_4` leaves it unchanged (`I * v = v`).
   *
   * @param {Float32Array} [out] Optional target 16-element `Float32Array`
   * @returns {Float32Array} 16-element column-major identity matrix
   */
  function createIdentityMatrix(out) {
    const m = out instanceof Float32Array && out.length === 16
      ? out
      : new Float32Array(16);
    m[0] = 1;  m[4] = 0;  m[8] = 0;   m[12] = 0;
    m[1] = 0;  m[5] = 1;  m[9] = 0;   m[13] = 0;
    m[2] = 0;  m[6] = 0;  m[10] = 1;  m[14] = 0;
    m[3] = 0;  m[7] = 0;  m[11] = 0;  m[15] = 1;
    return m;
  }

  /**
   * Multiplies two 4x4 column-major matrices: `out = a * b`.
   *
   * IMPORTANT COLUMN-VECTOR ORDERING:
   * When transforming a column vector `v`, `(a * b) * v = a * (b * v)`.
   * That means transformation `b` is applied to `v` FIRST, followed by `a`.
   *
   * Mathematical definition for element at row `r` (0..3) and column `c` (0..3),
   * located at index `c * 4 + r` in column-major storage:
   *   `out[c * 4 + r] = sum_{k=0..3} ( a[k * 4 + r] * b[c * 4 + k] )`
   *
   * @param {ArrayLike<number>} a Left 4x4 matrix (16 floats, column-major)
   * @param {ArrayLike<number>} b Right 4x4 matrix (16 floats, column-major)
   * @param {Float32Array} [out] Optional destination `Float32Array(16)` (safe if `out === a` or `out === b`)
   * @returns {Float32Array} Product matrix `a * b` in column-major order
   */
  function multiplyMatrices(a, b, out) {
    const dst = out instanceof Float32Array && out.length === 16
      ? out
      : new Float32Array(16);

    // Cache elements of `a` in local scalars so in-place multiplication (`out === a`) is safe
    const a00 = a[0],  a10 = a[1],  a20 = a[2],  a30 = a[3];
    const a01 = a[4],  a11 = a[5],  a21 = a[6],  a31 = a[7];
    const a02 = a[8],  a12 = a[9],  a22 = a[10], a32 = a[11];
    const a03 = a[12], a13 = a[13], a23 = a[14], a33 = a[15];

    for (let col = 0; col < 4; col += 1) {
      const base = col * 4;
      const b0 = b[base + 0];
      const b1 = b[base + 1];
      const b2 = b[base + 2];
      const b3 = b[base + 3];

      dst[base + 0] = a00 * b0 + a01 * b1 + a02 * b2 + a03 * b3;
      dst[base + 1] = a10 * b0 + a11 * b1 + a12 * b2 + a13 * b3;
      dst[base + 2] = a20 * b0 + a21 * b1 + a22 * b2 + a23 * b3;
      dst[base + 3] = a30 * b0 + a31 * b1 + a32 * b2 + a33 * b3;
    }

    return dst;
  }

  /**
   * Creates a 4x4 Translation Matrix that shifts a 3D point `(x, y, z, 1)`
   * to `(x + tx, y + ty, z + tz, 1)`.
   *
   * Why 4x4 Homogeneous Coordinates Are Needed for Translation:
   * A 3x3 linear matrix can rotate, scale, or shear around `(0, 0, 0)`, but it
   * always maps `(0, 0, 0)` to `(0, 0, 0)`. Adding a 4th homogeneous coordinate
   * `w = 1` allows 3D translation to be expressed as matrix multiplication
   * via Column 3 (`m[12] = tx, m[13] = ty, m[14] = tz, m[15] = 1`):
   *   `x' = 1*x + 0*y + 0*z + tx*1 = x + tx`
   *
   * @param {number} tx Translation along X axis
   * @param {number} ty Translation along Y axis
   * @param {number} tz Translation along Z axis
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major translation matrix
   */
  function fromTranslation(tx, ty, tz, out) {
    const m = createIdentityMatrix(out);
    m[12] = Number(tx) || 0;
    m[13] = Number(ty) || 0;
    m[14] = Number(tz) || 0;
    return m;
  }

  /**
   * Creates a 4x4 Scaling Matrix that scales a 3D point along the X, Y, and Z axes:
   * `(x', y', z', 1) = (sx * x, sy * y, sz * z, 1)`.
   *
   * @param {number} sx Scale factor along X
   * @param {number} sy Scale factor along Y
   * @param {number} sz Scale factor along Z
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major scaling matrix
   */
  function fromScaling(sx, sy, sz, out) {
    const m = createIdentityMatrix(out);
    m[0] = Number(sx);
    m[5] = Number(sy);
    m[10] = Number(sz);
    return m;
  }

  /**
   * Creates a 4x4 Right-Handed Rotation Matrix around the +X axis (Pitch).
   * Positive angle rotates the +Y axis toward the +Z axis.
   *
   * Mathematical Matrix (Column-Major layout):
   *   | 1    0       0     0 |
   *   | 0  cos(a) -sin(a)  0 |
   *   | 0  sin(a)  cos(a)  0 |
   *   | 0    0       0     1 |
   *
   * @param {number} angleRad Rotation angle in radians
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major X-rotation matrix
   */
  function fromXRotation(angleRad, out) {
    const m = createIdentityMatrix(out);
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    // Column 1 (y basis vector = [0, cos, sin, 0]^T)
    m[5] = c;
    m[6] = s;
    // Column 2 (z basis vector = [0, -sin, cos, 0]^T)
    m[9] = -s;
    m[10] = c;
    return m;
  }

  /**
   * Creates a 4x4 Right-Handed Rotation Matrix around the +Y axis (Yaw).
   * Positive angle rotates the +Z axis toward the +X axis.
   *
   * Mathematical Matrix (Column-Major layout):
   *   |  cos(a)  0  sin(a)  0 |
   *   |    0     1    0     0 |
   *   | -sin(a)  0  cos(a)  0 |
   *   |    0     0    0     1 |
   *
   * @param {number} angleRad Rotation angle in radians
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major Y-rotation matrix
   */
  function fromYRotation(angleRad, out) {
    const m = createIdentityMatrix(out);
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    // Column 0 (x basis vector = [cos, 0, -sin, 0]^T)
    m[0] = c;
    m[2] = -s;
    // Column 2 (z basis vector = [sin, 0, cos, 0]^T)
    m[8] = s;
    m[10] = c;
    return m;
  }

  /**
   * Creates a 4x4 Right-Handed Rotation Matrix around the +Z axis (Roll).
   * Positive angle rotates the +X axis toward the +Y axis.
   *
   * Mathematical Matrix (Column-Major layout):
   *   | cos(a) -sin(a)  0  0 |
   *   | sin(a)  cos(a)  0  0 |
   *   |   0       0     1  0 |
   *   |   0       0     0  1 |
   *
   * @param {number} angleRad Rotation angle in radians
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major Z-rotation matrix
   */
  function fromZRotation(angleRad, out) {
    const m = createIdentityMatrix(out);
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    // Column 0 (x basis vector = [cos, sin, 0, 0]^T)
    m[0] = c;
    m[1] = s;
    // Column 1 (y basis vector = [-sin, cos, 0, 0]^T)
    m[4] = -s;
    m[5] = c;
    return m;
  }

  /**
   * Composes a complete 4x4 Model Matrix (`M = T * Rz * Ry * Rx * S`) that transforms
   * vertices from Object Space (Local Space) into World Space.
   *
   * Transformation Order Applied to a Column Vector `v`:
   *   1. `S`:  Scale the object in its local coordinate axes.
   *   2. `Rx`: Pitch rotation around the X axis.
   *   3. `Ry`: Yaw rotation around the Y axis.
   *   4. `Rz`: Roll rotation around the Z axis.
   *   5. `T`:  Translate the scaled and rotated object to its World-Space position.
   *
   * @param {{
   *   translation?: [number, number, number],
   *   rotationDeg?: [number, number, number],
   *   scale?: [number, number, number]
   * }} params Transformation parameters (angles in degrees for convenience)
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} Composed 4x4 Model Matrix in column-major order
   */
  function composeModelMatrix(params, out) {
    const t = (params && params.translation) || [0, 0, 0];
    const rDeg = (params && params.rotationDeg) || [0, 0, 0];
    const s = (params && params.scale) || [1, 1, 1];

    const matT = fromTranslation(t[0], t[1], t[2]);
    const matRx = fromXRotation(degToRad(rDeg[0]));
    const matRy = fromYRotation(degToRad(rDeg[1]));
    const matRz = fromZRotation(degToRad(rDeg[2]));
    const matS = fromScaling(s[0], s[1], s[2]);

    // Multiply right-to-left: M = T * Rz * Ry * Rx * S
    const temp1 = multiplyMatrices(matRz, matRy);
    const temp2 = multiplyMatrices(temp1, matRx);
    const temp3 = multiplyMatrices(temp2, matS);
    return multiplyMatrices(matT, temp3, out);
  }

  /**
   * Constructs a 4x4 Right-Handed Camera View Matrix (`lookAt`) that transforms
   * World-Space coordinates into Camera/Eye Space.
   *
   * Mathematical & Geometric Derivation:
   * ------------------------------------
   * A camera has no physical entity in WebGL; instead, moving the camera to
   * position `eye` and rotating it to look at `target` is equivalent to applying
   * the **inverse transformation** to the entire world so the camera sits at the
   * origin `(0, 0, 0)` looking down its `-Z` axis:
   *
   * 1. **Camera Basis Vectors in World Space:**
   *    - `zAxis` (Camera Back / `+Z_cam`): Points from `target` toward `eye`:
   *        `zAxis = normalize(eye - target)`
   *      (Because the camera looks down `-Z_cam`, its forward vector is `-zAxis`).
   *    - `xAxis` (Camera Right / `+X_cam`): Perpendicular to both world `up` and `zAxis`:
   *        `xAxis = normalize(cross(up, zAxis))`
   *    - `yAxis` (Camera True Up / `+Y_cam`): Perpendicular to `zAxis` and `xAxis`:
   *        `yAxis = cross(zAxis, xAxis)`
   *
   * 2. **Inverting the Camera Pose (`V = R^T * T^{-1}`):**
   *    - First translate the world by `-eye` (`T^{-1}`).
   *    - Then project onto the orthonormal camera basis vectors (`R^T`, whose rows
   *      are `xAxis`, `yAxis`, and `zAxis`):
   *
   *        | xAxis.x  xAxis.y  xAxis.z  -dot(xAxis, eye) |
   *        | yAxis.x  yAxis.y  yAxis.z  -dot(yAxis, eye) |
   *        | zAxis.x  zAxis.y  zAxis.z  -dot(zAxis, eye) |
   *        |    0        0        0             1        |
   *
   * @param {ArrayLike<number>} eye Camera position `[ex, ey, ez]` in World Space
   * @param {ArrayLike<number>} target Look-at target point `[tx, ty, tz]` in World Space
   * @param {ArrayLike<number>} up World up reference vector `[ux, uy, uz]` (typically `[0, 1, 0]`)
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major View Matrix
   */
  function lookAt(eye, target, up, out) {
    const m = createIdentityMatrix(out);

    const zAxis = normalizeVec3(subtractVec3(eye, target));
    // Guard against degenerate case where `eye` and `target` coincide
    if (zAxis[0] === 0 && zAxis[1] === 0 && zAxis[2] === 0) {
      zAxis[2] = 1;
    }

    let xAxis = normalizeVec3(crossVec3(up, zAxis));
    // Guard against degenerate case where `up` is parallel to `zAxis`
    if (xAxis[0] === 0 && xAxis[1] === 0 && xAxis[2] === 0) {
      const fallbackUp = Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      xAxis = normalizeVec3(crossVec3(fallbackUp, zAxis));
    }

    const yAxis = crossVec3(zAxis, xAxis);

    // Row 0 = xAxis, Row 1 = yAxis, Row 2 = zAxis stored in Column-Major layout:
    // Column 0
    m[0] = xAxis[0];
    m[1] = yAxis[0];
    m[2] = zAxis[0];
    m[3] = 0;

    // Column 1
    m[4] = xAxis[1];
    m[5] = yAxis[1];
    m[6] = zAxis[1];
    m[7] = 0;

    // Column 2
    m[8] = xAxis[2];
    m[9] = yAxis[2];
    m[10] = zAxis[2];
    m[11] = 0;

    // Column 3: -dot(basisAxis, eye)
    m[12] = -dotVec3(xAxis, eye);
    m[13] = -dotVec3(yAxis, eye);
    m[14] = -dotVec3(zAxis, eye);
    m[15] = 1;

    return m;
  }

  /**
   * Constructs a 4x4 OpenGL ES 3.0 / WebGL 2.0 Perspective Projection Matrix.
   *
   * Mathematical & Geometric Derivation:
   * ------------------------------------
   * Maps a 3D pyramidal **viewing frustum** in Right-Handed Eye Space (where the
   * camera looks down `-Z_eye`, with visible range `z_eye in [-zFar, -zNear]`)
   * into Homogeneous Clip Space `[-w_c, +w_c]^3` such that after perspective
   * division (`xyz_ndc = xyz_c / w_c`), visible points lie in `[-1.0, +1.0]^3`:
   *
   * - Let `f = 1.0 / tan(fovYRad / 2.0)` (focal length scale factor):
   *   A smaller Field of View (`fovY`) increases `f`, magnifying the scene
   *   (telephoto lens); a larger `fovY` decreases `f`, widening the view.
   * - Dividing the X scale by `aspect = width / height` (`m[0] = f / aspect`)
   *   compensates for non-square canvas dimensions so a 3D cube never stretches
   *   horizontally when the viewport or Portal sidebar resizes.
   * - Setting row 3, column 2 (`m[11] = -1.0`) and `m[15] = 0.0` sets the
   *   clip-space homogeneous coordinate to `w_clip = -z_eye`. Because visible
   *   objects in front of the camera have `z_eye < 0`, `w_clip > 0` increases
   *   linearly with distance from the camera. When the GPU divides `(x_c, y_c, z_c)`
   *   by `w_clip = -z_eye`, distant objects shrink toward the center of the screen
   *   (**perspective foreshortening**).
   * - `m[10] = (zFar + zNear) / (zNear - zFar)` and
   *   `m[14] = (2 * zFar * zNear) / (zNear - zFar)` map:
   *     * `z_eye = -zNear` -> `z_ndc = -1.0`
   *     * `z_eye = -zFar`  -> `z_ndc = +1.0`
   *
   *        | f / aspect   0                 0                                  0 |
   *        |     0        f                 0                                  0 |
   *        |     0        0   (zFar + zNear) / (zNear - zFar)  (2*zFar*zNear)/(zNear - zFar) |
   *        |     0        0                -1                                  0 |
   *
   * @param {number} fovYRad Vertical Field of View in radians (`(0, Math.PI)`)
   * @param {number} aspect Viewport aspect ratio (`drawingBufferWidth / drawingBufferHeight > 0`)
   * @param {number} zNear Distance to near clipping plane (`zNear > 0`)
   * @param {number} zFar Distance to far clipping plane (`zFar > zNear`)
   * @param {Float32Array} [out] Optional target `Float32Array(16)`
   * @returns {Float32Array} 4x4 column-major Perspective Projection Matrix
   */
  function perspective(fovYRad, aspect, zNear, zFar, out) {
    if (!(fovYRad > 0 && fovYRad < Math.PI)) {
      throw new Error(`Invalid vertical FOV (${fovYRad} rad). Expected (0, PI).`);
    }
    if (!(aspect > 0 && Number.isFinite(aspect))) {
      throw new Error(`Invalid aspect ratio (${aspect}). Expected finite positive number.`);
    }
    if (!(zNear > 0 && zFar > zNear)) {
      throw new Error(
        `Invalid clipping planes (zNear=${zNear}, zFar=${zFar}). Expected 0 < zNear < zFar.`
      );
    }

    const m = out instanceof Float32Array && out.length === 16
      ? out
      : new Float32Array(16);

    const f = 1.0 / Math.tan(fovYRad * 0.5);
    const rangeInv = 1.0 / (zNear - zFar);

    m[0] = f / aspect;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = f;
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = (zNear + zFar) * rangeInv;
    m[11] = -1;

    m[12] = 0;
    m[13] = 0;
    m[14] = 2.0 * zNear * zFar * rangeInv;
    m[15] = 0;

    return m;
  }

  /**
   * Multiplies a 4x4 column-major matrix `m` by a 4D homogeneous column vector
   * `v = [x, y, z, w]^T`: `out = m * v`.
   *
   * Provided as an educational verification helper so students and tests can
   * trace exact numerical coordinates through `Model -> View -> Projection ->
   * Clip Space -> NDC` on the CPU and compare them with GPU shader output.
   *
   * @param {ArrayLike<number>} m 4x4 column-major matrix (16 floats)
   * @param {ArrayLike<number>} v 4-element column vector `[x, y, z, w]`
   * @returns {number[]} Transformed 4-element vector `[x', y', z', w']`
   */
  function transformVec4(m, v) {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const w = v[3] !== undefined ? v[3] : 1.0;

    return [
      m[0] * x + m[4] * y + m[8] * z + m[12] * w,
      m[1] * x + m[5] * y + m[9] * z + m[13] * w,
      m[2] * x + m[6] * y + m[10] * z + m[14] * w,
      m[3] * x + m[7] * y + m[11] * z + m[15] * w,
    ];
  }

  /**
   * Projects a 3D Object-Space point `[x, y, z]` through `Model`, `View`, and
   * `Projection` matrices and performs perspective division (`xyz / w`) to
   * return both Homogeneous Clip-Space coordinates and Normalized Device
   * Coordinates (NDC).
   *
   * @param {ArrayLike<number>} localPoint3D `[x, y, z]` in Object Space
   * @param {ArrayLike<number>} modelMatrix 4x4 Model matrix
   * @param {ArrayLike<number>} viewMatrix 4x4 View matrix
   * @param {ArrayLike<number>} projectionMatrix 4x4 Projection matrix
   * @returns {{
   *   worldSpace: number[],
   *   viewSpace: number[],
   *   clipSpace: number[],
   *   ndc: number[]
   * }}
   */
  function projectPointToNdc(
    localPoint3D,
    modelMatrix,
    viewMatrix,
    projectionMatrix
  ) {
    const localVec4 = [localPoint3D[0], localPoint3D[1], localPoint3D[2], 1.0];
    const worldVec4 = transformVec4(modelMatrix, localVec4);
    const viewVec4 = transformVec4(viewMatrix, worldVec4);
    const clipVec4 = transformVec4(projectionMatrix, viewVec4);
    const w = Math.abs(clipVec4[3]) > EPSILON ? clipVec4[3] : 1.0;

    return {
      worldSpace: [worldVec4[0], worldVec4[1], worldVec4[2], worldVec4[3]],
      viewSpace: [viewVec4[0], viewVec4[1], viewVec4[2], viewVec4[3]],
      clipSpace: [clipVec4[0], clipVec4[1], clipVec4[2], clipVec4[3]],
      ndc: [clipVec4[0] / w, clipVec4[1] / w, clipVec4[2] / w],
    };
  }

  window.Module1Math = Object.freeze({
    DEG_TO_RAD,
    RAD_TO_DEG,
    degToRad,
    radToDeg,
    subtractVec3,
    dotVec3,
    crossVec3,
    normalizeVec3,
    createIdentityMatrix,
    multiplyMatrices,
    fromTranslation,
    fromScaling,
    fromXRotation,
    fromYRotation,
    fromZRotation,
    composeModelMatrix,
    lookAt,
    perspective,
    transformVec4,
    projectPointToNdc,
  });
})();
