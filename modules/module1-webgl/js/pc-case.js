/**
 * =============================================================================
 * Module 01: WebGL Graphics — Task 3.5:
 * Procedural Study/Workspace Composite Object (`pc-case.js`)
 * =============================================================================
 *
 * Educational Research Overview:
 * ------------------------------
 * Tasks 3.1–3.4 rendered a single 3D unit cube (`[-0.5, +0.5]^3`) using one
 * Model Matrix (`u_modelMatrix`). Task 3.5 extends this foundation into a
 * recognizable study/workspace object — a **Desktop PC Tower Case** — composed
 * of 13 simple geometric parts that all reuse the **exact same GPU unit-cube
 * VAO, VBO (576 bytes), and EBO (72 bytes)**.
 *
 * Key Computer Graphics Concepts Demonstrated in Task 3.5:
 * --------------------------------------------------------
 * 1. Composite 3D Objects & Procedural Box Modeling:
 *    Complex man-made artifacts (computers, desks, monitors, architectural
 *    structures) can be decomposed into an assembly of simple primitives
 *    (cuboids/boxes). Rather than authoring and downloading an external 3D
 *    file (such as `.glb` or `.obj`), each functional part of the PC case
 *    (main chassis, front bezel, tempered-glass side panel, angled intake
 *    louvers, illuminated power button, RGB accent bar, I/O header, and
 *    elevation feet) is defined procedurally via a declarative component table.
 *
 * 2. Geometry Reuse (One VBO/EBO/VAO -> Many 3D Parts):
 *    - A naive implementation might allocate 13 separate Vertex Buffer Objects
 *      (13 × 24 vertices = 312 vertices) with hardcoded world coordinates.
 *    - Instead, we keep ONE canonical unit cube (`[-0.5, +0.5]^3`) in GPU memory.
 *    - During `drawScene()`, we bind that single Cube VAO once and issue 13
 *      sequential `gl.drawElements()` calls. Before each draw call, we upload
 *      that component's 4x4 World Model Matrix (`u_modelMatrix`) and RGB color
 *      (`u_partColor`). The GPU Vertex Shader transforms the shared unit cube
 *      into the exact size, orientation, and position of that component!
 *
 * 3. Local vs. World Transformations & Parent–Child Hierarchy:
 *    - **Component Local Matrix (`M_localPart`):**
 *        `M_localPart = T_local * Rz_local * Ry_local * Rx_local * S_local`
 *      Transforms the unit cube (`[-0.5, +0.5]^3`) into the component's size,
 *      tilt, and offset relative to the **PC Case Center (Root Origin)** `(0,0,0)`.
 *    - **Root Assembly Matrix (`M_root`):**
 *        `M_root = T_root * Rz_root * Ry_root * Rx_root * S_root`
 *      Transforms the entire assembled PC Case in **World Space** (for example,
 *      continuous delta-time Y-axis rotation driven by `requestAnimationFrame`).
 *    - **Hierarchical World Matrix Composition (`M_worldPart`):**
 *        `M_worldPart = M_root * M_localPart`
 *      (Or, when an intermediate parent sub-assembly node `M_subAssembly` such
 *      as the removable Front Panel Assembly is offset,
 *        `M_worldPart = M_root * M_subAssembly * M_localPart`).
 *
 * 4. Why Matrix Multiplication Order (`M_root * M_localPart`) Matters:
 *    Under our Column-Vector convention (`v_world = M_worldPart * v_local`),
 *    right-to-left evaluation means:
 *      `v_world = (M_root * M_localPart) * v_cube = M_root * (M_localPart * v_cube)`
 *    1) First, `M_localPart` scales the unit cube into the component's shape
 *       (e.g., the small Power Button `[0.09, 0.045, 0.03]`) and places it at
 *       its local attachment point on the front panel (`[0.14, 0.52, 0.555]`).
 *    2) Second, `M_root` rotates and translates that already-assembled point
 *       together with the rest of the PC case in World Space.
 *    If we reversed the multiplication order (`M_localPart * M_root`), the unit
 *    cube would first be rotated by the root angle, then non-uniformly squashed
 *    (shearing the geometry!), and finally shifted by a fixed world-space vector
 *    `[0.14, 0.52, 0.555]` that never orbits with the case!
 *
 * 5. Concrete Numerical Example (Power Button at +90° Root Yaw Rotation):
 *    - Consider the center of the unit cube `v_cube = [0, 0, 0, 1]^T`.
 *    - For `power_button`, `localTranslation = [0.14, 0.52, 0.555]`,
 *      `localRotationDeg = [0, 0, 0]`, `localScale = [0.09, 0.045, 0.03]`:
 *
 *                  | 0.09   0      0     0.14  |
 *      M_localPart = | 0      0.045  0     0.52  |
 *                  | 0      0      0.03  0.555 |
 *                  | 0      0      0     1.00  |
 *
 *      Applying `M_localPart * [0, 0, 0, 1]^T` gives the button's center in
 *      PC-Case Root Space: `p_case = [0.14, 0.52, 0.555, 1]^T`.
 *    - Now rotate the entire PC Case by `+90°` around the World `+Y` axis
 *      (`cos(90°) = 0`, `sin(90°) = 1`, `translation = [0, 0, 0]`):
 *
 *               |  0  0  1  0 |
 *      M_root = |  0  1  0  0 |
 *               | -1  0  0  0 |
 *               |  0  0  0  1 |
 *
 *    - Multiplying `M_worldPart = M_root * M_localPart` yields:
 *
 *                    |  0     0      0.03  0.555 |
 *      M_worldPart = |  0     0.045  0     0.520 |
 *                    | -0.09  0      0    -0.140 |
 *                    |  0     0      0     1.000 |
 *
 *      The button's world center is now `[0.555, 0.52, -0.14, 1]^T` — it has
 *      orbited cleanly with the front panel to face the `+X` axis!
 * =============================================================================
 */

