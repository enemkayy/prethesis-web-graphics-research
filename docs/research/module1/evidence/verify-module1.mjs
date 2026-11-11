/**
 * Task 3.6 verification harness for Module 1 (WebGL 2.0).
 *
 * Usage (Node >= 22, no npm packages):
 *   node verify-module1.mjs <label> <path-to-browser-exe> [--shots]
 *   e.g. node verify-module1.mjs chrome "C:\Program Files\Google\Chrome\Application\chrome.exe" --shots
 *
 * What it does: starts a static HTTP server for the repository root, launches the given
 * Chromium-based browser in headless mode with a remote-debugging port, drives it through the
 * Chrome DevTools Protocol (CDP) and writes `task3.6-results-<label>.json` (+ optional PNG
 * screenshots) next to this script. Every record has: id, category, procedure, expected,
 * observed, status (Passed | Failed | Not Tested).
 *
 * Limits: headless + emulated viewports are NOT physical devices; GPU = whatever the headless
 * browser picked (the WebGL renderer string is recorded in the environment block).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const [label, exePath] = [process.argv[2], process.argv[3]];
const WANT_SHOTS = process.argv.includes("--shots");
if (!label || !exePath) {
  console.error("usage: node verify-module1.mjs <label> <browser.exe> [--shots]");
  process.exit(2);
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      let p = decodeURIComponent(u.pathname);
      if (p === "/") p = "/index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end("404"); }
        res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(req.method === "HEAD" ? undefined : data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
      this.ws.addEventListener("message", (e) => {
        const m = JSON.parse(e.data);
        if (m.id && this.pending.has(m.id)) {
          const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
          m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
        } else if (m.method && this.handlers.has(m.method)) {
          for (const h of this.handlers.get(m.method)) h(m.params);
        }
      });
    });
  }
  on(method, fn) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(fn); }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  /** Runs a self-contained function in the page and returns its (awaited) JSON-serialisable result. */
  async fn(f, ...args) {
    const r = await this.send("Runtime.evaluate", {
      expression: `(${f.toString()})(...${JSON.stringify(args)})`, returnByValue: true, awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error("page exception: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

/** Helpers injected into the top-level document after every navigation. */
function pageHelpers() {
  window.__T = {
    win() { const f = document.getElementById("module-iframe"); return f ? f.contentWindow : window; },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    d(w) { return w.Module1WebGL.getDiagnostics(); },
    /** Compares the module's frameCount growth against an independent rAF counter on the same window. */
    loopRatio(w, ms) {
      return new Promise((resolve) => {
        const f0 = w.Module1WebGL.getDiagnostics().frameCount; const stamps = []; let first = null; let done = false;
        const finish = () => {
          if (done) return; done = true;
          const f1 = w.Module1WebGL.getDiagnostics().frameCount;
          const iv = []; for (let i = 1; i < stamps.length; i++) iv.push(stamps[i] - stamps[i - 1]);
          iv.sort((a, b) => a - b);
          const mean = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : null;
          resolve({ ownRaf: stamps.length, stateFrames: f1 - f0, ratio: stamps.length ? (f1 - f0) / stamps.length : null,
            meanIntervalMs: mean, p95IntervalMs: iv.length ? iv[Math.floor(iv.length * 0.95)] : null, maxIntervalMs: iv.length ? iv[iv.length - 1] : null });
        };
        const tick = (ts) => { if (first === null) first = ts; stamps.push(ts); if (ts - first < ms) w.requestAnimationFrame(tick); else finish(); };
        w.requestAnimationFrame(tick);
        setTimeout(finish, ms + 1500);
      });
    },
    /** Reads the whole drawing buffer and returns the bounding box of non-clear-colour pixels. */
    bbox(w) {
      const api = w.Module1WebGL; api.sampleCenterPixel();
      const c = w.document.getElementById("webgl-canvas"); const gl = c.getContext("webgl2");
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const buf = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const cc = api.getDiagnostics().clearColor; const cr = Math.round(cc.r * 255), cg = Math.round(cc.g * 255), cb = Math.round(cc.b * 255);
      let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (Math.abs(buf[i] - cr) > 6 || Math.abs(buf[i + 1] - cg) > 6 || Math.abs(buf[i + 2] - cb) > 6) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { W, H, litPixels: n, bbox: n ? [x0, y0, x1, y1] : null, widthFrac: n ? (x1 - x0 + 1) / W : 0, heightFrac: n ? (y1 - y0 + 1) / H : 0 };
    },
    layout(w) {
      const doc = w.document; const r = (id) => { const e = doc.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : null; };
      const ctrls = ["control-mesh-mode", "control-auto-rotate", "control-rotation-speed", "control-color-target", "control-object-color", "control-color-palette", "control-pause-resume", "control-reset"];
      const off = ctrls.filter((id) => { const b = doc.getElementById(id).getBoundingClientRect(); return b.right > w.innerWidth + 0.5 || b.left < -0.5 || b.width === 0; });
      return { innerW: w.innerWidth, innerH: w.innerHeight, instrumentBarH: r("canvas-stage") === null ? null : Math.round(doc.querySelector(".instrument-bar").getBoundingClientRect().height),
        controlPanelH: r("control-panel"), canvasStageH: r("canvas-stage"), hScrollOverflowPx: Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth), controlsOutsideViewport: off };
    },
  };
}

const results = []; const consoleBuckets = {}; let bucket = "init"; const netIssues = [];
function rec(r) { results.push(r); console.log(`[${r.status}] ${r.id} ${r.name}`); }
async function test(id, category, name, procedure, expected, env, fn) {
  try {
    const out = await fn();
    rec({ id, category, name, env, procedure, expected, observed: out.observed, status: out.ok ? "Passed" : "Failed" });
  } catch (e) {
    rec({ id, category, name, env, procedure, expected, observed: "ERROR: " + e.message, status: "Failed" });
  }
}
const notTested = (id, category, name, procedure, expected, observed, env = "n/a") =>
  rec({ id, category, name, env, procedure, expected, observed, status: "Not Tested" });

async function main() {
  const { server, port } = await startServer();
  const BASE = `http://127.0.0.1:${port}`;
  const dbg = 9400 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "m1-" + label + "-"));
  const proc = spawn(exePath, [`--remote-debugging-port=${dbg}`, `--user-data-dir=${profile}`, "--headless=new", "--no-first-run",
    "--no-default-browser-check", "--disable-default-apps", "--enable-webgl", "--ignore-gpu-blocklist", "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
  let cdp;
  try {
    let wsUrl = null;
    for (let i = 0; i < 60 && !wsUrl; i++) {
      try {
        const l = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json();
        const pg = l.find((t) => t.type === "page"); if (pg) wsUrl = pg.webSocketDebuggerUrl;
      } catch { /* retry */ }
      if (!wsUrl) await sleep(200);
    }
    if (!wsUrl) throw new Error("no DevTools endpoint");
    cdp = new CDP(wsUrl); await cdp.connect();
    const browserVersion = await (await fetch(`http://127.0.0.1:${dbg}/json/version`)).json();
    for (const m of ["Page.enable", "Runtime.enable", "Log.enable", "Network.enable"]) await cdp.send(m);
    cdp.on("Runtime.consoleAPICalled", (p) => { if (p.type === "error") (consoleBuckets[bucket] ||= []).push(p.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300)); });
    cdp.on("Runtime.exceptionThrown", (p) => (consoleBuckets[bucket + ":exceptions"] ||= []).push((p.exceptionDetails.exception?.description || p.exceptionDetails.text).slice(0, 300)));
    cdp.on("Log.entryAdded", (p) => { if (p.entry.level === "error") (consoleBuckets[bucket + ":log"] ||= []).push(`${p.entry.text} ${p.entry.url || ""}`.slice(0, 300)); });
    cdp.on("Network.responseReceived", (p) => { if (p.response.status >= 400) netIssues.push({ bucket, status: p.response.status, url: p.response.url.replace(BASE, "") }); });
    let loadWaiters = [];
    cdp.on("Page.loadEventFired", () => { loadWaiters.forEach((f) => f()); loadWaiters = []; });

    const setVp = (w, h, dpr = 1, mobile = false) => cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile });
    async function nav(url, { vp, waitModule = true, helpers = true } = {}) {
      if (vp) await setVp(...vp);
      const loaded = new Promise((r) => loadWaiters.push(r));
      await cdp.send("Page.navigate", { url });
      await Promise.race([loaded, sleep(15000)]);
      if (helpers) await cdp.send("Runtime.evaluate", { expression: `(${pageHelpers.toString()})()` });
      if (waitModule) await waitReady();
    }
    async function waitReady(timeout = 8000, win = "auto") {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        const ok = await cdp.fn(() => { try { const w = window.__T.win(); const d = w.Module1WebGL?.getDiagnostics(); return Boolean(d && (d.frameCount > 2 || !d.hasWebGL2 || d.lastShaderError)); } catch { return false; } });
        if (ok) return true; await sleep(100);
      }
      return false;
    }
    const shot = async (name) => {
      if (!WANT_SHOTS) return null;
      const r = await cdp.send("Page.captureScreenshot", { format: "png" });
      const file = `task3.6-${label}-${name}.png`; fs.writeFileSync(path.join(HERE, file), Buffer.from(r.data, "base64")); return file;
    };

    const MODULE = `${BASE}/modules/module1-webgl/index.html`;
    const PORTAL = `${BASE}/index.html`;
    const ENV = `${label} ${browserVersion.Browser}, headless(new), CDP`;

    // ---------------------------------------------------------------- ENV
    bucket = "standalone-load";
    await nav(MODULE, { vp: [1280, 800, 1, false] });
    const env = await cdp.fn(() => {
      const c = document.createElement("canvas"); const gl = c.getContext("webgl2", { depth: true });
      const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      return { userAgent: navigator.userAgent, platform: navigator.platform, hasWebGL2: Boolean(gl),
        glVersion: gl && gl.getParameter(gl.VERSION), glslVersion: gl && gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : "(WEBGL_debug_renderer_info unavailable)",
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "(WEBGL_debug_renderer_info unavailable)",
        depthBits: gl && gl.getParameter(gl.DEPTH_BITS), maxTextureSize: gl && gl.getParameter(gl.MAX_TEXTURE_SIZE),
        loseContextExt: Boolean(gl && gl.getExtension("WEBGL_lose_context")), timerQueryExt: Boolean(gl && gl.getExtension("EXT_disjoint_timer_query_webgl2")),
        devicePixelRatio: window.devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency };
    });
    const environment = { label, browserProduct: browserVersion.Browser, protocol: browserVersion["Protocol-Version"], os: `${os.type()} ${os.release()} (${os.version?.()})`, node: process.version, mode: "headless (--headless=new), driven via CDP; no physical display/device", ...env };
    console.log("ENV", JSON.stringify(environment));

    // ---------------------------------------------------------------- Standalone
    await test("SA-1", "Integration", "Standalone document: WebGL 2.0 initialised and rendering", "Open /modules/module1-webgl/index.html over HTTP @1280x800; wait for frames", "hasWebGL2, shader+VAO+VBO+EBO present, meshMode=pccase, 13 draws, frameCount grows, status 'WebGL 2.0 Active', non-clear pixels", ENV, async () => {
      const o = await cdp.fn(async () => { const w = window; const d1 = w.Module1WebGL.getDiagnostics(); await __T.sleep(500); const d2 = __T.d(w); const bb = __T.bbox(w);
        return { d: { hasWebGL2: d2.hasWebGL2, program: d2.hasShaderProgram, vao: d2.hasVAO, vbo: d2.hasVBO, ebo: d2.hasEBO, meshMode: d2.meshMode, draws: d2.drawCallsPerFrame, parts: d2.partCount, vbytes: d2.vboByteLength, ebytes: d2.eboByteLength, compiles: d2.shaderCompileCount, allocs: d2.geometryAllocCount, running: d2.isRunning }, framesGrew: d2.frameCount > d1.frameCount, status: document.getElementById("status-text").textContent, bb }; });
      const ok = o.d.hasWebGL2 && o.d.program && o.d.vao && o.d.vbo && o.d.ebo && o.d.meshMode === "pccase" && o.d.draws === 13 && o.d.vbytes === 576 && o.d.ebytes === 72 && o.framesGrew && /Active/.test(o.status) && o.bb.litPixels > 0;
      return { ok, observed: o };
    });
    await shot("standalone-pccase-1280x800");
    await test("SA-2", "Lifecycle", "Single rendering loop (own rAF vs module frameCount, 2 s)", "Count independent rAF callbacks and module frameCount increments over 2 s", "ratio ≈ 1.0 (a duplicate loop would give ≈ 2.0)", ENV, async () => {
      const o = await cdp.fn(() => __T.loopRatio(window, 2000)); return { ok: o.ratio > 0.9 && o.ratio < 1.1, observed: o };
    });
    await test("SA-3", "Integration", "Relative paths/assets: no HTTP >= 400 and no console errors while loading standalone module", "Network.responseReceived + console/exception capture during load", "0 failing requests (favicon.ico excluded), 0 console errors, 0 exceptions", ENV, async () => {
      const bad = netIssues.filter((n) => n.bucket === "standalone-load" && !/favicon/.test(n.url)); const errs = ["standalone-load", "standalone-load:exceptions", "standalone-load:log"].flatMap((k) => (k.endsWith(":log") ? (consoleBuckets[k] || []).filter((s) => !/favicon/.test(s)) : consoleBuckets[k] || []));
      return { ok: bad.length === 0 && errs.length === 0, observed: { failingRequests: bad, consoleErrors: errs } };
    });

    // ---------------------------------------------------------------- Functional: triangle / cube / pccase
    bucket = "functional";
    await test("FN-T1", "Functional/Triangle", "Triangle: 3 vertices, drawArrays, non-indexed, vertex colours interpolate", "Select Triangle via #control-mesh-mode; stop rotation; sample pixels near each vertex and at centroid", "vertexCount=3, no EBO, draws=1, caption mentions drawArrays, each vertex region dominated by its own colour channel, centroid is a blend", ENV, async () => {
      const o = await cdp.fn(() => { const s = document.getElementById("control-mesh-mode"); s.value = "triangle"; s.dispatchEvent(new Event("change", { bubbles: true }));
        const A = Module1WebGL, d = A.getDiagnostics(); const vd = d.vertexData; const V = [0, 1, 2].map((i) => ({ p: vd.slice(i * 6, i * 6 + 3), c: vd.slice(i * 6 + 3, i * 6 + 6) }));
        const cen = [0, 1].map((k) => (V[0].p[k] + V[1].p[k] + V[2].p[k]) / 3);
        const samples = V.map((v) => { const nx = v.p[0] * 0.8 + cen[0] * 0.2, ny = v.p[1] * 0.8 + cen[1] * 0.2; const px = A.samplePixelAtNdc(nx, ny); const dom = (arr) => arr.indexOf(Math.max(...arr)); return { vertexColor: v.c, pixel: px, domVertex: dom(v.c), domPixel: dom(px.slice(0, 3)) }; });
        const centre = A.samplePixelAtNdc(cen[0], cen[1]);
        return { d: { mesh: d.meshMode, verts: d.vertexCount, indexed: d.isIndexed, ebo: d.hasEBO, draws: d.drawCallsPerFrame, prim: d.primitiveMode }, caption: document.getElementById("stage-caption-text").textContent, samples, centre, centreBlend: Math.max(...centre.slice(0, 3)) - Math.min(...centre.slice(0, 3)) < 120 }; });
      const ok = o.d.verts === 3 && !o.d.ebo && !o.d.indexed && o.d.draws === 1 && /drawArrays/.test(o.caption) && o.samples.every((s) => s.domVertex === s.domPixel) && o.centreBlend;
      return { ok, observed: o };
    });
    await shot("standalone-triangle-1280x800");
    await test("FN-C1", "Functional/Cube", "Cube: indexed VBO/EBO/VAO, 36 indices, MVP valid, faces distinguishable, depth test occludes back faces", "Select Cube; Auto-Rotate off; rotation (0,0,0); sample centres of +X,+Y,+Z faces and the hidden -X face", "24v/36i, 1 draw, DEPTH_TEST enabled, 3 visible face colours pairwise distinct, hidden -X centre pixel != -X face colour", ENV, async () => {
      const o = await cdp.fn(() => { const s = document.getElementById("control-mesh-mode"); s.value = "cube"; s.dispatchEvent(new Event("change", { bubbles: true }));
        const A = Module1WebGL; A.setAutoRotate(false); A.setModelRotation(0, 0, 0); const d = A.getDiagnostics();
        const gl = document.getElementById("webgl-canvas").getContext("webgl2");
        const face = (p) => { const n = A.projectLocalPoint(p).ndc; return { ndc: n, pixel: A.samplePixelAtNdc(n[0], n[1]) }; };
        const fx = face([0.5, 0, 0]), fy = face([0, 0.5, 0]), fz = face([0, 0, 0.5]), hidden = face([-0.5, 0, 0]);
        const vd = d.vertexData; const col = (f) => [vd[f * 4 * 6 + 3], vd[f * 4 * 6 + 4], vd[f * 4 * 6 + 5]].map((v) => Math.round(v * 255));
        const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        const hiddenFaceColour = col(5);
        return { d: { mesh: d.meshMode, v: d.vertexCount, i: d.indexCount, vao: d.hasVAO, vbo: d.hasVBO, ebo: d.hasEBO, draws: d.drawCallsPerFrame }, depthTest: gl.isEnabled(gl.DEPTH_TEST), depthFunc: gl.getParameter(gl.DEPTH_FUNC) === gl.LEQUAL ? "LEQUAL" : "other",
          visible: { x: fx.pixel, y: fy.pixel, z: fz.pixel }, ndcInRange: [fx, fy, fz].every((f) => f.ndc.every((v) => Math.abs(v) <= 1)), pairDist: [dist(fx.pixel, fy.pixel), dist(fy.pixel, fz.pixel), dist(fx.pixel, fz.pixel)].map(Math.round),
          hiddenPixel: hidden.pixel, hiddenFaceColour, hiddenOccluded: dist(hidden.pixel, hiddenFaceColour) > 25 }; });
      const ok = o.d.v === 24 && o.d.i === 36 && o.d.vao && o.d.vbo && o.d.ebo && o.d.draws === 1 && o.depthTest && o.ndcInRange && o.pairDist.every((x) => x > 60) && o.hiddenOccluded;
      return { ok, observed: o };
    });
    await shot("standalone-cube-1280x800");

    await test("FN-P1", "Functional/PCCase", "PC Case default: 13 parts, 1 shared geometry, 13 draw calls", "Reload standalone; read diagnostics", "partCount=13, visible=13, draws=13, compiles=1, allocs=1, VBO=576 B, EBO=72 B", ENV, async () => {
      await nav(MODULE); const o = await cdp.fn(() => { const d = __T.d(window); return { parts: d.partCount, visible: d.visiblePartCount, draws: d.drawCallsPerFrame, compiles: d.shaderCompileCount, allocs: d.geometryAllocCount, vbo: d.vboByteLength, ebo: d.eboByteLength, v: d.vertexCount, i: d.indexCount, mesh: d.meshMode }; });
      return { ok: o.parts === 13 && o.visible === 13 && o.draws === 13 && o.compiles === 1 && o.allocs === 1 && o.vbo === 576 && o.ebo === 72 && o.mesh === "pccase", observed: o };
    });
    await test("FN-P2", "Functional/PCCase", "Root transform moves/rotates all 13 parts", "setAutoRotate(false); setModelTranslation(0.3,0,0) and compare every part worldMatrix translation column", "all 13 parts shift by exactly +0.3 in world X (translation is the last matrix applied)", ENV, async () => {
      const o = await cdp.fn(() => { const A = Module1WebGL; A.setAutoRotate(false); A.setModelTransform({ translation: [0, 0, 0] }); const a = A.getPCCaseParts(); A.setModelTransform({ translation: [0.3, 0, 0] }); const b = A.getPCCaseParts();
        const dx = a.map((p, i) => +(b[i].worldMatrix[12] - p.worldMatrix[12]).toFixed(5)); const dy = a.map((p, i) => +(b[i].worldMatrix[13] - p.worldMatrix[13]).toFixed(5)); A.setModelTransform({ translation: [0, 0, 0] }); return { dx, dy }; });
      return { ok: o.dx.length === 13 && o.dx.every((v) => Math.abs(v - 0.3) < 1e-4) && o.dy.every((v) => Math.abs(v) < 1e-4), observed: o };
    });
    await test("FN-P3", "Functional/PCCase", "Sub-assembly transform affects only its component group", "setSubAssemblyTransform('front_panel',{translation:[0,0,0.32]}); compare world translations before/after", "exactly the 7 front_panel parts change; the other 6 are unchanged", ENV, async () => {
      const o = await cdp.fn(() => { const A = Module1WebGL; A.resetScene(); A.setAutoRotate(false); const a = A.getPCCaseParts(); A.setSubAssemblyTransform("front_panel", { translation: [0, 0, 0.32] }); const b = A.getPCCaseParts();
        const moved = a.filter((p, i) => Math.hypot(b[i].worldMatrix[12] - p.worldMatrix[12], b[i].worldMatrix[13] - p.worldMatrix[13], b[i].worldMatrix[14] - p.worldMatrix[14]) > 1e-4).map((p) => p.id);
        const expected = a.filter((p) => p.subAssembly === "front_panel").map((p) => p.id); A.resetScene(); return { moved, expected }; });
      return { ok: o.moved.length === 7 && JSON.stringify(o.moved.sort()) === JSON.stringify(o.expected.sort()), observed: o };
    });
    await test("FN-P4", "Functional/PCCase", "Individual part transform affects only the selected part", "setPartTransform('power_button',{translation:[0.14,0.6,0.6]}); compare all parts", "only power_button's worldMatrix changes", ENV, async () => {
      const o = await cdp.fn(() => { const A = Module1WebGL; A.resetScene(); A.setAutoRotate(false); const a = A.getPCCaseParts(); A.setPartTransform("power_button", { translation: [0.14, 0.6, 0.6] }); const b = A.getPCCaseParts();
        const changed = a.filter((p, i) => p.worldMatrix.some((v, k) => Math.abs(v - b[i].worldMatrix[k]) > 1e-6)).map((p) => p.id); A.resetScene(); return { changed }; });
      return { ok: o.changed.length === 1 && o.changed[0] === "power_button", observed: o };
    });
    await test("FN-P5", "Functional/PCCase", "Component visibility changes draw-call count", "Hide side_glass_panel, then group 'accent', then restore all", "draws 13 → 12 → 10 → 13", ENV, async () => {
      const o = await cdp.fn(() => { const A = Module1WebGL; A.resetScene(); const r = []; r.push(A.getDiagnostics().drawCallsPerFrame); A.setPartVisibility("side_glass_panel", false); A.sampleCenterPixel(); r.push(A.getDiagnostics().drawCallsPerFrame); A.setPartVisibility("accent", false); A.sampleCenterPixel(); r.push(A.getDiagnostics().drawCallsPerFrame); A.setPartVisibility("all", true); A.sampleCenterPixel(); r.push(A.getDiagnostics().drawCallsPerFrame); return r; });
      return { ok: JSON.stringify(o) === "[13,12,10,13]", observed: { drawCallSequence: o } };
    });
    await test("FN-P6", "Functional/PCCase", "Colour customisation changes GPU output, then Reset restores defaults", "setPartColor('all','#ff0000') and sample pixel; then resetScene() and compare all parts with the initial snapshot", "R-dominant pixel at screen centre after change; after reset every part's id/transform/visibility/colour equals the snapshot", ENV, async () => {
      const o = await cdp.fn(() => { const A = Module1WebGL; A.resetScene(); A.setAutoRotate(false); const snap = A.getPCCaseParts().map((p) => ({ id: p.id, t: p.localTranslation, r: p.localRotationDeg, s: p.localScale, v: p.visible, c: p.color.map((x) => +x.toFixed(4)) }));
        A.setPartColor("all", "#ff0000"); A.setPartTransform("top_shroud", { translation: [0, 0.9, 0] }); A.setSubAssemblyTransform("side_panel", { translation: [0.5, 0, 0] }); A.setPartVisibility("foot_front", false); const px = A.sampleCenterPixel();
        const dirty = A.getPCCaseParts().map((p) => ({ id: p.id, t: p.localTranslation, r: p.localRotationDeg, s: p.localScale, v: p.visible, c: p.color.map((x) => +x.toFixed(4)) }));
        A.resetScene(); const after = A.getPCCaseParts().map((p) => ({ id: p.id, t: p.localTranslation, r: p.localRotationDeg, s: p.localScale, v: p.visible, c: p.color.map((x) => +x.toFixed(4)) }));
        return { centerPixelAfterRed: px, redDominant: px[0] > px[1] + 20 && px[0] > px[2] + 20, changedDuringTest: JSON.stringify(snap) !== JSON.stringify(dirty), restored: JSON.stringify(snap) === JSON.stringify(after), meshMode: A.getDiagnostics().meshMode, sub: A.getPCCaseParts().length }; });
      return { ok: o.redDominant && o.changedDuringTest && o.restored && o.meshMode === "pccase", observed: o };
    });

    await test("FN-U1", "Functional/Controls", "Real DOM controls: scene selector, Auto-Rotate, Speed, Colour target/picker, Default Palette, Pause/Resume, Reset", "Drive each control through its DOM element/event and verify diagnostics + rotation rate", "each control changes the matching state; rotation rate ≈ configured speed; pause freezes frameCount; resume restarts; reset restores defaults", ENV, async () => {
      const o = await cdp.fn(async () => {
        const $ = (id) => document.getElementById(id); const ev = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true })); const A = Module1WebGL; const out = {};
        $("control-reset").click(); await __T.sleep(150);
        const rate = async () => { const a0 = A.getDiagnostics().modelParams.rotationDeg[1]; const t0 = performance.now(); await __T.sleep(600); const a1 = A.getDiagnostics().modelParams.rotationDeg[1]; const t1 = performance.now(); let d = ((a1 - a0 + 540) % 360) - 180; return d / ((t1 - t0) / 1000); };
        out.rate45 = await rate(); $("control-rotation-speed").value = "90"; ev($("control-rotation-speed"), "input"); out.speedState = A.getDiagnostics().rotationSpeedDegPerSec; out.speedLabel = $("control-speed-value").textContent; await __T.sleep(100); out.rate90 = await rate();
        $("control-auto-rotate").click(); await __T.sleep(100); const frozenA = A.getDiagnostics().modelParams.rotationDeg[1]; const f0 = A.getDiagnostics().frameCount; await __T.sleep(400); const dd = A.getDiagnostics(); out.autoRotateOff = { autoRotate: dd.autoRotate, angleDelta: +(dd.modelParams.rotationDeg[1] - frozenA).toFixed(4), framesStillAdvance: dd.frameCount > f0 };
        $("control-auto-rotate").click(); await __T.sleep(50); out.autoRotateOn = A.getDiagnostics().autoRotate;
        $("control-color-target").value = "accent"; ev($("control-color-target"), "change"); $("control-object-color").value = "#ff00ff"; ev($("control-object-color"), "input"); out.accentColors = A.getPCCaseParts().filter((p) => p.group === "accent").map((p) => p.color.map((x) => +x.toFixed(2)));
        $("control-color-palette").click(); out.paletteRestored = A.getPCCaseParts().filter((p) => p.group === "accent").map((p) => p.color.map((x) => +x.toFixed(2)));
        $("control-pause-resume").click(); await __T.sleep(100); const pf0 = A.getDiagnostics().frameCount; await __T.sleep(500); const pd = A.getDiagnostics(); out.pause = { isRunning: pd.isRunning, framesDelta: pd.frameCount - pf0, buttonText: $("control-pause-resume").textContent, animationFrameId: pd.animationFrameId };
        $("control-pause-resume").click(); await __T.sleep(400); const rd = A.getDiagnostics(); out.resume = { isRunning: rd.isRunning, framesAdvanced: rd.frameCount - pf0, buttonText: $("control-pause-resume").textContent };
        $("control-mesh-mode").value = "cube"; ev($("control-mesh-mode"), "change"); out.sceneCube = A.getDiagnostics().meshMode; $("control-reset").click(); await __T.sleep(150); const rs = A.getDiagnostics(); out.reset = { mesh: rs.meshMode, speed: rs.rotationSpeedDegPerSec, auto: rs.autoRotate, running: rs.isRunning };
        return out; });
      const ok = Math.abs(o.rate45 - 45) < 7 && Math.abs(o.rate90 - 90) < 14 && o.speedState === 90 && /90/.test(o.speedLabel) && o.autoRotateOff.autoRotate === false && Math.abs(o.autoRotateOff.angleDelta) < 0.01 && o.autoRotateOff.framesStillAdvance && o.autoRotateOn &&
        o.accentColors.every((c) => c[0] === 1 && c[1] === 0 && c[2] === 1) && !o.paletteRestored.some((c) => c[0] === 1 && c[1] === 0 && c[2] === 1) && !o.pause.isRunning && o.pause.framesDelta === 0 && o.pause.animationFrameId === null && /Resume/.test(o.pause.buttonText) && o.resume.isRunning && o.resume.framesAdvanced > 5 && /Pause/.test(o.resume.buttonText) && o.sceneCube === "cube" && o.reset.mesh === "pccase" && o.reset.speed === 45 && o.reset.auto && o.reset.running;
      return { ok, observed: o };
    });
    await test("FN-U2", "Functional/Controls", "Cube face colour via UI (target '0' = +Z) reaches the GPU", "Cube scene, target Front(+Z), colour #00ff00, sample +Z face centre", "G-dominant pixel at +Z face centre", ENV, async () => {
      const o = await cdp.fn(() => { const $ = (id) => document.getElementById(id); const ev = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true })); const A = Module1WebGL; A.resetScene(); $("control-mesh-mode").value = "cube"; ev($("control-mesh-mode"), "change"); A.setAutoRotate(false); A.setModelRotation(0, 0, 0);
        $("control-color-target").value = "0"; ev($("control-color-target"), "change"); $("control-object-color").value = "#00ff00"; ev($("control-object-color"), "input"); const n = A.projectLocalPoint([0, 0, 0.5]).ndc; const px = A.samplePixelAtNdc(n[0], n[1]); A.resetScene(); return { px }; });
      return { ok: o.px[1] > 200 && o.px[0] < 60 && o.px[2] < 60, observed: o };
    });

    // ---------------------------------------------------------------- Lifecycle
    bucket = "lifecycle-expected";
    await test("LC-1", "Lifecycle", "Unsupported-WebGL fallback (?webgl=unsupported)", "Open module with ?webgl=unsupported", "fallback overlay visible, no WebGL context created, no uncaught exceptions", ENV, async () => {
      await nav(MODULE + "?webgl=unsupported", { waitModule: false }); await sleep(500);
      const o = await cdp.fn(() => ({ overlayVisible: !document.getElementById("webgl-fallback").hidden, status: document.getElementById("status-text").textContent, hasGl: Boolean(Module1WebGL.getDiagnostics().hasWebGL2) }));
      return { ok: o.overlayVisible && !o.hasGl, observed: { ...o, uncaughtExceptions: consoleBuckets["lifecycle-expected:exceptions"] || [] } };
    });
    notTested("LC-1b", "Lifecycle", "Genuine WebGL2-less browser (not simulated)", "Disable hardware acceleration / use a browser without WebGL2", "fallback overlay", "Only the simulated URL switch (LC-1) was exercised; no real WebGL2-less environment available.");
    await nav(MODULE);
    await test("LC-2", "Lifecycle", "Shader compilation failure → error overlay → recoverable by Reset", "testShaderCompileError(undefined,false) then (undefined,true); then resetScene()", "isolated test returns ok:false + info log; applied test shows #shader-error-overlay, stops loop; resetScene() hides overlay, resumes 13 draws", ENV, async () => {
      const o = await cdp.fn(async () => { const A = Module1WebGL; const iso = A.testShaderCompileError(undefined, false); const dIso = A.getDiagnostics(); const app = A.testShaderCompileError(undefined, true); await __T.sleep(200); const dApp = A.getDiagnostics();
        const overlay = !document.getElementById("shader-error-overlay").hidden; const f0 = dApp.frameCount; await __T.sleep(300); const frozen = A.getDiagnostics().frameCount === f0; A.resetScene(); await __T.sleep(300); const dRec = A.getDiagnostics();
        return { isolatedOk: iso.ok, isolatedErrorHead: String(iso.error).slice(0, 80), sceneStillOkAfterIsolated: dIso.hasShaderProgram, appliedOk: app.ok, overlay, hasProgramAfterFail: dApp.hasShaderProgram, running: dApp.isRunning, loopFrozen: frozen, recovered: { overlayHidden: document.getElementById("shader-error-overlay").hidden, program: dRec.hasShaderProgram, draws: dRec.drawCallsPerFrame, running: dRec.isRunning } }; });
      const ok = o.isolatedOk === false && o.sceneStillOkAfterIsolated && o.appliedOk === false && o.overlay && !o.hasProgramAfterFail && !o.running && o.loopFrozen && o.recovered.overlayHidden && o.recovered.program && o.recovered.draws === 13 && o.recovered.running;
      return { ok, observed: o };
    });
    await test("LC-3", "Lifecycle", "GPU resource (buffer) allocation failure injected via gl.createBuffer override", "Override gl.createBuffer to return null on the live context; setMeshMode('triangle'); restore; resetScene()", "no uncaught exception; failure surfaced via overlay/diagnostics; loop not running without resources; recovery after restoring createBuffer + reset", ENV, async () => {
      const o = await cdp.fn(async () => { const A = Module1WebGL; const gl = document.getElementById("webgl-canvas").getContext("webgl2"); gl.createBuffer = () => null; let threw = null; try { A.setMeshMode("triangle"); } catch (e) { threw = String(e); }
        await __T.sleep(200); const d = A.getDiagnostics(); const fail = { threw, overlay: !document.getElementById("shader-error-overlay").hidden, hasVAO: d.hasVAO, hasProgram: d.hasShaderProgram, running: d.isRunning, lastErr: String(d.lastShaderError).slice(0, 100) };
        delete gl.createBuffer; A.resetScene(); await __T.sleep(300); const r = A.getDiagnostics(); return { fail, recovered: { overlayHidden: document.getElementById("shader-error-overlay").hidden, vao: r.hasVAO, draws: r.drawCallsPerFrame, running: r.isRunning, mesh: r.meshMode } }; });
      const ok = o.fail.threw === null && !o.fail.running && !o.fail.hasVAO && o.recovered.overlayHidden && o.recovered.vao && o.recovered.draws === 13 && o.recovered.running;
      return { ok, observed: o };
    });
    bucket = "lifecycle";
    await nav(MODULE);
    for (const paused of [false, true]) {
      await test(paused ? "LC-5" : "LC-4", "Lifecycle", `Context loss/restore while ${paused ? "PAUSED" : "running"} (WEBGL_lose_context)`, "Customise (colour, sub-assembly, speed 90); loseContext(); restoreContext(); compare state & counters", "loop stops + overlay on loss; on restore GPU resources rebuilt (compile/alloc +1) and the user's pause/run preference, colour, sub-assembly and speed are preserved; no duplicate loop", ENV, async () => {
        await nav(MODULE);
        const o = await cdp.fn(async (paused) => { const A = Module1WebGL; A.setRotationSpeed(90); A.setPartColor("accent", "#ff00ff"); A.setSubAssemblyTransform("front_panel", { translation: [0, 0, 0.2] }); if (paused) A.pauseLoop(); await __T.sleep(200);
          const before = A.getDiagnostics(); const lost = A.simulateContextLoss(); await __T.sleep(250); const mid = A.getDiagnostics(); const overlayOn = !document.getElementById("context-lost-overlay").hidden; const restored = A.simulateContextRestore(); await __T.sleep(500); const after = A.getDiagnostics(); const overlayOff = document.getElementById("context-lost-overlay").hidden;
          const ratio = paused ? null : await __T.loopRatio(window, 1500); const sub = A.getPCCaseParts().find((p) => p.id === "front_bezel"); const acc = A.getPCCaseParts().find((p) => p.id === "power_button").color.map((x) => +x.toFixed(2));
          return { lost, restored, overlayOn, overlayOff, mid: { lost: mid.isContextLost, running: mid.isRunning, program: mid.hasShaderProgram, afId: mid.animationFrameId }, counters: { compilesBefore: before.shaderCompileCount, compilesAfter: after.shaderCompileCount, allocsBefore: before.geometryAllocCount, allocsAfter: after.geometryAllocCount }, after: { running: after.isRunning, program: after.hasShaderProgram, vao: after.hasVAO, draws: after.drawCallsPerFrame, speed: after.rotationSpeedDegPerSec, mesh: after.meshMode, framesAdvanced: after.frameCount - before.frameCount }, preserved: { accentColour: acc, frontBezelZ: +sub.worldMatrix[14].toFixed(3) }, loopRatio: ratio }; }, paused);
        const ok = o.lost && o.restored && o.overlayOn && o.overlayOff && o.mid.lost && !o.mid.running && !o.mid.program && o.mid.afId === null && o.counters.compilesAfter === o.counters.compilesBefore + 1 && o.counters.allocsAfter === o.counters.allocsBefore + 1 && o.after.program && o.after.vao && o.after.draws === 13 && o.after.speed === 90 && o.preserved.accentColour[0] === 1 && o.preserved.accentColour[1] === 0 &&
          (paused ? !o.after.running : o.after.running && o.loopRatio.ratio > 0.9 && o.loopRatio.ratio < 1.1);
        return { ok, observed: o };
      });
    }
    await test("LC-6", "Lifecycle", "Scene switching: resource reuse vs rebuild (counters)", "Record shaderCompileCount/geometryAllocCount across pccase→cube→pccase→triangle→pccase", "pccase↔cube reuse (Δ=0); switching to/from triangle rebuilds (observed Δ recorded)", ENV, async () => {
      await nav(MODULE);
      const o = await cdp.fn(() => { const A = Module1WebGL; const c = () => { const d = A.getDiagnostics(); return [d.shaderCompileCount, d.geometryAllocCount, d.drawCallsPerFrame, d.meshMode]; }; const seq = [["start", c()]]; for (const m of ["cube", "pccase", "triangle", "pccase"]) { A.setMeshMode(m); seq.push([m, c()]); } return seq; });
      const get = (n, i = 0) => o.filter((s) => s[0] === n).map((s) => s[1]);
      const ok = o[1][1][0] === o[0][1][0] && o[1][1][1] === o[0][1][1] && o[2][1][0] === o[0][1][0] && o[2][1][1] === o[0][1][1] && o[3][1][1] > o[2][1][1] && o[4][1][2] === 13;
      return { ok, observed: { sequence_compiles_allocs_draws_mode: o } };
    });
    await test("LC-7", "Lifecycle", "No duplicate rAF loops after stress (30 pause/resume, 30 scene switches, 10 resets)", "Stress calls then measure loopRatio over 2 s", "ratio ≈ 1.0; single animationFrameId", ENV, async () => {
      const o = await cdp.fn(async () => { const A = Module1WebGL; for (let i = 0; i < 30; i++) { A.pauseLoop(); A.resumeLoop(); } const ms = ["pccase", "cube", "triangle"]; for (let i = 0; i < 30; i++) A.setMeshMode(ms[i % 3]); for (let i = 0; i < 10; i++) A.resetScene(); await __T.sleep(200); const r = await __T.loopRatio(window, 2000); return { ...r, afId: A.getDiagnostics().animationFrameId !== null }; });
      return { ok: o.ratio > 0.9 && o.ratio < 1.1 && o.afId, observed: o };
    });
    notTested("LC-8", "Lifecycle", "GPU memory / leak measurement", "Requires vendor GPU profiler or browser task manager over long runs", "stable GPU memory over repeated create/destroy cycles", "No GPU-memory instrument was used. Counters (shaderCompileCount, geometryAllocCount) count JS-side API calls only and cannot prove absence of leaks.");

    // ---------------------------------------------------------------- Responsive & DPR (standalone)
    bucket = "responsive";
    const VPS = [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [375, 667], [320, 568]];
    const respRows = [];
    for (const dpr of [1, 1.5, 2, 3]) for (const [w, h] of VPS) {
      await nav(MODULE, { vp: [w, h, dpr, w <= 480] });
      const r = await cdp.fn(() => { const wn = window; const A = Module1WebGL; A.setAutoRotate(false); const d = A.getDiagnostics(); const gl = document.getElementById("webgl-canvas").getContext("webgl2"); const vp = Array.from(gl.getParameter(gl.VIEWPORT)); const P = d.matrices.projectionMatrix; const bb = __T.bbox(wn); const cv = document.getElementById("webgl-canvas");
        return { dpr: wn.devicePixelRatio, css: [d.cssWidth, d.cssHeight], bufferAttr: [cv.width, cv.height], drawingBuffer: [d.drawingBufferWidth, d.drawingBufferHeight], effDpr: d.effectiveDpr, viewport: vp, projAspect: +(P[5] / P[0]).toFixed(4), bufAspect: +(d.drawingBufferWidth / d.drawingBufferHeight).toFixed(4), layout: __T.layout(wn), pcCaseHeightFrac: +bb.heightFrac.toFixed(3), pcCaseWidthFrac: +bb.widthFrac.toFixed(3), litPixels: bb.litPixels }; });
      r.vpReq = `${w}x${h}`; respRows.push(r);
      if (dpr === 1 && (w === 390 || w === 320 || w === 1920)) await shot(`standalone-${w}x${h}`);
    }
    await test("RS-1", "Responsive/DPR", "Canvas CSS size, drawing buffer, viewport, aspect, DPR cap across 8 viewports × DPR {1,1.5,2,3} (fresh loads)", "For each combination read canvas CSS size, buffer size, gl.VIEWPORT, projection aspect (P[5]/P[0]), horizontal overflow, PC Case bounding box", "buffer = round(css × min(max(dpr,1),2)); viewport = [0,0,buffer]; projection aspect = buffer aspect (±0.01); no horizontal overflow; PC Case lit pixels > 0", ENV, async () => {
      const bad = respRows.filter((r) => { const k = Math.min(Math.max(r.dpr, 1), 2); const eb = [Math.round(r.css[0] * k), Math.round(r.css[1] * k)]; return !(r.drawingBuffer[0] === eb[0] && r.drawingBuffer[1] === eb[1] && r.viewport[2] === r.drawingBuffer[0] && r.viewport[3] === r.drawingBuffer[1] && Math.abs(r.projAspect - r.bufAspect) < 0.01 && r.layout.hScrollOverflowPx === 0 && r.litPixels > 0); });
      return { ok: bad.length === 0, observed: { combinationsTested: respRows.length, violations: bad, table: respRows.map((r) => ({ vp: r.vpReq, dpr: r.dpr, css: r.css.join("x"), buffer: r.drawingBuffer.join("x"), effDpr: r.effDpr, aspect: r.bufAspect, projAspect: r.projAspect, instrumentBarH: r.layout.instrumentBarH, controlPanelH: r.layout.controlPanelH, canvasStageH: r.layout.canvasStageH, controlsOutsideViewport: r.layout.controlsOutsideViewport, pcCaseHeightFrac: r.pcCaseHeightFrac, pcCaseWidthFrac: r.pcCaseWidthFrac })) } };
    });
    await test("RS-2", "Responsive/DPR", "Live resize (no reload) tracks container, viewport and aspect", "On one loaded page sweep the 8 viewports (DPR 1) via emulation resize; read state after each", "buffer == css at DPR 1; viewport == buffer; projection aspect == buffer aspect; canvas non-blank", ENV, async () => {
      await nav(MODULE, { vp: [1920, 1080, 1, false] }); const rows = [];
      for (const [w, h] of VPS.concat([[1280, 800]])) { await setVp(w, h, 1, w <= 480); await sleep(350); rows.push(await cdp.fn(() => { const A = Module1WebGL; const d = A.getDiagnostics(); const gl = document.getElementById("webgl-canvas").getContext("webgl2"); const P = d.matrices.projectionMatrix; const bb = __T.bbox(window); return { css: [d.cssWidth, d.cssHeight], buf: [d.drawingBufferWidth, d.drawingBufferHeight], vp: Array.from(gl.getParameter(gl.VIEWPORT)), aspectErr: +Math.abs(P[5] / P[0] - d.drawingBufferWidth / d.drawingBufferHeight).toFixed(4), lit: bb.litPixels }; })); }
      const ok = rows.every((r) => r.buf[0] === r.css[0] && r.buf[1] === r.css[1] && r.vp[2] === r.buf[0] && r.vp[3] === r.buf[1] && r.aspectErr < 0.01 && r.lit > 0); return { ok, observed: rows };
    });
    const narrow = respRows.filter((r) => r.dpr === 1 && r.css[0] <= 400);
    rec({ id: "RS-3", category: "Responsive/DPR", name: "Narrow-viewport usability (measured, standalone DPR 1)", env: ENV, procedure: "Measure instrument bar, control panel and canvas heights at 390x844, 375x667, 320x568; check PC Case bbox and controls inside viewport",
      expected: "Controls reachable (no horizontal overflow, none outside viewport); PC Case lit area present. Canvas height is recorded as a limitation indicator", observed: narrow.map((r) => ({ vp: r.vpReq, instrumentBarH: r.layout.instrumentBarH, controlPanelH: r.layout.controlPanelH, canvasH: r.layout.canvasStageH, canvasFracOfViewport: +(r.layout.canvasStageH / r.layout.innerH).toFixed(3), controlsOutsideViewport: r.layout.controlsOutsideViewport, pcCaseHeightFracOfCanvas: r.pcCaseHeightFrac })),
      status: narrow.every((r) => r.layout.hScrollOverflowPx === 0 && r.layout.controlsOutsideViewport.length === 0 && r.litPixels > 0) ? "Passed" : "Failed" });

    // ---------------------------------------------------------------- Portal integration
    bucket = "portal";
    const frameInfo = () => cdp.fn(async () => { const f = document.getElementById("module-iframe"); const w = f.contentWindow; const d = __T.d(w); return { src: f.getAttribute("src"), overlayLoadingHidden: document.getElementById("module-frame-loading").hidden, overlayErrorHidden: document.getElementById("module-frame-error").hidden, hash: location.hash, hasWebGL2: d.hasWebGL2, frameCount: d.frameCount, status: w.document.getElementById("status-text").textContent, draws: d.drawCallsPerFrame, canvas: [d.cssWidth, d.cssHeight, d.drawingBufferWidth, d.drawingBufferHeight] }; });
    await test("PI-1", "Portal", "Direct #/module1: iframe load event vs WebGL initialisation vs first rendered frames", "Open /index.html#/module1 @1440x900; record time to iframe load and to frameCount>2; check overlays", "iframe src ./modules/module1-webgl/index.html; loading/error overlays hidden; WebGL active; frames advancing; 13 draws", ENV, async () => {
      await nav(PORTAL + "#/module1", { vp: [1440, 900, 1, false], waitModule: false });
      const t = await cdp.fn(async () => { const t0 = performance.now(); const f = document.getElementById("module-iframe"); let loadAt = null; let rendered = null; for (let i = 0; i < 100; i++) { const w = f.contentWindow; try { if (loadAt === null && w.document.readyState === "complete") loadAt = Math.round(performance.now() - t0); if (w.Module1WebGL && w.Module1WebGL.getDiagnostics().frameCount > 2) { rendered = Math.round(performance.now() - t0); break; } } catch { /* not ready */ } await __T.sleep(50); } return { loadAtMsAfterScript: loadAt, firstFramesAtMs: rendered }; });
      await sleep(400); const o = await frameInfo(); const ok = /module1-webgl\/index\.html$/.test(o.src) && o.overlayLoadingHidden && o.overlayErrorHidden && o.hasWebGL2 && o.frameCount > 2 && o.draws === 13 && /Active/.test(o.status); return { ok, observed: { ...o, timing: t } };
    });
    await shot("portal-module1-1440x900");
    await test("PI-2", "Portal", "Overview → Module 1 via sidebar link", "Open index.html (#/), click .nav-item[data-nav-route='#/module1']", "hash becomes #/module1; module view shown; WebGL active in iframe", ENV, async () => {
      await nav(PORTAL, { vp: [1440, 900, 1, false], waitModule: false }); await sleep(300);
      const o0 = await cdp.fn(() => ({ overviewVisible: !document.getElementById("overview-view").hidden, moduleViewHidden: document.getElementById("module-view").hidden }));
      await cdp.fn(() => document.querySelector(".nav-item[data-nav-route='#/module1']").click()); await waitReady(10000); await sleep(400);
      const o = await frameInfo(); const mv = await cdp.fn(() => !document.getElementById("module-view").hidden); return { ok: o0.overviewVisible && o0.moduleViewHidden && o.hash === "#/module1" && mv && o.hasWebGL2 && o.frameCount > 2 && o.draws === 13, observed: { before: o0, after: o } };
    });
    await test("PI-3", "Portal", "Module 1 → Module 2 → Module 1: teardown (pagehide/destroy) and fresh single-loop re-entry", "Install pagehide spy in module doc; click Module 2 then Module 1 links; inspect spy and new document", "old document received pagehide and destroyed GPU resources/loop (no program, no rAF id); new document fresh (compile=1), single loop ratio ≈ 1", ENV, async () => {
      await cdp.fn(() => { const w = __T.win(); window.__spy = []; w.addEventListener("pagehide", () => { const d = w.Module1WebGL.getDiagnostics(); window.__spy.push({ persisted: false, program: d.hasShaderProgram, vao: d.hasVAO, afId: d.animationFrameId, running: d.isRunning }); }); window.__oldDoc = w.document; });
      await cdp.fn(() => document.querySelector(".nav-item[data-nav-route='#/module2']").click()); await sleep(900);
      const mid = await cdp.fn(() => ({ hash: location.hash, iframeSrc: document.getElementById("module-iframe").getAttribute("src"), spy: window.__spy }));
      await cdp.fn(() => document.querySelector(".nav-item[data-nav-route='#/module1']").click()); await waitReady(10000); await sleep(500);
      const o = await cdp.fn(async () => { const w = __T.win(); const d = __T.d(w); const r = await __T.loopRatio(w, 1500); return { newDocIsDifferent: w.document !== window.__oldDoc, compiles: d.shaderCompileCount, allocs: d.geometryAllocCount, draws: d.drawCallsPerFrame, loopRatio: r.ratio, hash: location.hash }; });
      const s = mid.spy[0]; const ok = mid.spy.length === 1 && s && !s.program && !s.vao && s.afId === null && !s.running && /module2/.test(mid.iframeSrc) && o.newDocIsDifferent && o.compiles === 1 && o.allocs === 1 && o.draws === 13 && o.loopRatio > 0.9 && o.loopRatio < 1.1; return { ok, observed: { whileOnModule2: mid, afterReturn: o } };
    });
    await test("PI-4", "Portal", "Module Reload button", "Click #module-reload-btn; inspect the new document", "iframe reloads (new window object, frameCount restarts, compile=1), WebGL active, single loop", ENV, async () => {
      await cdp.fn(() => { window.__beforeDoc = __T.win().document; window.__f0 = __T.d(__T.win()).frameCount; document.getElementById("module-reload-btn").click(); }); await sleep(300); await waitReady(10000); await sleep(400);
      const o = await cdp.fn(async () => { const w = __T.win(); const d = __T.d(w); const r = await __T.loopRatio(w, 1500); return { newDocIsDifferent: w.document !== window.__beforeDoc, framesBefore: window.__f0, compiles: d.shaderCompileCount, draws: d.drawCallsPerFrame, loopRatio: r.ratio, overlays: [document.getElementById("module-frame-loading").hidden, document.getElementById("module-frame-error").hidden] }; });
      return { ok: o.newDocIsDifferent && o.compiles === 1 && o.draws === 13 && o.loopRatio > 0.9 && o.loopRatio < 1.1 && o.overlays[0] && o.overlays[1], observed: o };
    });
    await test("PI-5", "Portal", "Hidden-iframe behaviour: leave module route to Overview (iframe kept alive) and return", "Click Overview; sample module frameCount/canvas for 1 s while hidden; click Module 1 again", "Observation test: records whether frames continue while hidden, the canvas size while hidden and that rendering/size recover on return", ENV, async () => {
      const hid = await cdp.fn(async () => { document.querySelector(".nav-item[data-nav-route='#/']").click(); await __T.sleep(400); const w = __T.win(); const a = __T.d(w); await __T.sleep(1000); const b = __T.d(w); return { hash: location.hash, moduleViewHidden: document.getElementById("module-view").hidden, framesWhileHidden: b.frameCount - a.frameCount, canvasWhileHidden: [b.cssWidth, b.cssHeight, b.drawingBufferWidth, b.drawingBufferHeight], isRunning: b.isRunning, afId: b.animationFrameId !== null }; });
      await cdp.fn(() => document.querySelector(".nav-item[data-nav-route='#/module1']").click()); await sleep(900);
      const back = await cdp.fn(async () => { const w = __T.win(); const d = __T.d(w); const bb = __T.bbox(w); const r = await __T.loopRatio(w, 1200); return { canvas: [d.cssWidth, d.cssHeight, d.drawingBufferWidth, d.drawingBufferHeight], litPixels: bb.litPixels, bboxHeightFrac: +bb.heightFrac.toFixed(3), loopRatio: r.ratio, newDocument: d.shaderCompileCount }; });
      const ok = back.canvas[0] > 300 && back.canvas[1] > 200 && back.litPixels > 0 && back.loopRatio > 0.9 && back.loopRatio < 1.1; return { ok, observed: { whileHidden: hid, afterReturn: back } };
    });
    await test("PI-6", "Portal", "Desktop sidebar collapse/expand keeps aspect ratio and rendering", "At 1440x900 click #sidebar-collapse-btn twice; read iframe canvas CSS size/buffer/aspect each time", "canvas width grows when collapsed and shrinks back; buffer == css (DPR 1); projection aspect tracks width/height; PC Case still lit", ENV, async () => {
      const read = () => cdp.fn(() => { const w = __T.win(); const d = __T.d(w); const P = d.matrices.projectionMatrix; const bb = __T.bbox(w); return { collapsed: document.body.classList.contains("is-sidebar-collapsed"), canvasCss: [d.cssWidth, d.cssHeight], buffer: [d.drawingBufferWidth, d.drawingBufferHeight], aspectBuffer: +(d.drawingBufferWidth / d.drawingBufferHeight).toFixed(4), aspectProj: +(P[5] / P[0]).toFixed(4), lit: bb.litPixels }; });
      await cdp.fn(() => { document.getElementById("sidebar-collapse-btn").getAttribute("aria-expanded") === "false" && document.getElementById("sidebar-collapse-btn").click(); }); await sleep(600); const a = await read();
      await cdp.fn(() => document.getElementById("sidebar-collapse-btn").click()); await sleep(700); const b = await read(); await shot("portal-sidebar-collapsed-1440x900");
      await cdp.fn(() => document.getElementById("sidebar-collapse-btn").click()); await sleep(700); const c = await read();
      const ok = !a.collapsed && b.collapsed && !c.collapsed && b.canvasCss[0] > a.canvasCss[0] && c.canvasCss[0] === a.canvasCss[0] && [a, b, c].every((r) => r.buffer[0] === r.canvasCss[0] && Math.abs(r.aspectBuffer - r.aspectProj) < 0.01 && r.lit > 0); return { ok, observed: { expanded: a, collapsed: b, expandedAgain: c } };
    });
    await test("PI-7", "Portal", "Mobile drawer open/close (390x844) and canvas after close", "Set 390x844 mobile emulation; click #menu-toggle-btn; verify #sidebar.is-open; close via #sidebar-close-btn and via Escape; read canvas", "drawer opens/closes (button + Escape); module canvas stays valid and rendering", ENV, async () => {
      await nav(PORTAL + "#/module1", { vp: [390, 844, 1, true], waitModule: true }); await sleep(500);
      const o = await cdp.fn(async () => { const sb = document.getElementById("sidebar"); const out = {}; document.getElementById("menu-toggle-btn").click(); await __T.sleep(450); out.opened = sb.classList.contains("is-open"); document.getElementById("sidebar-close-btn").click(); await __T.sleep(450); out.closedByButton = !sb.classList.contains("is-open");
        document.getElementById("menu-toggle-btn").click(); await __T.sleep(450); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await __T.sleep(450); out.closedByEscape = !sb.classList.contains("is-open");
        const w = __T.win(); const d = __T.d(w); const bb = __T.bbox(w); out.canvas = [d.cssWidth, d.cssHeight, d.drawingBufferWidth, d.drawingBufferHeight]; out.lit = bb.litPixels; out.pcCaseHeightFrac = +bb.heightFrac.toFixed(3); out.layoutInsideIframe = __T.layout(w); out.iframeCss = [document.getElementById("module-iframe").clientWidth, document.getElementById("module-iframe").clientHeight]; return out; });
      await shot("portal-mobile-390x844"); return { ok: o.opened && o.closedByButton && o.closedByEscape && o.lit > 0 && o.layoutInsideIframe.hScrollOverflowPx === 0, observed: o };
    });
    await test("PI-8", "Portal", "Refresh while #/module1 is active", "Page.reload on #/module1 @1440x900", "route preserved; iframe reloaded; WebGL active again", ENV, async () => {
      await setVp(1440, 900, 1, false); const loaded = new Promise((r) => loadWaiters.push(r)); await cdp.send("Page.reload"); await Promise.race([loaded, sleep(15000)]); await cdp.send("Runtime.evaluate", { expression: `(${pageHelpers.toString()})()` }); await waitReady(10000); await sleep(500);
      const o = await frameInfo(); const mv = await cdp.fn(() => !document.getElementById("module-view").hidden); return { ok: o.hash === "#/module1" && mv && o.hasWebGL2 && o.frameCount > 2 && o.draws === 13, observed: o };
    });
    await test("PI-9", "Portal", "Viewport sweep inside the Portal (iframe canvas dimensions)", "Resize through the 8 viewports on #/module1 and read the iframe canvas", "canvas non-trivial and buffer == css at DPR 1; PC Case lit; no horizontal overflow in iframe document", ENV, async () => {
      const rows = []; for (const [w, h] of VPS) { await setVp(w, h, 1, w <= 480); await sleep(500); rows.push({ vp: `${w}x${h}`, ...(await cdp.fn(() => { const wn = __T.win(); const d = __T.d(wn); const bb = __T.bbox(wn); const f = document.getElementById("module-iframe"); return { iframe: [f.clientWidth, f.clientHeight], canvasCss: [d.cssWidth, d.cssHeight], buffer: [d.drawingBufferWidth, d.drawingBufferHeight], lit: bb.litPixels, pcCaseHeightFrac: +bb.heightFrac.toFixed(3), hOverflow: __T.layout(wn).hScrollOverflowPx, controlsOutside: __T.layout(wn).controlsOutsideViewport }; })) }); }
      return { ok: rows.every((r) => r.buffer[0] === r.canvasCss[0] && r.lit > 0 && r.hOverflow === 0 && r.controlsOutside.length === 0), observed: rows };
    });
    notTested("PI-10", "Portal", "Portal under GitHub Pages sub-path hosting", "Serve from /<repo>/ prefix on a real GitHub Pages deployment", "relative paths resolve under the repository URL", "Phase 8 (deployment) is out of scope for Task 3.6; only a root-path local HTTP server (127.0.0.1) was used. Source paths are relative (./ and ../).");

    // ---------------------------------------------------------------- Performance observations (standalone, 1280x800, DPR 1)
    bucket = "performance";
    const perf = {};
    for (const mode of ["triangle", "cube", "pccase"]) {
      await nav(MODULE, { vp: [1280, 800, 1, false] });
      perf[mode] = await cdp.fn(async (mode) => { const A = Module1WebGL; A.setMeshMode(mode); A.setAutoRotate(true); await __T.sleep(400); const ratio = await __T.loopRatio(window, 3000); const d = A.getDiagnostics();
        const N = 200; let t0 = performance.now(); for (let i = 0; i < N; i++) A.stepAnimationBySeconds(1 / 60); const submitMs = (performance.now() - t0) / N;
        t0 = performance.now(); for (let i = 0; i < N; i++) A.sampleCenterPixel(); const finishMs = (performance.now() - t0) / N;
        return { drawCalls: d.drawCallsPerFrame, vertices: d.vertexCount, indices: d.indexCount, vboBytes: d.vboByteLength, eboBytes: d.eboByteLength, buffer: [d.drawingBufferWidth, d.drawingBufferHeight], rafMeanIntervalMs: +ratio.meanIntervalMs?.toFixed(2), rafP95IntervalMs: +ratio.p95IntervalMs?.toFixed(2), rafMaxIntervalMs: +ratio.maxIntervalMs?.toFixed(2), framesIn3s: ratio.stateFrames, cpuUpdateSubmitMsPerFrame: +submitMs.toFixed(3), cpuSubmitPlusReadPixelsMsPerFrame: +finishMs.toFixed(3) }; }, mode);
    }
    const timer = await cdp.fn(async () => { const gl = document.getElementById("webgl-canvas").getContext("webgl2"); const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2"); if (!ext) return { available: false }; const A = Module1WebGL; const out = []; for (const m of ["triangle", "cube", "pccase"]) { A.setMeshMode(m); const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); A.stepAnimationBySeconds(0.016); gl.endQuery(ext.TIME_ELAPSED_EXT); let t = 0; for (let i = 0; i < 200; i++) { if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) t = gl.getQueryParameter(q, gl.QUERY_RESULT); break; } await __T.sleep(10); } out.push({ mode: m, gpuNs: t }); } A.resetScene(); return { available: true, out }; });
    perf.timerQuery = timer;
    rec({ id: "PF-1", category: "Performance", name: "Per-mode measurements (1280x800, DPR 1, 3 s rAF window + 200-iteration CPU loops)", env: ENV + `; WebGL renderer: ${env.renderer}`, procedure: "setMeshMode(mode); independent rAF interval statistics; average CPU time of 200 × stepAnimationBySeconds (JS update + draw submission + telemetry DOM write) and 200 × sampleCenterPixel (draw submission + synchronous readPixels, which forces the GPU/driver to finish the frame)",
      expected: "Recorded values only (no pass threshold): used to compare modes and to show measurement limits", observed: perf, status: "Passed" });
    rec({ id: "PF-2", category: "Performance", name: "EXT_disjoint_timer_query_webgl2 GPU timing", env: ENV, procedure: "Wrap one frame in a TIME_ELAPSED query for each mode", expected: "GPU nanoseconds if the extension exists", observed: timer.available ? timer : "Extension not available in this headless environment", status: timer.available ? "Passed" : "Not Tested" });

    // ---------------------------------------------------------------- Final bookkeeping
    bucket = "done";
    const expectedBuckets = new Set(["lifecycle-expected", "lifecycle-expected:exceptions", "lifecycle-expected:log"]);
    const unexpected = Object.fromEntries(Object.entries(consoleBuckets).filter(([k]) => !expectedBuckets.has(k) && !k.endsWith(":log")));
    const unexpectedLog = Object.fromEntries(Object.entries(consoleBuckets).filter(([k]) => k.endsWith(":log") && !expectedBuckets.has(k)).map(([k, v]) => [k, v.filter((s) => !/favicon/.test(s))]).filter(([, v]) => v.length));
    rec({ id: "CE-1", category: "Console", name: "No unexpected console errors / uncaught exceptions during all non-fault-injection phases", env: ENV, procedure: "Collected Runtime.consoleAPICalled(error), Runtime.exceptionThrown and Log.entryAdded(error) per phase", expected: "empty (fault-injection phase 'lifecycle-expected' excluded; favicon.ico excluded)", observed: { unexpected, unexpectedLog, expectedFaultInjectionOutput: Object.fromEntries(Object.entries(consoleBuckets).filter(([k]) => expectedBuckets.has(k))), httpErrors: netIssues.filter((n) => !/favicon/.test(n.url)), faviconRequests: netIssues.filter((n) => /favicon/.test(n.url)).length }, status: Object.keys(unexpected).length === 0 && Object.keys(unexpectedLog).length === 0 && netIssues.filter((n) => !/favicon/.test(n.url)).length === 0 ? "Passed" : "Failed" });

    const summary = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
    fs.writeFileSync(path.join(HERE, `task3.6-results-${label}.json`), JSON.stringify({ environment, summary, results }, null, 2));
    console.log("SUMMARY", label, JSON.stringify(summary));
  } finally {
    try { cdp?.close(); } catch { /* ignore */ }
    proc.kill(); server.close();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch((e) => { console.error("HARNESS FAILURE", e); process.exit(1); });
