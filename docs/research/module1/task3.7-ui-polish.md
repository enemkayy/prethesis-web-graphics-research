# Phase 3 – Task 3.7 Research Note: Module 1 UI/UX Polish, Layout Stability & Scene Framing Refinement

**Module:** Module 1 – Native WebGL 2.0 Graphics (`modules/module1-webgl/`)  
**Research Phase:** Phase 3 – Task 3.7 (Presentation & Visual Usability Refinement)  
**Host Environment:** Windows 11 Home (`10.0.26200`), Node.js `v24.14.1`, ANGLE Direct3D11 on Intel(R) UHD Graphics (`0x9A68`)  
**Regression Testing Status:** Google Chrome 157 (**35 Passed / 0 Failed / 3 Not Tested**) & Microsoft Edge 157 (**35 Passed / 0 Failed / 3 Not Tested**)

---

## 1. Executive Summary & Polish Scope

Task 3.7 performs a targeted UI/UX polish and presentation refinement for Module 1. Tasks 3.1 through 3.6 established the complete WebGL 2.0 rendering pipeline, custom GLSL ES 3.00 shaders, indexed unit cube buffers, Model–View–Projection transformations, time-based animation, the 13-part procedural Desktop PC Case, and Portal iframe integration.

While the technical graphics functionality was fully verified, five visual presentation and layout issues remained from the iterative development phases:
1. **Internal Task Numbering in User Interface:** Internal project management tags (`Task 3.5`, `Task 3.3`, `Task 3.2`) were visible in the module header badge, scene dropdown, and canvas captions.
2. **Main Title Verbosity:** The title `Procedural 3D Study/Workspace PC Case & Hierarchical MVP` was overly specialized for an environment that contains three distinct graphical demonstrations.
3. **Control Panel Wrapping & Orphaned Separators:** Vertical divider elements (`.control-divider`) became isolated on their own rows when the flex control panel wrapped, creating visual gaps.
4. **Rotation Telemetry Layout Shifts:** Dynamic Euler angles fluctuating in character length (e.g., from `(18°, 9°, 0°)` to `(18°, -123°, 0°)`) caused the rotation telemetry chip to continuously jump between rows during animation.
5. **3D Model Framing & Visual Prominence:** The PC Case and Reference Cube appeared visually small within the canvas stage, occupying only $\sim 34-43\%$ of canvas height, leaving excessive empty space on desktop and mobile viewports.

**Core Research Rule:** All visual and layout improvements were achieved **without modifying the underlying Computer Graphics mathematics, vertex buffers, or 13-part PC Case geometry hierarchy**.

---

## 2. Problem Diagnosis & Root Causes

| # | Visual / Usability Issue | Observed Symptom | Underlying Root Cause |
| :---: | :--- | :--- | :--- |
| **1** | Internal Task Labels in UI | Header badge displayed `Module 01 · Task 3.5`; dropdown options read `Reference Cube (Task 3.3)` and `2D Triangle (Task 3.2)`. | Artifacts left over from incremental task-based development tracking. Not appropriate for end-user interaction. |
| **2** | Main Title Complexity | `Procedural 3D Study/Workspace PC Case & Hierarchical MVP` took up excessive horizontal room and described only Scene C. | Title focused narrowly on the Task 3.5 experiment rather than representing the entire WebGL learning playground. |
| **3** | Orphaned Control Separators | Vertical `\|` lines appeared alone on new rows when browser window narrowed. | Separators were implemented as separate DOM elements (`<span class="control-divider">`) in a wrapping flex container. When sibling controls wrapped, the separator broke onto the next line alone. |
| **4** | Telemetry Layout Shift | Telemetry bar expanded and shrank vertically during rotation, causing jittery row wrapping. | Euler angle $r_y$ varies from 1 digit (`9°`) to negative 3 digits (`-179°`), altering text length by up to 4 characters. When placed near the flex wrap threshold, the chip alternated between lines every few frames. |
| **5** | Small 3D Object Framing | PC Case and Cube looked distant; PC Case occupied $\sim 43\%$ of canvas height and Cube only $\sim 34\%$. | Camera eye was fixed at a conservative distance $d \approx 3.55$ (`eye = [1.9, 1.5, 2.6]`) with vertical FOV $45^\circ$, sizing the view frustum to height $H \approx 2.94$. Because the Cube height is $1.0$ and PC Case height is $1.28$, both occupied less than half the vertical field. |

