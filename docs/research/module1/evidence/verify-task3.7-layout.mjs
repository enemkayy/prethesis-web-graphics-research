import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userDataDir = path.join(os.tmpdir(), "chrome-layout-verif-" + Date.now());
const evidenceDir = path.join(ROOT, "docs", "research", "module1", "evidence");

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const dbg = 9570;
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${dbg}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--enable-webgl",
    "--window-size=1280,800",
    "about:blank",
  ], { stdio: "ignore" });

  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await new Promise((r) => setTimeout(r, 200));
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          ws.removeEventListener("message", handler);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send("Page.enable");
  await send("Page.navigate", {
    url: `http://127.0.0.1:${port}/modules/module1-webgl/index.html`,
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Required Viewports per Spec
  const viewports = [
    { name: "Desktop High-Res", w: 1440, h: 900 },
    { name: "Laptop Standard", w: 1280, h: 800 },
    { name: "Tablet Landscape", w: 1024, h: 768 },
    { name: "Tablet Portrait", w: 768, h: 1024 },
    { name: "Mobile iPhone 14", w: 390, h: 844 },
    { name: "Mobile iPhone SE", w: 375, h: 667 },
    { name: "Small Mobile", w: 320, h: 568 },
  ];

  console.log("=== RUNNING DETAILED TASK 3.7 LAYOUT MEASUREMENTS ===");

  const results = [];
  for (const vp of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.w,
      height: vp.h,
      deviceScaleFactor: 1,
      mobile: vp.w <= 480,
    });
    await new Promise((r) => setTimeout(r, 150));

    const evalResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const getBox = el => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
        };

        const doc = document;
        const row1 = doc.querySelector('.telemetry-row--config');
        const row2 = doc.querySelector('.telemetry-row--diagnostics');
        const geometry = doc.getElementById('telemetry-geometry');
        const geomItem = geometry ? geometry.closest('.telemetry-item') : null;
        const rotation = doc.getElementById('telemetry-rotation');
        const rotItem = rotation ? rotation.closest('.telemetry-item') : null;
        const frames = doc.getElementById('telemetry-frames');
        const framesItem = frames ? frames.closest('.telemetry-item') : null;

        const row1Box = getBox(row1);
        const row2Box = getBox(row2);
        const geomBox = getBox(geomItem);
        const rotBoxShort = getBox(rotItem);

        // Test Rotation jump: short (77°) vs long (-170°)
        rotation.textContent = '(  18°,   77°,    0°)';
        const rotBox77 = getBox(rotItem);
        rotation.textContent = '(  18°, -170°,    0°)';
        const rotBox170 = getBox(rotItem);

        // Test Frames jump: 3 digits vs 8 digits
        frames.textContent = '999';
        const framesBox3 = getBox(framesItem);
        const row2Box3 = getBox(row2);

        frames.textContent = '99999999';
        const framesBox8 = getBox(framesItem);
        const row2Box8 = getBox(row2);

        // Restore
        rotation.textContent = '(  18°,  -28°,   0°)';
        frames.textContent = '120';

        // Telemetry Row positions: check if Geometry is in Row 1 and Rotation/Frames in Row 2
        const geomInRow1 = geomBox && row1Box && Math.abs(geomBox.top - row1Box.top) < 15;
        const rotInRow2 = rotBox170 && row2Box && Math.abs(rotBox170.top - row2Box.top) < 15;
        const framesInRow2 = framesBox8 && row2Box && Math.abs(framesBox8.top - row2Box.top) < 15;

        // Distinct desktop rows check
        const distinctDesktopRows = row1Box && row2Box && row2Box.top >= row1Box.bottom;

        // Control Panel
        const primary = doc.querySelector('.control-panel__primary');
        const actions = doc.querySelector('.control-panel__actions');
        const scene = doc.querySelector('.control-item--scene');
        const speed = doc.querySelector('.control-item--speed');
        const target = doc.querySelector('.control-item--target');
        const palette = doc.getElementById('control-color-palette');
        const pauseBtn = doc.getElementById('control-pause-resume');
        const resetBtn = doc.getElementById('control-reset');

        const primBox = getBox(primary);
        const actBox = getBox(actions);
        const sceneBox = getBox(scene);
        const speedBox = getBox(speed);
        const targetBox = getBox(target);
        const palBox = getBox(palette);
        const pauseBox = getBox(pauseBtn);
        const resetBox = getBox(resetBtn);

        // Check if primary controls row has gap after Default Palette
        // In desktop, Default Palette should sit near the right edge of primary row
        const gapAfterDefaultPalette = primBox && palBox ? Math.round(primBox.right - palBox.right) : null;

        // Actions row right alignment check on desktop
        const actionsRightAligned = actBox && resetBox ? Math.abs(actBox.right - resetBox.right) < 5 : false;

        // Check horizontal overflow
        const hScrollOverflow = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);

        return {
          viewport: "${vp.name} (${vp.w}x${vp.h})",
          w: ${vp.w},
          h: ${vp.h},
          telemetry: {
            geomInRow1,
            rotInRow2,
            framesInRow2,
            distinctDesktopRows,
            row1Height: row1Box ? row1Box.height : null,
            row2Height: row2Box ? row2Box.height : null,
            rotationJumping: rotBox77.top !== rotBox170.top,
            rotationWidth77: rotBox77.width,
            rotationWidth170: rotBox170.width,
            framesRowJump: row2Box3.height !== row2Box8.height,
            framesWidth3: framesBox3.width,
            framesWidth8: framesBox8.width
          },
          controls: {
            primaryWidth: primBox ? primBox.width : null,
            sceneWidth: sceneBox ? sceneBox.width : null,
            speedWidth: speedBox ? speedBox.width : null,
            targetWidth: targetBox ? targetBox.width : null,
            gapAfterPalette: gapAfterDefaultPalette,
            actionsTop: actBox ? actBox.top : null,
            primaryBottom: primBox ? primBox.bottom : null,
            actionsDedicatedRow: actBox && primBox ? actBox.top >= primBox.bottom : false,
            actionsRightAligned
          },
          hScrollOverflow
        };
      })()`,
      returnByValue: true,
    });

    results.push(evalResult.result.value);

    // Capture screenshot for evidence
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const shotName = `task3.7-final-${vp.w}x${vp.h}.png`;
    fs.writeFileSync(path.join(evidenceDir, shotName), Buffer.from(shot.data, "base64"));
    console.log(`Saved screenshot: ${shotName}`);
  }

  console.log("\n=== TELEMETRY VERIFICATION SUMMARY ===");
  console.table(results.map(r => ({
    viewport: r.viewport,
    geomInRow1: r.telemetry.geomInRow1,
    rotInRow2: r.telemetry.rotInRow2,
    framesInRow2: r.telemetry.framesInRow2,
    distinct2Rows: r.telemetry.distinctDesktopRows,
    rotJumping: r.telemetry.rotationJumping,
    rotW77: r.telemetry.rotationWidth77,
    rotW170: r.telemetry.rotationWidth170,
    frames8DigitsJump: r.telemetry.framesRowJump,
    hScroll: r.hScrollOverflow
  })));

  console.log("\n=== CONTROL PANEL VERIFICATION SUMMARY ===");
  console.table(results.map(r => ({
    viewport: r.viewport,
    primaryWidth: r.controls.primaryWidth,
    sceneW: r.controls.sceneWidth,
    speedW: r.controls.speedWidth,
    targetW: r.controls.targetWidth,
    gapAfterPalette: r.controls.gapAfterPalette,
    actionsRowDedicated: r.controls.actionsDedicatedRow,
    actionsRightAligned: r.controls.actionsRightAligned
  })));

  // Portal iframe test: expanded (1180px) and collapsed (1376px)
  console.log("\n=== PORTAL IFRAME SIMULATION (1440x900) ===");
  await send("Page.navigate", {
    url: `http://127.0.0.1:${port}/index.html#/module1`,
  });
  await new Promise((r) => setTimeout(r, 1500));

  for (const sidebarState of ["expanded", "collapsed"]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    if (sidebarState === "collapsed") {
      await send("Runtime.evaluate", {
        expression: `(() => {
          const btn = document.getElementById('sidebar-collapse-btn');
          if (btn && btn.getAttribute('aria-expanded') !== 'false') btn.click();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    const portalRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const iframe = document.getElementById('module-iframe');
        if (!iframe || !iframe.contentWindow) return { error: 'No iframe' };
        const idoc = iframe.contentDocument;
        const iwin = iframe.contentWindow;

        const row1 = idoc.querySelector('.telemetry-row--config');
        const row2 = idoc.querySelector('.telemetry-row--diagnostics');
        const geom = idoc.getElementById('telemetry-geometry');
        const rot = idoc.getElementById('telemetry-rotation');
        const prim = idoc.querySelector('.control-panel__primary');
        const pal = idoc.getElementById('control-color-palette');
        const act = idoc.querySelector('.control-panel__actions');
        const resetBtn = idoc.getElementById('control-reset');

        const r1Box = row1.getBoundingClientRect();
        const r2Box = row2.getBoundingClientRect();
        const primBox = prim.getBoundingClientRect();
        const palBox = pal.getBoundingClientRect();
        const actBox = act.getBoundingClientRect();
        const resetBox = resetBtn.getBoundingClientRect();

        return {
          sidebarState: "${sidebarState}",
          iframeWidth: iframe.clientWidth,
          row1Top: Math.round(r1Box.top),
          row2Top: Math.round(r2Box.top),
          distinctRows: r2Box.top >= r1Box.bottom,
          gapAfterPalette: Math.round(primBox.right - palBox.right),
          actionsRightAligned: Math.abs(actBox.right - resetBox.right) < 5,
          actionsDedicatedRow: actBox.top >= primBox.bottom
        };
      })()`,
      returnByValue: true,
    });

    console.log("Portal measurement (" + sidebarState + "):", portalRes.result.value);

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const shotName = `task3.7-final-portal-1440x900-${sidebarState}.png`;
    fs.writeFileSync(path.join(evidenceDir, shotName), Buffer.from(shot.data, "base64"));
    console.log(`Saved screenshot: ${shotName}`);
  }

  ws.close();
  chrome.kill();
  server.close();
  setTimeout(() => {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }, 1000);
});
