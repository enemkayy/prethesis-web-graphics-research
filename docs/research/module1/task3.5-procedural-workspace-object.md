# Phase 3 – Task 3.5 Research Note: Procedural Study/Workspace Object (Desktop PC Case), Reusable Geometry & Hierarchical Transformations

**Module:** Module 1 – Native WebGL 2.0 Graphics (`modules/module1-webgl/`)  
**Research Phase:** Phase 3 – Task 3.5  
**Scope:** Procedural Box Modeling of a 13-Part Desktop PC Tower Case, Geometry Reuse (`1` Cube VAO/VBO/EBO -> `13` Draw Calls), Local vs. World Transformations (`M_worldPart = M_root × M_localPart`), Multi-Material Uniform Coloring (`u_partColor`), and Per-Face Deterministic Shading (`gl_VertexID / 4`).

---

## 1. Research Objectives

Tasks 3.1 through 3.4 established the foundational WebGL 2.0 rendering pipeline for a **single** 3D primitive:

- **Task 3.1:** WebGL 2.0 context creation, color/depth framebuffer clearing, responsive DPR resize handling, and context loss/restoration.
- **Task 3.2:** Programmable GLSL ES 3.00 Vertex and Fragment Shaders, interleaved Vertex Buffer Object (`VBO`), and Vertex Array Object (`VAO`).
- **Task 3.3:** Indexed 3D Unit Cube (`24` vertices = `576` bytes, `36` indices = `72` bytes), `4×4` column-major `Model`, `View`, and `Projection` (`MVP`) matrices, and hardware depth testing (`gl.DEPTH_TEST`).
- **Task 3.4:** Frame-rate-independent `deltaTime` rotation and lightweight DOM interactive controls (`Auto-Rotate`, `Speed`, `Color`, `Pause/Resume`, `Reset Defaults`).

**Task 3.5** investigates how a real-time 3D graphics engine constructs a recognizable **composite study/workspace object** — specifically a **Desktop PC Tower Case** — without importing external `.glb`/`.obj` meshes or duplicating GPU vertex buffers:

1. **Procedural Composite Box Modeling:** Decompose a Desktop PC Tower Case into **13 functional cuboid components** (`chassis_core`, `top_shroud`, `front_bezel`, `front_accent_strip`, `power_button`, `front_io_bay`, `front_vent_upper`, `front_vent_middle`, `front_vent_lower`, `side_glass_panel`, `psu_lower_chamber`, `foot_front`, `foot_rear`) organized into **5 material groups** (`chassis`, `front`, `side`, `accent`, `details`) and **4 logical sub-assemblies** (`chassis_body`, `front_panel`, `side_panel`, `base_feet`).
2. **GPU Geometry Reuse (One VAO/VBO/EBO, Multiple Draw Calls):** Prove that all 13 3D cuboids can be rendered from the **exact same GPU unit-cube buffers** (`VBO = 576 bytes`, `EBO = 72 bytes`) by binding the Cube `VAO` once per frame and issuing 13 `gl.drawElements()` calls with per-part `u_modelMatrix` and `u_partColor` uniforms.
3. **Hierarchical Parent–Child Transformations ($\mathbf{M}_{\text{worldPart}} = \mathbf{M}_{\text{root}} \times \mathbf{M}_{\text{localPart}}$):** Formulate and verify the two-level (and optional three-level sub-assembly) matrix hierarchy so that rotating, translating, or scaling the root PC Case transforms all 13 child parts as one rigid assembly.
4. **Depth-Conflict (Z-Fighting) Prevention & Per-Face Visual Readability:** Engineer non-overlapping component bounding planes to eliminate depth-buffer Z-fighting, and derive deterministic per-face shade factors (`gl_VertexID / 4`) in the Vertex Shader so adjacent faces of uniform-colored boxes remain crisply distinguishable without lighting shaders.

---

## 2. Composite Object Breakdown: The 13-Part Desktop PC Case