(function () {
  "use strict";

  /**
   * Logical material / customization categories exposed in the UI color target
   * selector when rendering the composite PC Case.
   */
  const PC_CASE_COLOR_GROUPS = Object.freeze([
    {
      id: "all",
      label: "All Case Parts (13 Boxes)",
      defaultHex: "#384761",
    },
    {
      id: "chassis",
      label: "Main Chassis & Top Shroud",
      defaultHex: "#384761",
    },
    {
      id: "front",
      label: "Front Bezel & Lower Shroud",
      defaultHex: "#26334a",
    },
    {
      id: "side",
      label: "Tempered Glass Side Panel",
      defaultHex: "#478cd1",
    },
    {
      id: "accent",
      label: "RGB Accent Strip & Power LED",
      defaultHex: "#38c7d9",
    },
    {
      id: "details",
      label: "Intake Vents, I/O & Feet",
      defaultHex: "#5c94ff",
    },
  ]);

  /**
   * Declarative definition of the 13 cuboid components that form the study/workspace
   * Desktop PC Tower Case.
   *
   * Z-FIGHTING (DEPTH CONFLICT) PREVENTION POLICY:
   * Every component's bounding box `[tx ± sx/2, ty ± sy/2, tz ± sz/2]` is
   * engineered so that adjacent parts either step cleanly outward/inward or
   * abut without sharing overlapping coplanar visible surfaces.
   */
  const PC_CASE_COMPONENT_DEFINITIONS = Object.freeze([
    {
      id: "chassis_core",
      name: "Main Tower Chassis Body",
      group: "chassis",
      subAssembly: "chassis_body",
      localTranslation: [0.0, 0.04, -0.04],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.54, 1.16, 1.0],
      color: [0.22, 0.28, 0.38], // #384761 Anodized Slate Steel
    },
    {
      id: "top_shroud",
      name: "Top Radiator Ventilation Shroud",
      group: "chassis",
      subAssembly: "chassis_body",
      localTranslation: [0.0, 0.64, -0.04],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.48, 0.04, 0.88],
      color: [0.16, 0.21, 0.3], // #29364d Deep Graphite Top Plate
    },
    {
      id: "front_bezel",
      name: "Front Fascia Panel Bezel",
      group: "front",
      subAssembly: "front_panel",
      localTranslation: [0.0, 0.04, 0.5],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.56, 1.18, 0.08],
      color: [0.15, 0.2, 0.29], // #26334a Matte Obsidian Front Fascia
    },
    {
      id: "front_accent_strip",
      name: "Front Vertical RGB Accent Bar",
      group: "accent",
      subAssembly: "front_panel",
      localTranslation: [-0.21, 0.04, 0.5525],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.035, 1.04, 0.025],
      color: [0.22, 0.78, 0.85], // #38c7d9 Luminous Cyan Studio Accent
    },
    {
      id: "power_button",
      name: "Illuminated Power Button & LED",
      group: "accent",
      subAssembly: "front_panel",
      localTranslation: [0.14, 0.52, 0.555],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.09, 0.045, 0.03],
      color: [0.2, 0.88, 0.62], // #33e09e Emerald Power Indicator
    },
    {
      id: "front_io_bay",
      name: "Front USB / Audio I/O Header",
      group: "details",
      subAssembly: "front_panel",
      localTranslation: [0.04, 0.4, 0.5525],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.28, 0.05, 0.025],
      color: [0.36, 0.58, 1.0], // #5c94ff Signal Blue I/O Trim
    },
    {
      id: "front_vent_upper",
      name: "Upper Angled Intake Vent Louver",
      group: "details",
      subAssembly: "front_panel",
      localTranslation: [0.04, 0.14, 0.555],
      localRotationDeg: [12.0, 0.0, 0.0], // Local pitch rotation for louver blade
      localScale: [0.32, 0.07, 0.03],
      color: [0.09, 0.13, 0.2], // #172133 Dark Intake Grille
    },
    {
      id: "front_vent_middle",
      name: "Middle Angled Intake Vent Louver",
      group: "details",
      subAssembly: "front_panel",
      localTranslation: [0.04, -0.04, 0.555],
      localRotationDeg: [12.0, 0.0, 0.0],
      localScale: [0.32, 0.07, 0.03],
      color: [0.09, 0.13, 0.2],
    },
    {
      id: "front_vent_lower",
      name: "Lower Angled Intake Vent Louver",
      group: "details",
      subAssembly: "front_panel",
      localTranslation: [0.04, -0.22, 0.555],
      localRotationDeg: [12.0, 0.0, 0.0],
      localScale: [0.32, 0.07, 0.03],
      color: [0.09, 0.13, 0.2],
    },
    {
      id: "side_glass_panel",
      name: "Tempered Glass Side Window (+X)",
      group: "side",
      subAssembly: "side_panel",
      localTranslation: [0.285, 0.08, -0.04],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.03, 0.88, 0.78],
      color: [0.28, 0.55, 0.82], // #478cd1 Tinted Tempered Glass Blue
    },
    {
      id: "psu_lower_chamber",
      name: "Lower PSU Shroud Side Trim (+X)",
      group: "front",
      subAssembly: "side_panel",
      localTranslation: [0.285, -0.45, -0.04],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.03, 0.16, 0.78],
      color: [0.15, 0.2, 0.29], // #26334a Lower Shroud Trim
    },
    {
      id: "foot_front",
      name: "Front Elevation Pedestal Skid",
      group: "details",
      subAssembly: "base_feet",
      localTranslation: [0.0, -0.58, 0.32],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.48, 0.08, 0.16],
      color: [0.12, 0.16, 0.24], // #1f293d Rubberized Desk Skid
    },
    {
      id: "foot_rear",
      name: "Rear Elevation Pedestal Skid",
      group: "details",
      subAssembly: "base_feet",
      localTranslation: [0.0, -0.58, -0.38],
      localRotationDeg: [0.0, 0.0, 0.0],
      localScale: [0.48, 0.08, 0.16],
      color: [0.12, 0.16, 0.24],
    },
  ]);

  /**
   * Maps legacy numeric cube face indices (`0..5`) to PC Case component groups
   * so existing scripts or experiments passing numeric targets remain predictable.
   */
  const LEGACY_INDEX_TO_GROUP = Object.freeze({
    0: "front",
    1: "chassis",
    2: "accent",
    3: "details",
    4: "side",
    5: "chassis",
  });

  // Preallocated scratch matrices for zero-garbage per-frame matrix composition
  const scratchMatT = new Float32Array(16);
  const scratchMatRx = new Float32Array(16);
  const scratchMatRy = new Float32Array(16);
  const scratchMatRz = new Float32Array(16);
  const scratchMatS = new Float32Array(16);
  const scratchTemp1 = new Float32Array(16);
  const scratchTemp2 = new Float32Array(16);
  const scratchTemp3 = new Float32Array(16);
  const scratchParentWorld = new Float32Array(16);

  /**
   * Composes a 4x4 column-major transformation matrix `M = T * Rz * Ry * Rx * S`
   * into `out` using preallocated scratch buffers so zero heap allocations occur
   * inside the animation loop.
   *
   * @param {object} Math3D Reference to `window.Module1Math`
   * @param {[number, number, number]} translation `[tx, ty, tz]`
   * @param {[number, number, number]} rotationDeg `[rx, ry, rz]` in degrees
   * @param {[number, number, number]} scale `[sx, sy, sz]`
   * @param {Float32Array} out Destination 16-element `Float32Array`
   * @returns {Float32Array} `out`
   */
  function composeMatrixZeroAlloc(Math3D, translation, rotationDeg, scale, out) {
    Math3D.fromTranslation(
      translation[0],
      translation[1],
      translation[2],
      scratchMatT
    );
    Math3D.fromXRotation(Math3D.degToRad(rotationDeg[0]), scratchMatRx);
    Math3D.fromYRotation(Math3D.degToRad(rotationDeg[1]), scratchMatRy);
    Math3D.fromZRotation(Math3D.degToRad(rotationDeg[2]), scratchMatRz);
    Math3D.fromScaling(scale[0], scale[1], scale[2], scratchMatS);

    Math3D.multiplyMatrices(scratchMatRz, scratchMatRy, scratchTemp1);
    Math3D.multiplyMatrices(scratchTemp1, scratchMatRx, scratchTemp2);
    Math3D.multiplyMatrices(scratchTemp2, scratchMatS, scratchTemp3);
    return Math3D.multiplyMatrices(scratchMatT, scratchTemp3, out);
  }

  /**
   * Creates a live, mutable instance of the procedural Desktop PC Case scene
   * with preallocated `localMatrix` and `worldMatrix` `Float32Array(16)` buffers
   * for each of the 13 components and intermediate sub-assembly nodes.
   *
   * @param {object} Math3D Reference to `window.Module1Math`
   */
  function createPCCaseScene(Math3D) {
    const subAssemblies = {
      chassis_body: {
        id: "chassis_body",
        label: "Main Chassis & Top Shroud Sub-Assembly",
        translation: [0.0, 0.0, 0.0],
        rotationDeg: [0.0, 0.0, 0.0],
        scale: [1.0, 1.0, 1.0],
        matrix: Math3D ? Math3D.createIdentityMatrix() : new Float32Array(16),
      },
      front_panel: {
        id: "front_panel",
        label: "Front Fascia, RGB Strip, Button, I/O & Louvers Sub-Assembly",
        translation: [0.0, 0.0, 0.0],
        rotationDeg: [0.0, 0.0, 0.0],
        scale: [1.0, 1.0, 1.0],
        matrix: Math3D ? Math3D.createIdentityMatrix() : new Float32Array(16),
      },
      side_panel: {
        id: "side_panel",
        label: "Tempered Glass & PSU Chamber Side Sub-Assembly",
        translation: [0.0, 0.0, 0.0],
        rotationDeg: [0.0, 0.0, 0.0],
        scale: [1.0, 1.0, 1.0],
        matrix: Math3D ? Math3D.createIdentityMatrix() : new Float32Array(16),
      },
      base_feet: {
        id: "base_feet",
        label: "Front & Rear Elevation Skids Sub-Assembly",
        translation: [0.0, 0.0, 0.0],
        rotationDeg: [0.0, 0.0, 0.0],
        scale: [1.0, 1.0, 1.0],
        matrix: Math3D ? Math3D.createIdentityMatrix() : new Float32Array(16),
      },
    };

    const partMap = Object.create(null);
    const parts = PC_CASE_COMPONENT_DEFINITIONS.map((def) => {
      const part = {
        id: def.id,
        name: def.name,
        label: def.name,
        role: def.name,
        group: def.group,
        subAssembly: def.subAssembly,
        visible: true,
        localTranslation: [
          def.localTranslation[0],
          def.localTranslation[1],
          def.localTranslation[2],
        ],
        localRotationDeg: [
          def.localRotationDeg[0],
          def.localRotationDeg[1],
          def.localRotationDeg[2],
        ],
        localScale: [def.localScale[0], def.localScale[1], def.localScale[2]],
        color: new Float32Array([def.color[0], def.color[1], def.color[2]]),
        defaultColor: [def.color[0], def.color[1], def.color[2]],
        localMatrix: Math3D
          ? Math3D.createIdentityMatrix()
          : new Float32Array(16),
        worldMatrix: Math3D
          ? Math3D.createIdentityMatrix()
          : new Float32Array(16),
      };
      partMap[part.id] = part;
      return part;
    });

    const subAssemblyList = [
      subAssemblies.chassis_body,
      subAssemblies.front_panel,
      subAssemblies.side_panel,
      subAssemblies.base_feet,
    ];

    return {
      parts,
      partMap,
      subAssemblies,
      subAssemblyList,
    };
  }

  /**
   * Computes `localMatrix` and `worldMatrix` for every component in the PC Case:
   *
   *   1. `M_localPart = T_local * Rz_local * Ry_local * Rx_local * S_local`
   *   2. If the component's sub-assembly (`front_panel`, `side_panel`, etc.) has
   *      an active transform `M_subAssembly`:
   *        `M_worldPart = (M_root * M_subAssembly) * M_localPart`
   *      When `M_subAssembly` is the Identity matrix `I_4` (the default), this
   *      computes the fundamental parent–child equation:
   *        `M_worldPart = M_root * M_localPart`
   *
   * @param {{ parts: Array<any>, subAssemblies: Record<string, any>, subAssemblyList?: Array<any> }} scene
   * @param {Float32Array} rootModelMatrix 4x4 World Model Matrix of the PC Case root
   * @param {object} Math3D Reference to `window.Module1Math`
   */
  function updatePCCaseMatrices(scene, rootModelMatrix, Math3D) {
    if (!scene || !Math3D || !rootModelMatrix) {
      return;
    }

    // 1. Update intermediate sub-assembly matrices (Identity by default).
    // Iterate over preallocated `scene.subAssemblyList` rather than calling
    // `Object.keys()` / `Object.values()` each frame, ensuring zero temporary
    // JavaScript allocations inside the animation loop.
    const subList = scene.subAssemblyList || Object.values(scene.subAssemblies);
    for (let i = 0; i < subList.length; i += 1) {
      const sub = subList[i];
      composeMatrixZeroAlloc(
        Math3D,
        sub.translation,
        sub.rotationDeg,
        sub.scale,
        sub.matrix
      );
    }

    // 2. Compose each component's local and world matrices
    for (let i = 0; i < scene.parts.length; i += 1) {
      const part = scene.parts[i];
      composeMatrixZeroAlloc(
        Math3D,
        part.localTranslation,
        part.localRotationDeg,
        part.localScale,
        part.localMatrix
      );

      const sub = scene.subAssemblies[part.subAssembly];
      if (sub) {
        Math3D.multiplyMatrices(rootModelMatrix, sub.matrix, scratchParentWorld);
        Math3D.multiplyMatrices(
          scratchParentWorld,
          part.localMatrix,
          part.worldMatrix
        );
      } else {
        Math3D.multiplyMatrices(
          rootModelMatrix,
          part.localMatrix,
          part.worldMatrix
        );
      }
    }
  }

  /**
   * Resets all 13 PC Case components and intermediate sub-assemblies to their
   * canonical default local transforms, visibility, and material colors.
   *
   * @param {{ parts: Array<any>, subAssemblies: Record<string, any>, subAssemblyList?: Array<any> }} scene
   * @param {Float32Array} rootModelMatrix
   * @param {object} Math3D
   */
  function resetPCCaseScene(scene, rootModelMatrix, Math3D) {
    if (!scene) {
      return;
    }

    const subList = scene.subAssemblyList || Object.values(scene.subAssemblies);
    for (let i = 0; i < subList.length; i += 1) {
      const sub = subList[i];
      sub.translation[0] = 0.0;
      sub.translation[1] = 0.0;
      sub.translation[2] = 0.0;
      sub.rotationDeg[0] = 0.0;
      sub.rotationDeg[1] = 0.0;
      sub.rotationDeg[2] = 0.0;
      sub.scale[0] = 1.0;
      sub.scale[1] = 1.0;
      sub.scale[2] = 1.0;
    }

    for (let i = 0; i < scene.parts.length; i += 1) {
      const part = scene.parts[i];
      const def = PC_CASE_COMPONENT_DEFINITIONS[i];
      part.visible = true;
      part.localTranslation[0] = def.localTranslation[0];
      part.localTranslation[1] = def.localTranslation[1];
      part.localTranslation[2] = def.localTranslation[2];
      part.localRotationDeg[0] = def.localRotationDeg[0];
      part.localRotationDeg[1] = def.localRotationDeg[1];
      part.localRotationDeg[2] = def.localRotationDeg[2];
      part.localScale[0] = def.localScale[0];
      part.localScale[1] = def.localScale[1];
      part.localScale[2] = def.localScale[2];
      part.color[0] = def.color[0];
      part.color[1] = def.color[1];
      part.color[2] = def.color[2];
    }

    if (rootModelMatrix && Math3D) {
      updatePCCaseMatrices(scene, rootModelMatrix, Math3D);
    }
  }

  /**
   * Restores only the default component colors of the PC Case without altering
   * any custom transforms or animation state.
   *
   * @param {{ parts: Array<any> }} scene
   */
  function restoreDefaultPCCaseColors(scene) {
    if (!scene) {
      return;
    }
    for (let i = 0; i < scene.parts.length; i += 1) {
      const part = scene.parts[i];
      const def = PC_CASE_COMPONENT_DEFINITIONS[i];
      part.color[0] = def.color[0];
      part.color[1] = def.color[1];
      part.color[2] = def.color[2];
    }
  }

  /**
   * Applies a normalized `[r, g, b]` color to the specified PC Case target:
   * - `"all"`: colors all 13 parts
   * - A group name (`"chassis"`, `"front"`, `"side"`, `"accent"`, `"details"`):
   *   colors all parts belonging to that group
   * - A legacy numeric string/index (`"0"`..`"5"`): maps via `LEGACY_INDEX_TO_GROUP`
   * - A specific component ID (e.g., `"power_button"`, `"side_glass_panel"`):
   *   colors that individual part
   *
   * @param {{ parts: Array<any> }} scene
   * @param {string | number} target
   * @param {[number, number, number]} rgb Normalized `[r, g, b]` in `[0.0, 1.0]`
   * @returns {number} Count of components whose color was updated
   */
  function applyPCCaseColor(scene, target, rgb) {
    if (!scene || !Array.isArray(rgb) || rgb.length < 3) {
      return 0;
    }
    const clamp01 = (v) => Math.min(1.0, Math.max(0.0, Number(v) || 0.0));
    const r = clamp01(rgb[0]);
    const g = clamp01(rgb[1]);
    const b = clamp01(rgb[2]);

    const rawTarget = String(target === undefined ? "all" : target).trim();
    const mappedGroup =
      Object.prototype.hasOwnProperty.call(LEGACY_INDEX_TO_GROUP, rawTarget)
        ? LEGACY_INDEX_TO_GROUP[rawTarget]
        : rawTarget;

    let updatedCount = 0;
    for (let i = 0; i < scene.parts.length; i += 1) {
      const part = scene.parts[i];
      if (
        mappedGroup === "all" ||
        mappedGroup === "-1" ||
        part.group === mappedGroup ||
        part.id === rawTarget
      ) {
        part.color[0] = r;
        part.color[1] = g;
        part.color[2] = b;
        updatedCount += 1;
      }
    }
    return updatedCount;
  }

  /**
   * Returns the representative normalized `[r, g, b]` color for a given group or
   * component ID so the DOM `<input type="color">` preview stays synchronized.
   *
   * @param {{ parts: Array<any> }} scene
   * @param {string} target
   * @returns {[number, number, number]}
   */
  function getRepresentativeColor(scene, target) {
    if (!scene || !scene.parts || scene.parts.length === 0) {
      return [0.22, 0.28, 0.38];
    }
    const rawTarget = String(target || "all").trim();
    const mapped =
      Object.prototype.hasOwnProperty.call(LEGACY_INDEX_TO_GROUP, rawTarget)
        ? LEGACY_INDEX_TO_GROUP[rawTarget]
        : rawTarget;

    if (mapped === "all") {
      const first = scene.parts[0].color;
      return [first[0], first[1], first[2]];
    }

    for (let i = 0; i < scene.parts.length; i += 1) {
      const p = scene.parts[i];
      if (p.id === rawTarget || p.group === mapped) {
        return [p.color[0], p.color[1], p.color[2]];
      }
    }
    const fallback = scene.parts[0].color;
    return [fallback[0], fallback[1], fallback[2]];
  }

  window.Module1PCCase = Object.freeze({
    PC_CASE_COLOR_GROUPS,
    PC_CASE_COMPONENT_DEFINITIONS,
    LEGACY_INDEX_TO_GROUP,
    createPCCaseScene,
    updatePCCaseMatrices,
    resetPCCaseScene,
    restoreDefaultPCCaseColors,
    applyPCCaseColor,
    getRepresentativeColor,
  });
})();