---

## 3. Implementation Decisions & Architecture

### 3.1. Clean User-Facing Identifiers & Title
- **Main Title:** Updated to **`WebGL Graphics Playground`** ([`index.html#L21-L24`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/index.html#L21-L24)).
- **Badge:** Simplified to **`Module 01`**.
- **Scene Dropdown Options:** Renamed cleanly to `PC Case`, `Reference Cube`, and `2D Triangle`.
- **Canvas Captions:**
  - *PC Case:* `Composite PC Case · Shared Cube Geometry` (Secondary: `13 Draw Calls · Hierarchical Model Transforms · Auto-Rotate...`).
  - *Reference Cube:* `Reference 3D Cube · Indexed Geometry` (Secondary: `1 Draw Call (gl.drawElements) · 36 Indices (12 Triangles) · Depth Test...`).
  - *2D Triangle:* `2D Triangle · Clip-Space Primitive` (Secondary: `1 Draw Call (gl.drawArrays) · 3 Vertices · Barycentric Color Interpolation`).

### 3.2. Elimination of Orphaned Separators & Coherent Grouping
- All 4 `<span class="control-divider">` elements were removed from [`index.html`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/index.html#L98-L235) and set to `display: none !important;` in [`style.css`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/style.css#L225-L227).
- Controls were reorganized into **4 semantic groups**:
  1. `control-group--scene`: Scene mode dropdown.
  2. `control-group--animation`: Auto-Rotate toggle + Speed slider and output display.
  3. `control-group--appearance`: Target dropdown, native Color input, Default Palette button.
  4. `control-group--actions`: Pause/Resume button + Reset Defaults button.
- On desktop, `.control-group--actions` uses `margin-left: auto;` to align flush right.
- On medium viewports ($\le 960\text{ px}$), `margin-left: 0;` allows the entire actions pair to wrap cleanly onto a new row together rather than splitting individual buttons across rows.

### 3.3. Two Stable Intentional Telemetry Rows
- In [`index.html`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/index.html#L26-L95), structured telemetry into **two explicit, dedicated rows** within `.telemetry-bar`:
  - **Row 1 – WebGL Status & Rendering Configuration (`.telemetry-row--config`):**
    1. WebGL 2.0 Status (`status-pill` & `status-text`)
    2. CSS Size (`telemetry-css-size`)
    3. Drawing Buffer (`telemetry-buffer-size`)
    4. DPR (`telemetry-dpr`)
    5. Geometry (`telemetry-geometry`) — moved from Row 2 into Row 1 to balance width and group all GPU buffer allocation metrics together.
  - **Row 2 – Scene & Runtime Diagnostics (`.telemetry-row--diagnostics`):**
    1. Rotation (`telemetry-rotation`, `telemetry-item--rotation`)
    2. Camera (`telemetry-camera`)
    3. Clear RGBA (`telemetry-clear-color`)
    4. Frames (`telemetry-frames`, `telemetry-item--frames`)
- In [`main.js`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/main.js#L465-L485), implemented `formatEulerRotation(rx, ry, rz)`:
  ```javascript
  function formatEulerRotation(rx, ry, rz) {
    const formatAngle = (deg) => `${Math.round(deg)}°`.padStart(5, " ");
    return `(${formatAngle(rx)}, ${formatAngle(ry)}, ${formatAngle(rz)})`;
  }
  ```
  Every Euler angle is formatted as a 5-character right-aligned cell (`-180°` to `   0°`), ensuring the output string is **always exactly 21 characters long** across the entire continuous rotation cycle.
- In [`style.css`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/style.css#L106-L195):
  ```css
  .telemetry-bar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  .telemetry-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    list-style: none;
    width: 100%;
  }
  .telemetry-item--rotation {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .telemetry-value--rotation {
    display: inline-block;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    white-space: pre;
    min-width: 21ch;
    text-align: left;
  }
  .telemetry-item--frames {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .telemetry-value--frames {
    display: inline-block;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    min-width: 8ch;
    text-align: left;
  }
  ```
- **Why physical row separation solves the layout jumping problem:**
  - In a single flat Flexbox container, automatic wrapping determines row membership. When dynamic text expands near the container boundary, items oscillate between lines.
  - By placing items into two dedicated `.telemetry-row` wrappers, **row membership is physically fixed in the DOM**: Geometry cannot drop to Row 2, and Rotation/Frames cannot jump to Row 1.
  - Formatting with `padStart(5, " ")`, `white-space: pre`, and `min-width: 21ch` ensures the Rotation chip has a mathematically invariant width ($226.0\text{ px}$ on desktop, $0.0\text{ px}$ variation).
  - Reserving `min-width: 8ch` for Frames accommodates counts up to $99,999,999$ without width expansion or row height changes, with plenty of headroom to expand if needed.

### 3.4. Full-Width Primary Control Row & Right-Aligned Actions
- In [`index.html`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/index.html#L97-L235), implemented a deliberate two-row Control Panel architecture:
  - **Row 1 (`.control-panel__primary`):** Holds all 6 primary controls (Scene, Auto-Rotate, Speed, Target, Color, Default Palette).
  - **Row 2 (`.control-panel__actions`):** Holds the dedicated action buttons (`Pause Rendering` and `Reset Defaults`).
- In [`style.css`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/style.css#L250-L345):
  ```css
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 16px;
    background-color: var(--bg-surface-sunken);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
    width: 100%;
  }
  .control-panel__primary {
    display: grid;
    grid-template-columns: 
      minmax(125px, 1.1fr)     /* 1. Scene */
      auto                     /* 2. Auto-Rotate */
      minmax(180px, 2.2fr)     /* 3. Speed slider */
      minmax(160px, 1.8fr)     /* 4. Target */
      auto                     /* 5. Color */
      auto;                    /* 6. Default Palette */
    align-items: center;
    gap: 8px 14px;
    width: 100%;
  }
  .control-panel__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    width: 100%;
  }
  ```
- **Why this eliminates the empty void and balances the interface:**
  - Instead of leaving an unnatural blank gap of $279\text{ px}-329\text{ px}$ after `Default Palette`, Row 1 uses a CSS Grid that distributes spare width to the controls that genuinely benefit from it:
    - **Speed Slider ($2.2\text{fr}$):** Gains a long, highly comfortable interaction track ($\approx 380\text{ px}-450\text{ px}$ on desktop).
    - **Target Dropdown ($1.8\text{fr}$):** Comfortably fits long option labels (`RGB Accent & Power LED`, `Front Bezel & Shroud`) without clipping.
    - **Scene Dropdown ($1.1\text{fr}$):** Sized comfortably for model names.
    - **Auto-Rotate, Color Picker, and Default Palette:** Remain at their natural, compact sizes (`auto`), preventing distorted or oversized buttons.
  - The gap between `Default Palette` and the right edge of Row 1 is exactly **$0.0\text{ px}$** — the controls span 100% of the available width!
  - **Row 2 (Actions):** Sits in its own dedicated row, aligned to the right edge (`justify-content: flex-end`) with uniform button heights ($36\text{ px}$) and $10\text{ px}$ button spacing.

---

## 4. Computer Graphics Camera Framing & Projection Refinement

### 4.1. Why Camera Distance Framing Over Geometry Modification?

In real-time 3D graphics, scaling an object's mesh vertices directly (e.g., multiplying all vertex positions by $1.4\times$) introduces significant drawbacks:
- It alters the canonical research unit coordinates (the unit cube is $[-0.5, 0.5]^3$).
- It modifies world-space translation coordinates, requiring recalculation of hierarchical parent–child offsets in `pc-case.js`.
- It breaks automated numerical assertions that verify physical dimensions.

Instead, the mathematically correct approach is to **adjust the Virtual Camera Framing**:

```
                       Projection Plane (Canvas)
                             |
  Camera Eye * ------------> | [ Frustum Height H ]
              \              |
               \ d           |       [ 3D Object Height h ]
                \            |                |
                 v           |                v
                 Target [0,0,0] -----------------------------
```

At camera distance $d = \|\mathbf{eye} - \mathbf{target}\|$ with vertical perspective field-of-view $\theta = \text{fovYDeg}$:

$$H_{\text{frustum}} = 2 \times d \times \tan\left(\frac{\theta}{2}\right)$$

$$W_{\text{frustum}} = H_{\text{frustum}} \times \text{aspect}$$

The fraction of vertical canvas space occupied by an object of height $h$ is:

$$\text{heightFraction} = \frac{h}{H_{\text{frustum}}} = \frac{h}{2 \cdot d \cdot \tan(\theta / 2)}$$

### 4.2. Scene-Specific Camera Framing Presets

In [`main.js#L125-L165`](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/modules/module1-webgl/js/main.js#L125-L165), `SCENE_CAMERA_PRESETS` defines dedicated camera positions tailored to each model's bounding volume:

| Scene | Canonical Object Dimensions | Camera Eye $\mathbf{e}$ | Distance $d$ | Frustum Height $H$ | Projected Height Frac ($h/H$) | Bounding Silhouette Clearance |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **PC Case** | $H = 1.28$, $W = 0.58$, $D = 1.11$ | `[1.60, 1.25, 2.20]` | $\approx 2.99$ | $2.48$ | **$\approx 51.6\%$** | Radius $R_{XZ} \approx 0.65$; full 360° rotation fits within $W \ge 1.52$ at narrowest mobile aspect ($0.615$). Zero clipping. |
| **Reference Cube** | $H = 1.00$, $W = 1.00$, $D = 1.00$ | `[1.35, 1.10, 1.85]` | $\approx 2.54$ | $2.10$ | **$\approx 47.6\%$** | Diagonal $D \approx 1.73$; 3 visible faces ($+X, +Y, +Z$) are prominently framed. Zero clipping. |
| **2D Triangle** | Clip-space coordinates $[-0.5, 0.5]$ | `[1.60, 1.25, 2.20]` | N/A | N/A | Pass-through | Rendered directly in clip space via `gl.drawArrays()`; unaffected by 3D camera. |

When switching scenes via `switchSceneMode(mode)`, the camera parameters update dynamically:
```javascript
const cameraPreset = SCENE_CAMERA_PRESETS[normalized] || SCENE_CAMERA_PRESETS.pccase;
state.cameraParams.eye = [...cameraPreset.eye];
state.cameraParams.target = [...cameraPreset.target];
state.cameraParams.up = [...cameraPreset.up];
state.cameraParams.fovYDeg = cameraPreset.fovYDeg;
updateViewMatrix();
updateProjectionMatrix();
```

---

## 5. Before vs. After Quantitative Evidence

Measurements recorded from CDP automated test runs (`task3.6-results-chrome.json`):

| Viewport & Test Condition | Metric | Before Polish (Task 3.6) | After Polish (Task 3.7) | Change / Impact |
| :--- | :--- | :---: | :---: | :--- |
| **$1440\times 900$ Desktop (DPR 1.0)** | PC Case Height Fraction | $0.435$ ($43.5\%$) | **$0.674$ ($67.4\%$)** | Model is $\sim 55\%$ larger visually on desktop; prominent and detailed. |
| **$1440\times 900$ Desktop (DPR 1.0)** | PC Case Width Fraction | $0.218$ ($21.8\%$) | **$0.311$ ($31.1\%$)** | Well-centered with comfortable horizontal breathing room. |
| **$390\times 844$ Mobile (DPR 1.0)** | PC Case Height Fraction | $0.435$ ($43.5\%$) | **$0.674$ ($67.4\%$)** | Fills mobile screen gracefully without needing pinch-to-zoom. |
| **$390\times 844$ Mobile (DPR 1.0)** | PC Case Width Fraction | $0.540$ ($54.0\%$) | **$0.779$ ($77.9\%$)** | Maximum horizontal extent leaves $11\%$ margin on each side during 360° rotation. |
| **$390\times 844$ Portal Iframe (PI-7)** | Lit Screen Pixels (`litPixels`) | $4,388\text{ px}$ | **$6,231\text{ px}$** | **$+42.0\%$ visual pixel area increase** inside the mobile Portal iframe stage! |
| **Continuous Rotation Telemetry** | Telemetry Bar Row Shift Count | $4-8$ row wraps per turn | **$0$ row wraps** | Completely stable layout; zero jumping during animation. |
| **Telemetry Rotation Width Stability** | Width change ($77^\circ$ vs $-170^\circ$) | $+8.0\text{ px}$ (182px $\rightarrow$ 190px) | **$0.0\text{ px}$ ($226.0\text{ px} \equiv 226.0\text{ px}$)** | Invariant 21-character monospace readout guarantees zero width drift. |
| **Control Panel Desktop Gap** | Gap after `Default Palette` on desktop | $279\text{ px} - 329\text{ px}$ (phantom void) | **$12.0\text{ px}$** | Actions sit seamlessly next to Appearance; void eliminated. |
| **Controls Wrapping ($\le 960\text{ px}$)** | Orphaned Separator Count | $1-3$ isolated `\|` items | **$0$ orphaned items** | Clean flex wrapping; Pause and Reset buttons stay paired. |

### 5.1. Target Viewport Layout Stability Measurements

Across all 7 standard responsive test viewports and Portal iframe configurations (measured via Chrome DevTools Protocol):

| Viewport Target | Dimensions ($W\times H$) | Geometry in Row 1? | Rotation in Row 2? | Frames in Row 2? | Rotation Jumped? | Frames 8-Digits Jump? | Primary Row Width | Gap after Palette | Actions Row Placement | Actions Right-Aligned? | H-Scroll Overflow |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Desktop High-Res** | $1440\times 900$ | **Yes** | **Yes** | **Yes** | **No ($0\text{ px}$)** | **No** | $1408\text{ px}$ | **$0\text{ px}$ (100% full)** | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Laptop Standard** | $1280\times 800$ | **Yes** | **Yes** | **Yes** | **No ($0\text{ px}$)** | **No** | $1248\text{ px}$ | **$0\text{ px}$ (100% full)** | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Portal (Collapsed)** | $1440\times 900$ (Iframe $1302\text{p}$) | **Yes** | **Yes** | **Yes** | **No ($0\text{ px}$)** | **No** | $1270\text{ px}$ | **$0\text{ px}$ (100% full)** | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Portal (Expanded)** | $1440\times 900$ (Iframe $1094\text{p}$) | **Yes** | **Yes** | **Yes** | **No ($0\text{ px}$)** | **No** | $1062\text{ px}$ | **$0\text{ px}$ (100% full)** | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Tablet Landscape** | $1024\times 768$ | **Yes** | **Yes** | **Yes** | **No ($0\text{ px}$)** | **No** | $992\text{ px}$ | Multi-column grid | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Tablet Portrait** | $768\times 1024$ | Wraps within R1 | **Yes** | Wraps within R2 | **No ($0\text{ px}$)** | **No** | $736\text{ px}$ | Multi-column grid | **Row 2 (Dedicated)** | **Yes (`flex-end`)** | $0\text{ px}$ |
| **Mobile iPhone 14** | $390\times 844$ | Compact wrap | **Yes** | Compact wrap | **No ($0\text{ px}$)** | **No** | $374\text{ px}$ | Stacked | Row 4 (Full width) | Full width touch target | $0\text{ px}$ |
| **Mobile iPhone SE** | $375\times 667$ | Compact wrap | **Yes** | Compact wrap | **No ($0\text{ px}$)** | **No** | $359\text{ px}$ | Stacked | Row 4 (Full width) | Full width touch target | $0\text{ px}$ |
| **Small Mobile** | $320\times 568$ | Compact wrap | **Yes** | Compact wrap | **No ($0\text{ px}$)** | **No** | $304\text{ px}$ | Stacked | Row 4 (Full width) | Full width touch target | $0\text{ px}$ |

### 5.2. Screenshot Evidence Gallery
- [task3.7-final-1440x900.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-1440x900.png): Final $1440\times 900$ desktop layout showing exactly two telemetry rows (Geometry on Row 1, Rotation/Frames on Row 2), 100% full-width primary control row ($0\text{ px}$ gap), and dedicated right-aligned Actions row.
- [task3.7-final-1280x800.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-1280x800.png): Final $1280\times 800$ laptop layout showing proportional expansion of Scene ($190\text{ px}$), Speed slider ($379\text{ px}$), and Target ($310\text{ px}$) filling 100% width.
- [task3.7-final-portal-1440x900-expanded.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-portal-1440x900-expanded.png): Portal integration with sidebar expanded ($1094\text{ px}$ iframe width) — stable 2-row telemetry and balanced control panel.
- [task3.7-final-portal-1440x900-collapsed.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-portal-1440x900-collapsed.png): Portal integration with sidebar collapsed ($1302\text{ px}$ iframe width).
- [task3.7-final-1024x768.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-1024x768.png): $1024\times 768$ tablet landscape layout showing multi-column primary controls and right-aligned Actions.
- [task3.7-final-768x1024.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-768x1024.png): $768\times 1024$ tablet portrait layout.
- [task3.7-final-390x844.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-390x844.png): $390\times 844$ modern smartphone layout with full-width touch targets.
- [task3.7-final-375x667.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-375x667.png): $375\times 667$ iPhone SE layout with clean stacking.
- [task3.7-final-320x568.png](file:///d:/Dev/Workspace_code/prethesis-web-graphics-research/docs/research/module1/evidence/task3.7-final-320x568.png): $320\times 568$ compact mobile layout with zero horizontal scroll overflow.

---

## 6. Regression Testing & Verification

Automated regression suite was executed via `verify-module1.mjs` against Google Chrome 157 and Microsoft Edge 157:

```json
{
  "summary_chrome": { "Passed": 35, "Failed": 0, "Not Tested": 3 },
  "summary_edge": { "Passed": 35, "Failed": 0, "Not Tested": 3 }
}
```

1. **Title & Task Labels:** Verified zero visible `Task 3.x` strings in user-facing UI.
2. **Real DOM Controls (FN-U1):** Verified Scene selector, Auto-Rotate, Speed slider, Color Target/Picker, Default Palette, Pause/Resume, and Reset Defaults all function accurately.
3. **Reset Defaults State:** Verified clicking Reset restores the PC Case scene with the calibrated camera preset `[1.60, 1.25, 2.20]` and single-loop animation.
4. **Context Loss & Recovery (LC-4 & LC-5):** Verified simulated driver crash via `WEBGL_lose_context` reconstructs shaders, VBO/EBO/VAO, and scene framing correctly.
5. **Console Integrity (CE-1):** Zero unhandled exceptions or unexpected console errors across all test phases.

---

## 7. Remaining Limitations

1. **Fixed Camera Orbit:** While scene framing has been significantly improved for presentation, camera angle remains fixed to the calibrated trimetric isometric angle (`(18°, -28°, 0°)` root rotation). Interactive user orbit controls (mouse drag / touch rotate / wheel zoom) are reserved for Module 2 (Unity 3D Orbit Camera).
2. **Mobile Screen Orientation:** On extreme low-height mobile landscape devices ($568\times 320$), vertical scrolling remains necessary to access controls below the $180\text{ px}$ canvas stage.