Every component starts as the canonical unit cube $\mathcal{C} = [-0.5, +0.5]^3$ (width $= 1$, height $= 1$, depth $= 1$, centered at the origin) defined in [`geometry.js`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/geometry.js). In [`pc-case.js`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/pc-case.js#L146-L277), `PC_CASE_COMPONENT_DEFINITIONS` defines the 13 components in **PC-Case Root Space** (where $+X$ is right/glass-window side, $+Y$ is top, and $+Z$ is the front fascia):

| # | Component ID (`id`) | Group (`group`) | Sub-Assembly (`subAssembly`) | Local Translation $[t_x, t_y, t_z]$ | Local Rotation $[r_x, r_y, r_z]$ | Local Scale $[s_x, s_y, s_z]$ | Default RGB (`#Hex`) | Architectural Role & Z-Fighting Clearance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `chassis_core` | `chassis` | `chassis_body` | $[0.00, 0.04, -0.04]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.54, 1.16, 1.00]$ | `[0.22, 0.28, 0.38]` (`#384761`) | Main steel tower body ($X \in [-0.27, +0.27]$, $Y \in [-0.54, +0.62]$, $Z \in [-0.54, +0.46]$). |
| 2 | `top_shroud` | `chassis` | `chassis_body` | $[0.00, 0.64, -0.04]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.48, 0.04, 0.88]$ | `[0.16, 0.21, 0.30]` (`#29364d`) | Stepped top radiator vent plate ($Y \in [+0.62, +0.66]$, inset in $X$ and $Z$). |
| 3 | `front_bezel` | `front` | `front_panel` | $[0.00, 0.04, 0.50]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.56, 1.18, 0.08]$ | `[0.15, 0.20, 0.29]` (`#26334a`) | Front fascia panel ($Z \in [+0.46, +0.54]$, slightly wider/taller than `chassis_core`). |
| 4 | `front_accent_strip` | `accent` | `front_panel` | $[-0.21, 0.04, 0.5525]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.035, 1.04, 0.025]$ | `[0.22, 0.78, 0.85]` (`#38c7d9`) | Vertical cyan RGB light bar protruding cleanly ahead of `front_bezel` ($Z \in [+0.54, +0.565]$). |
| 5 | `power_button` | `accent` | `front_panel` | $[0.14, 0.52, 0.555]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.09, 0.045, 0.03]$ | `[0.20, 0.88, 0.62]` (`#33e09e`) | Upper-right emerald LED power button ($Z \in [+0.54, +0.57]$). |
| 6 | `front_io_bay` | `details` | `front_panel` | $[0.04, 0.40, 0.5525]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.28, 0.05, 0.025]$ | `[0.36, 0.58, 1.00]` (`#5c94ff`) | USB/Audio front I/O header bar below the power button ($Z \in [+0.54, +0.565]$). |
| 7 | `front_vent_upper` | `details` | `front_panel` | $[0.04, 0.14, 0.555]$ | $[12^\circ, 0^\circ, 0^\circ]$ | $[0.32, 0.07, 0.03]$ | `[0.09, 0.13, 0.20]` (`#172133`) | Upper intake louver blade tilted $+12^\circ$ around local $X$. |
| 8 | `front_vent_middle` | `details` | `front_panel` | $[0.04, -0.04, 0.555]$ | $[12^\circ, 0^\circ, 0^\circ]$ | $[0.32, 0.07, 0.03]$ | `[0.09, 0.13, 0.20]` (`#172133`) | Middle intake louver blade tilted $+12^\circ$ around local $X$. |
| 9 | `front_vent_lower` | `details` | `front_panel` | $[0.04, -0.22, 0.555]$ | $[12^\circ, 0^\circ, 0^\circ]$ | $[0.32, 0.07, 0.03]$ | `[0.09, 0.13, 0.20]` (`#172133`) | Lower intake louver blade tilted $+12^\circ$ around local $X$. |
| 10 | `side_glass_panel` | `side` | `side_panel` | $[0.285, 0.08, -0.04]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.03, 0.88, 0.78]$ | `[0.28, 0.55, 0.82]` (`#478cd1`) | Tempered glass window mounted flush on the $+X = +0.27$ right chassis wall ($X \in [+0.27, +0.30]$). |
| 11 | `psu_lower_chamber` | `front` | `side_panel` | $[0.285, -0.45, -0.04]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.03, 0.16, 0.78]$ | `[0.15, 0.20, 0.29]` (`#26334a`) | Lower PSU shroud trim below the glass panel ($Y \in [-0.53, -0.37]$, leaving a $0.01$ gap below the glass at $Y = -0.36$). |
| 12 | `foot_front` | `details` | `base_feet` | $[0.00, -0.58, 0.32]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.48, 0.08, 0.16]$ | `[0.12, 0.16, 0.24]` (`#1f293d`) | Front pedestal skid elevating the chassis ($Y \in [-0.62, -0.54]$). |
| 13 | `foot_rear` | `details` | `base_feet` | $[0.00, -0.58, -0.38]$ | $[0^\circ, 0^\circ, 0^\circ]$ | $[0.48, 0.08, 0.16]$ | `[0.12, 0.16, 0.24]` (`#1f293d`) | Rear pedestal skid elevating the chassis ($Y \in [-0.62, -0.54]$). |

---

## 3. Geometry Reuse Architecture: One GPU Cube Buffer -> 13 Draw Calls

### 3.1. Geometry and Draw-Call Terminology

To understand GPU work distribution in Task 3.5, distinguish the exact geometric and API terms:

- **13 Draw Calls per Frame:** During `drawScene()`, the CPU issues 13 separate `gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0)` commands.
- **36 Indices per Cube:** The single unit-cube EBO contains 36 index values (`Uint16Array(36)` = 72 bytes).
- **12 Triangles per Cube:** Since each triangle requires 3 vertex indices, each cube is composed of $36 / 3 = 12$ triangles (2 triangles per face $\times$ 6 faces).
- **156 Triangles Rendered per Frame:** Across all 13 component boxes, the pipeline rasterizes $13 \times 12 = 156$ triangles per frame.
- **468 Submitted Index References per Frame:** Across 13 draw calls of 36 indices each, the CPU submits $13 \times 36 = 468$ index references to the WebGL driver.
- **Vertex Shader Invocations and Vertex Cache:** Submitting 468 index references does **not** imply that the GPU executes the Vertex Shader 468 times. Modern GPUs incorporate a **Post-Transform Vertex Cache** (Post-T&L Cache). When `gl.drawElements()` encounters an index that references a vertex recently shaded within the current draw call, the GPU reuses the cached shaded output instead of re-executing the vertex shader. In our unit cube, the 4 vertices of each face are shared across 2 triangles (6 index references), yielding intra-mesh vertex reuse. Across 13 draw calls, actual Vertex Shader invocations typically range between $13 \times 24 = 312$ (with ideal cache hit rate) and 468 (in the hypothetical absence of caching).

### 3.2. Memory Comparison: Naive Buffer Duplication vs. Uniform-Driven Geometry Reuse

| Metric | Naive Multi-Mesh Approach (13 Separate VBOs/EBOs) | Task 3.5 Geometry Reuse Architecture (1 Shared Cube VAO) |
| :--- | :--- | :--- |
| **GPU Vertex Buffer (`VBO`) Allocation** | $13 \times 24 = 312$ vertices ($7,488$ bytes) | **$1 \times 24 = 24$ vertices ($576$ bytes)** |
| **GPU Index Buffer (`EBO`) Allocation** | $13 \times 36 = 468$ indices ($936$ bytes) | **$1 \times 36 = 36$ indices ($72$ bytes)** |
| **VAO Bindings per Frame (`gl.bindVertexArray`)** | $13$ binds + $13$ unbinds | **$1$ bind + $1$ unbind** |
| **Draw Calls per Frame (`gl.drawElements`)** | $13$ calls | **$13$ calls** (each transforming the same 36 indices via `u_modelMatrix`) |
| **Switching `"pccase"` <-> `"cube"`** | Reallocates GPU buffers | **Zero GPU allocations** (`geometryAllocCount` stays at `1`) |
| **Per-Frame JavaScript Heap Allocation** | Variable | **Zero allocations** (reusing preallocated `Float32Array(16)` buffers and preallocated `subAssemblyList`) |

### 3.3. Per-Frame Multi-Part Draw Loop in `drawScene()`

In [`main.js`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/main.js#L1023-L1107), `drawScene()` executes the following sequence when `state.meshMode === "pccase"`:

1. Clear the color and depth buffers once (`gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)`).
2. Bind the compiled shader program once (`gl.useProgram(state.program)`).
3. Upload frame-invariant uniforms once:
   - `u_viewMatrix` (`state.viewMatrix`)
   - `u_projectionMatrix` (`state.projectionMatrix`)
   - `u_usePartColor = 1.0`
   - `u_faceShadingStrength = state.faceShadingStrength` (`1.0` by default)
4. Bind the single unit-cube VAO once (`gl.bindVertexArray(state.geometry.vao)`).
5. Loop over `state.pcCaseScene.parts`:
   - Skip any part with `part.visible === false`.
   - Upload `part.worldMatrix` to `u_modelMatrix` (`gl.uniformMatrix4fv`).
   - Upload `part.color` to `u_partColor` (`gl.uniform3fv`).
   - Issue `gl.drawElements(mode, 36, gl.UNSIGNED_SHORT, 0)`.
6. Unbind the VAO (`gl.bindVertexArray(null)`).

---

## 4. Mathematical Formulation of Hierarchical Transformations

### 4.1. Component Local Matrix ($\mathbf{M}_{\text{localPart}}$)

Each component $i \in \{1, \dots, 13\}$ specifies its local translation $\mathbf{t}_i = (t_x, t_y, t_z)$, local Euler rotation $\mathbf{r}_i = (r_x, r_y, r_z)$, and local box dimensions (scale) $\mathbf{s}_i = (s_x, s_y, s_z)$ relative to the **PC Case Root Origin** $(0, 0, 0)$:

$$\mathbf{M}_{\text{localPart}, i} = \mathbf{T}(\mathbf{t}_i) \cdot \mathbf{R}_z(r_{z,i}) \cdot \mathbf{R}_y(r_{y,i}) \cdot \mathbf{R}_x(r_{x,i}) \cdot \mathbf{S}(\mathbf{s}_i)$$

Because the unit cube spans $[-0.5, +0.5]^3$, applying $\mathbf{S}(s_x, s_y, s_z)$ first scales the unit cube into a rectangular box of exact width $s_x$, height $s_y$, and depth $s_z$. Next, $\mathbf{R}_z \mathbf{R}_y \mathbf{R}_x$ tilts the box around its own center (used by the $+12^\circ$ angled intake louvers `front_vent_*`), and finally $\mathbf{T}(t_x, t_y, t_z)$ places the box at its architectural offset inside the PC Case.

### 4.2. Root Assembly Matrix ($\mathbf{M}_{\text{root}}$) and World Composition ($\mathbf{M}_{\text{worldPart}}$)

The entire PC Case has a root transformation (`state.modelParams` and `state.modelMatrix`):

$$\mathbf{M}_{\text{root}} = \mathbf{T}_{\text{root}} \cdot \mathbf{R}_{z,\text{root}} \cdot \mathbf{R}_{y,\text{root}}(t) \cdot \mathbf{R}_{x,\text{root}} \cdot \mathbf{S}_{\text{root}}$$

where $\mathbf{R}_{y,\text{root}}(t)$ is updated every animation frame by `deltaTime`. Each component's **World Model Matrix** uploaded to `u_modelMatrix` is:

$$\mathbf{M}_{\text{worldPart}, i} = \mathbf{M}_{\text{root}} \cdot \mathbf{M}_{\text{localPart}, i}$$

When an optional intermediate **Sub-Assembly Matrix** $\mathbf{M}_{\text{subAssembly}}$ (such as `front_panel` or `side_panel`, which defaults to $\mathbf{I}_4$) is transformed in DevTools experiments, the hierarchy extends to three levels:

$$\mathbf{M}_{\text{worldPart}, i} = \mathbf{M}_{\text{root}} \cdot \mathbf{M}_{\text{subAssembly}} \cdot \mathbf{M}_{\text{localPart}, i}$$

### 4.3. Why Matrix Multiplication Order ($\mathbf{M}_{\text{root}} \cdot \mathbf{M}_{\text{localPart}}$) Is Non-Commutative

In OpenGL / WebGL / GLSL column-vector convention, a vertex $\mathbf{v}_{\text{cube}} = [x, y, z, 1]^T \in [-0.5, +0.5]^3$ is transformed from right to left:

$$\mathbf{v}_{\text{world}} = \left(\mathbf{M}_{\text{root}} \cdot \mathbf{M}_{\text{localPart}}\right) \mathbf{v}_{\text{cube}} = \mathbf{M}_{\text{root}} \left(\mathbf{M}_{\text{localPart}} \mathbf{v}_{\text{cube}}\right)$$

1. $\mathbf{p}_{\text{case}} = \mathbf{M}_{\text{localPart}} \mathbf{v}_{\text{cube}}$ shapes the unit cube into the component and places it at its attachment point on the PC Case.
2. $\mathbf{v}_{\text{world}} = \mathbf{M}_{\text{root}} \mathbf{p}_{\text{case}}$ rotates and translates that assembled point with the whole PC Case.

If the order were reversed ($\mathbf{M}_{\text{localPart}} \cdot \mathbf{M}_{\text{root}}$), the unit cube would first be rotated by the root angle $\theta_y$, then squashed non-uniformly along the fixed axes by $\mathbf{S}(s_x, s_y, s_z)$ (causing severe **geometric shearing** whenever $\theta_y \neq 0^\circ$), and finally translated by a fixed world offset $\mathbf{t}_i$ that refuses to orbit around the PC Case center.

### 4.4. Step-by-Step Numerical Verification (`power_button` under $+90^\circ$ Root Yaw)

Consider the center of the unit cube $\mathbf{v}_{\text{cube}} = [0, 0, 0, 1]^T$ for the `power_button` component ($\mathbf{t} = [0.14, 0.52, 0.555]$, $\mathbf{r} = [0^\circ, 0^\circ, 0^\circ]$, $\mathbf{s} = [0.09, 0.045, 0.03]$):

$$\mathbf{M}_{\text{localPart}} = \begin{bmatrix} 0.09 & 0 & 0 & 0.14 \\ 0 & 0.045 & 0 & 0.52 \\ 0 & 0 & 0.03 & 0.555 \\ 0 & 0 & 0 & 1 \end{bmatrix}, \quad \mathbf{p}_{\text{case}} = \mathbf{M}_{\text{localPart}} \begin{bmatrix} 0 \\ 0 \\ 0 \\ 1 \end{bmatrix} = \begin{bmatrix} 0.14 \\ 0.52 \\ 0.555 \\ 1 \end{bmatrix}$$

Now suppose the root PC Case is rotated by $+90^\circ$ around the World $+Y$ axis ($\cos 90^\circ = 0, \sin 90^\circ = 1$) with zero root translation and unit root scale:

$$\mathbf{M}_{\text{root}} = \begin{bmatrix} 0 & 0 & 1 & 0 \\ 0 & 1 & 0 & 0 \\ -1 & 0 & 0 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

Multiplying $\mathbf{M}_{\text{worldPart}} = \mathbf{M}_{\text{root}} \cdot \mathbf{M}_{\text{localPart}}$ yields:

$$\mathbf{M}_{\text{worldPart}} = \begin{bmatrix} 0 & 0 & 0.03 & 0.555 \\ 0 & 0.045 & 0 & 0.52 \\ -0.09 & 0 & 0 & -0.14 \\ 0 & 0 & 0 & 1 \end{bmatrix} \implies \mathbf{v}_{\text{world}} = \begin{bmatrix} 0.555 \\ 0.52 \\ -0.14 \\ 1 \end{bmatrix}$$

The power button's front-facing offset ($z = +0.555$) has rotated onto the $+X$ axis ($x = +0.555$), while its right-side offset ($x = +0.14$) has rotated onto the $-Z$ axis ($z = -0.14$), keeping the button locked to the upper-right corner of the front bezel.

---

## 5. Per-Face Shade Factors (`gl_VertexID / 4`) Without Lighting Shaders

When rendering a multi-part object using a flat uniform color (`u_partColor`) per component, all 6 faces of a cuboid would normally emit the exact same RGB pixel value. Wherever two faces of the same cuboid meet at a 90° edge, the silhouette between those faces disappears into a flat 2D blob.

To preserve 3D form readability while keeping lighting shaders out of scope for Module 1, [`shaders.js`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/shaders.js#L114-L145) computes a deterministic face index in the Vertex Shader using the built-in GLSL ES 3.00 input `gl_VertexID`:

```glsl
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
```

Because `geometry.js` packs vertices `0..3` for Face 0 (`+Z`), `4..7` for Face 1 (`-Z`), `8..11` for Face 2 (`+Y`), `12..15` for Face 3 (`-Y`), `16..19` for Face 4 (`+X`), and `20..23` for Face 5 (`-X`), integer division `gl_VertexID / 4` identifies the exact face of the shared unit cube with **zero extra VBO memory**.

> [!NOTE]
> **Aesthetic Contrast vs. Physically Based Illumination:**  
> These per-face shade factors (`1.00, 0.72, 1.14, 0.58, 0.88, 0.76`) are **manually selected empirical visual multipliers** chosen purely for aesthetic 3D form contrast so adjacent orthogonal faces of flat-colored boxes remain visually distinguishable. They are **not** physically based lighting (PBR) calculations or normal-based lighting equations (such as Lambertian cosine law $\mathbf{N} \cdot \mathbf{L}$, ambient occlusion, or Blinn-Phong specular reflection, which require surface normal vectors and light position calculations).

---

## 6. Tested Observations & Technical Caveats

The Task 3.5 implementation was verified in a real headless Chromium WebGL 2.0 environment via Chrome DevTools Protocol (CDP):

1. **Default Composite PC Case Initialization:**
   - `meshMode === "pccase"`, `partCount === 13`, `visiblePartCount === 13`, `drawCallsPerFrame === 13`.
   - Shared unit-cube GPU resources: `vertexCount === 24`, `indexCount === 36`, `vboByteLength === 576`, `eboByteLength === 72`, `shaderCompileCount === 1`, `geometryAllocCount === 1`.
2. **Hierarchical Matrix Composition (`computePartMatrixDemo("power_button")`):**
   - At root rotation `[0, 90, 0]`, `power_button`'s world center is `[0.555, 0.52, -0.14]`, matching the analytical derivation in Section 4.4 to floating-point precision.
3. **Sub-Assembly Hierarchy (`setSubAssemblyTransform("front_panel", ...)`):**
   - Translating `"front_panel"` by `[0, 0, 0.25]` shifts all 7 front-fascia parts (`front_bezel`, `front_accent_strip`, `power_button`, `front_io_bay`, and the 3 `front_vent_*` louvers) forward together as a single detachable assembly while leaving `chassis_core` stationary.
4. **Zero-Allocation Scene Mode Switching (`"pccase"` <-> `"cube"`):**
   - Switching from `"pccase"` to `"cube"` and back via `setMeshMode("cube")` / `setMeshMode("pccase")` reuses the existing 24-vertex Cube VAO (`shaderCompileCount` remains `1` and `geometryAllocCount` remains `1`), changing `drawCallsPerFrame` from `13` to `1` and back to `13`.
5. **Context Loss & Restoration Lifecycle:**
   - `WEBGL_lose_context` cleanly suspends the loop and displays `#context-lost-overlay`; `restoreContext()` rebuilds the shader program and shared cube VAO/VBO/EBO and resumes rendering all 13 PC Case parts while preserving the user's Pause/Resume preference.

### 6.1. Distinguishing Theoretical Advantages from Measured Experimental Observations

To maintain academic rigor, the following distinctions must be observed:

- **Draw-Call Performance:** Issuing 13 sequential `gl.drawElements()` calls per frame executed smoothly with zero dropped frames on our test configuration. However, CPU-to-driver overhead scales with the number of draw calls; for scenes requiring hundreds or thousands of parts, instanced rendering (`gl.drawElementsInstanced`) is theoretically and practically required.
- **VRAM Savings:** The single-VAO reuse design uses $576$ bytes VBO and $72$ bytes EBO on the GPU rather than $7,488$ bytes VBO and $936$ bytes EBO for duplicated meshes. This memory saving is analytically exact for the geometry buffers, but represents a specific procedural box-modeling technique rather than a universal replacement for unique meshes.
- **Z-Fighting Mitigation:** The 13 components were engineered with non-overlapping bounding planes (clearance offsets of $0.0125$ to $0.04$ units). In our standard test viewports and depth settings (`zNear: 0.1`, `zFar: 50.0`), depth testing (`gl.DEPTH_TEST`, `gl.LEQUAL`) renders without visible depth z-fighting artifacts. However, depth buffer precision is finite (governed by the 24-bit depth format and non-linear depth distribution); this design minimizes coplanar conflicts for the configured viewing volume, but does not mathematically eliminate precision limits under extreme frustum ratios or low-precision mobile depth buffers.
- **Automated Verification Scope:** Automated headless tests via CDP prove that the JavaScript execution, matrix composition, WebGL 2.0 API bindings, and lifecycle listeners function correctly under the test harness without console errors or unhandled exceptions. They do not constitute an exhaustive guarantee against vendor-specific GPU driver bugs, thermal throttling, or visual rendering discrepancies across arbitrary physical mobile devices.

---

## 7. Hands-On DevTools Console Experiments

Open Module 1 (`modules/module1-webgl/index.html`) in your browser, open **DevTools Console (`F12`)**, and run the following **5 safe, reversible experiments** using `window.Module1WebGL`.

### Experiment 1: Inspect the 13-Part PC Case Table & Verify Single-VAO Geometry Reuse

**Action:**
```javascript
console.table(
  window.Module1WebGL.getPCCaseParts().map((p) => ({
    id: p.id,
    group: p.group,
    subAssembly: p.subAssembly,
    scale: p.localScale.join(" × "),
    translation: p.localTranslation.join(", "),
  }))
);
const d = window.Module1WebGL.getDiagnostics();
console.log({
  meshMode: d.meshMode,
  partCount: d.partCount,
  drawCallsPerFrame: d.drawCallsPerFrame,
  vboByteLength: d.vboByteLength,
  eboByteLength: d.eboByteLength,
  geometryAllocCount: d.geometryAllocCount,
});
```

**Expected Result:**
- `console.table` lists all 13 cuboid parts with their non-uniform scales and local offsets.
- `vboByteLength` is `576` bytes (`24` vertices) and `eboByteLength` is `72` bytes (`36` indices).
- `drawCallsPerFrame` is `13`, submitting $13 \times 36 = 468$ index references across 13 draw calls (rasterizing $13 \times 12 = 156$ triangles per frame) while reusing the same GPU vertex data and benefiting from GPU post-transform vertex caching.

---

### Experiment 2: Exploded-View Disassembly Using 3-Level Sub-Assembly Hierarchy

**Action:**
```javascript
// Detach the Front Fascia Assembly (+Z), Side Glass Assembly (+X), and Base Feet (-Y):
window.Module1WebGL.setSubAssemblyTransform("front_panel", { translation: [0, 0, 0.32] });
window.Module1WebGL.setSubAssemblyTransform("side_panel", { translation: [0.28, 0, 0] });
window.Module1WebGL.setSubAssemblyTransform("base_feet", { translation: [0, -0.18, 0] });
```

**Expected Result & Technical Explanation:**
- All 7 front components (`front_bezel`, `front_accent_strip`, `power_button`, `front_io_bay`, and the 3 angled `front_vent_*` louvers) slide forward together along the PC Case's local $+Z$ axis, while the tempered-glass window and lower PSU trim slide outward along $+X$, and the two feet drop along $-Y$ — creating an engineering **exploded view**!
- Because each part computes $\mathbf{M}_{\text{worldPart}} = \mathbf{M}_{\text{root}} \times \mathbf{M}_{\text{subAssembly}} \times \mathbf{M}_{\text{localPart}}$, the exploded sub-assemblies continue orbiting cohesively around the rotating PC Case root.
- **Restore:** `window.Module1WebGL.resetScene();`

---

### Experiment 3: Modify an Individual Component's Local Transform (`setPartTransform`)

**Action:**
```javascript
// Swing open the Tempered Glass Side Panel by +35° around Y and shift it outward:
window.Module1WebGL.setPartTransform("side_glass_panel", {
  translation: [0.42, 0.08, 0.12],
  rotationDeg: [0, 35, 0],
  scale: [0.03, 0.88, 0.78],
});
```

**Expected Result & Technical Explanation:**
- Only `side_glass_panel` changes its local matrix $\mathbf{M}_{\text{localPart}}$; the other 12 components remain untouched in their original local coordinates, and all 13 parts still inherit $\mathbf{M}_{\text{root}}$ rotation.
- **Restore:** `window.Module1WebGL.resetScene();`

---

### Experiment 4: Verify Numerical Matrix Multiplication (`computePartMatrixDemo`)

**Action:**
```javascript
window.Module1WebGL.setAutoRotate(false);
window.Module1WebGL.setModelRotation(0, 90, 0);
console.log(window.Module1WebGL.computePartMatrixDemo("power_button"));
```

**Expected Result & Technical Explanation:**
- `centerInCaseSpace` is `[0.14, 0.52, 0.555]` (the button's offset on the front bezel in PC-Case space).
- After multiplying by $\mathbf{M}_{\text{root}}(0^\circ, 90^\circ, 0^\circ)$, `centerWorldSpace` becomes `[0.555, 0.52, -0.14]`, confirming the exact right-to-left column-vector matrix product derived in Section 4.4.
- **Restore:** `window.Module1WebGL.resetScene();`

---

### Experiment 5: Compare Per-Face `gl_VertexID` Shading vs. Flat Unshaded Uniform Colors

**Action:**
```javascript
// 1. Disable per-face shading (u_faceShadingStrength = 0.0):
window.Module1WebGL.setFaceShadingStrength(0.0);

// 2. Re-enable per-face shading (u_faceShadingStrength = 1.0):
// window.Module1WebGL.setFaceShadingStrength(1.0);
```

**Expected Result & Technical Explanation:**
- When `u_faceShadingStrength` is `0.0`, every face of `chassis_core` outputs the exact same RGB value `u_partColor`, causing the corner edges between the top, side, and back faces of the same cuboid to blend together visually.
- Restoring `setFaceShadingStrength(1.0)` re-applies the per-face visual multipliers (`faceShade`) in the Vertex Shader, immediately restoring crisp 3D box edges without lighting normals or extra vertex attributes.
- **Restore:** `window.Module1WebGL.resetScene();`

---

## 8. Limitations & Remaining Questions

1. **No Orbit Camera Interaction Yet:** The camera remains at a fixed perspective vantage point (`eye = [1.9, 1.5, 2.6]`). Free 360° mouse-drag orbit and scroll zoom are explored in Module 2 (Unity Graphical Applications).
2. **Sequential `gl.drawElements()` Calls vs. Instanced Rendering (`gl.drawElementsInstanced`):** Issuing 13 `gl.drawElements()` calls per frame is ideal for clarity and small composite objects (`10–100` parts). If a scene required `10,000` cuboids, uploading an instance matrix buffer and calling `gl.drawElementsInstanced()` once would minimize CPU-to-driver overhead.
3. **Next Step (Task 3.6):** Verify Module 1 integration inside the shared Web Portal (`index.html`) and perform the cross-browser compatibility and performance evaluation documented in `TASKS.md`.
