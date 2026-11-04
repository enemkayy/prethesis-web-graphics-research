/**
 * Graphics Research Hub — Client-Side Hash Router & Shared Module View Controller
 *
 * Maps `window.location.hash` to one of seven portal views and updates the
 * shared application shell (sidebar active state, header title, breadcrumb,
 * Overview Dashboard, Shared Module View with iframe lifecycle, or static
 * placeholder views for Documentation and About).
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Route configuration (data only — no DOM logic here)
  // ---------------------------------------------------------------------

  const SITE_NAME = "Graphics Research Hub";
  const DEFAULT_PATH = "/";

  // How long to wait for the iframe `load` event before offering a Retry.
  const LOAD_TIMEOUT_MS = 20000;

  /**
   * Supported routes, keyed by the path that follows "#".
   * `kind` selects which view container is rendered.
   */
  const ROUTES = {
    "/": { kind: "overview", title: "Overview" },
    "/module1": {
      kind: "module",
      badge: "01",
      title: "WebGL Graphics",
      summary:
        "Explore native browser-based 3D rendering using WebGL 2.0, custom shaders, and geometric transformations.",
      tags: ["JavaScript", "WebGL 2.0", "GLSL ES 3.0"],
      iframeSrc: "./modules/module1-webgl/index.html",
    },
    "/module2": {
      kind: "module",
      badge: "02",
      title: "Graphical Applications",
      summary:
        "Investigate interactive 3D visualization and object customization through camera controls and material properties.",
      tags: ["Unity", "C#", "Unity Web build"],
      iframeSrc: "./modules/module2-graphical-application/index.html",
    },
    "/module3": {
      kind: "module",
      badge: "03",
      title: "Web Games",
      summary:
        "Explore an interactive single-room 3D environment with character movement, camera controls, and object interaction.",
      tags: ["Unity", "C#", "Unity Web build"],
      iframeSrc: "./modules/module3-webgame/index.html",
    },
    "/module4": {
      kind: "module",
      badge: "04",
      title: "AR/VR",
      summary:
        "Investigate browser-based 3D visualization, augmented reality placement, and WebXR virtual reality feasibility.",
      tags: ["model-viewer", "WebXR"],
      iframeSrc: "./modules/module4-webar/index.html",
    },
    "/docs": {
      kind: "static",
      id: "docs",
      title: "Documentation",
      summary: "Project documentation will be available here.",
    },
    "/about": {
      kind: "static",
      id: "about",
      title: "About",
      summary:
        "Information about the pre-thesis research project will be available here.",
    },
  };

  // ---------------------------------------------------------------------
  // DOM references (existing elements — nothing is duplicated)
  // ---------------------------------------------------------------------

  const overviewView = document.getElementById("overview-view");
  const moduleView = document.getElementById("module-view");
  const routeView = document.getElementById("route-view");
  const docsView = document.getElementById("docs-view");
  const aboutView = document.getElementById("about-view");
  const mainEl = document.getElementById("main");
  const headerTitle = document.getElementById("header-page-title");
  const headerBreadcrumb = document.getElementById("header-breadcrumb");
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");
  const navItems = document.querySelectorAll(".nav-item[data-nav-route]");

  // Shared Module View elements
  const moduleViewBadge = document.getElementById("module-view-badge");
  const moduleViewTitle = document.getElementById("module-view-title");
  const moduleViewDescription = document.getElementById("module-view-description");
  const moduleViewTags = document.getElementById("module-view-tags");
  const moduleReloadBtn = document.getElementById("module-reload-btn");
  const moduleRetryBtn = document.getElementById("module-retry-btn");
  const moduleFrameLoading = document.getElementById("module-frame-loading");
  const moduleLoadingPath = document.getElementById("module-loading-path");
  const moduleFrameError = document.getElementById("module-frame-error");
  const moduleErrorPath = document.getElementById("module-error-path");
  const moduleErrorMessage = document.getElementById("module-error-message");
  const moduleIframe = document.getElementById("module-iframe");

  if (
    !overviewView ||
    !moduleView ||
    !routeView ||
    !headerTitle ||
    !headerBreadcrumb ||
    !breadcrumbCurrent ||
    !moduleIframe
  ) {
    return;
  }

  const overviewDocumentTitle = document.title;
  let isFirstRender = true;

  // Iframe lifecycle state. Every navigation of the shared iframe is described
  // by one "request" object; only `currentRequest` is allowed to change the UI.
  let activeModuleConfig = null;
  let currentRequest = null;
  let requestCounter = 0;

  // ---------------------------------------------------------------------
  // Route resolution (pure logic — reads the hash, returns a route)
  // ---------------------------------------------------------------------

  /**
   * Converts a raw hash ("", "#", "#/", "#/module1/") to a route path.
   * @param {string} hash
   * @returns {string} Path such as "/" or "/module1".
   */
  function hashToPath(hash) {
    let path = hash.replace(/^#/, "");
    if (path === "") {
      return DEFAULT_PATH;
    }
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  }

  /**
   * Looks up a path in the route table.
   * @param {string} path
   * @returns {{ path: string, config: object } | null} null if unsupported.
   */
  function resolveRoute(path) {
    if (Object.prototype.hasOwnProperty.call(ROUTES, path)) {
      return { path: path, config: ROUTES[path] };
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Shared Module View & Iframe Lifecycle
  // ---------------------------------------------------------------------

  /**
   * Displays the loading overlay over the shared module iframe.
   * @param {string} targetSrc Relative path being loaded.
   */
  function showModuleLoading(targetSrc) {
    if (moduleLoadingPath) {
      moduleLoadingPath.textContent = targetSrc;
    }
    if (moduleFrameError) {
      moduleFrameError.hidden = true;
    }
    if (moduleFrameLoading) {
      moduleFrameLoading.hidden = false;
    }
    moduleIframe.setAttribute("aria-busy", "true");
  }

  /**
   * Hides the loading and error overlays (the iframe document finished loading).
   */
  function hideModuleLoading() {
    if (moduleFrameLoading) {
      moduleFrameLoading.hidden = true;
    }
    if (moduleFrameError) {
      moduleFrameError.hidden = true;
    }
    moduleIframe.removeAttribute("aria-busy");
  }

  /**
   * Displays the error overlay with a Retry action.
   * @param {string} targetSrc Relative path that failed to load.
   * @param {string} message User-facing explanation (set with textContent).
   */
  function showModuleError(targetSrc, message) {
    if (moduleErrorPath) {
      moduleErrorPath.textContent = targetSrc;
    }
    if (moduleErrorMessage) {
      moduleErrorMessage.textContent = message;
    }
    if (moduleFrameLoading) {
      moduleFrameLoading.hidden = true;
    }
    if (moduleFrameError) {
      moduleFrameError.hidden = false;
    }
    moduleIframe.removeAttribute("aria-busy");
  }

  /**
   * Updates the shared module header metadata (badge, title, description, tags).
   * @param {object} config Module route configuration.
   */
  function updateModuleHeaderMeta(config) {
    moduleView.setAttribute("data-module", config.badge);
    if (moduleViewBadge) {
      moduleViewBadge.textContent = config.badge;
    }
    if (moduleViewTitle) {
      moduleViewTitle.textContent = config.title;
    }
    if (moduleViewDescription) {
      moduleViewDescription.textContent = config.summary;
    }
    if (moduleViewTags && Array.isArray(config.tags)) {
      const items = config.tags.map((tagText) => {
        const li = document.createElement("li");
        li.className = "tag";
        li.textContent = tagText;
        return li;
      });
      moduleViewTags.replaceChildren(...items);
    }
    moduleIframe.setAttribute("title", config.title + " prototype viewport");
  }

  /**
   * Stops listening for the current request: clears its timeout and removes
   * its one-shot `load` listener so an old navigation can no longer touch the UI.
   */
  function cancelCurrentRequest() {
    if (!currentRequest) {
      return;
    }
    window.clearTimeout(currentRequest.timeoutId);
    moduleIframe.removeEventListener("load", currentRequest.onLoad);
    currentRequest.cancelled = true;
    currentRequest.previousDocument = null;
  }

  /**
   * Starts (or reuses) the iframe navigation for a module.
   *
   * Each navigation gets its own request object and its own `load` listener.
   * A new request cancels the previous one, so late events from earlier
   * navigations are ignored instead of hiding the current loading indicator.
   *
   * @param {object} config Module route configuration.
   * @param {{ force?: boolean }} [options] `force` is used by Reload / Retry.
   */
  function startModuleRequest(config, options) {
    const force = Boolean(options && options.force);
    const targetSrc = config.iframeSrc;

    activeModuleConfig = config;
    updateModuleHeaderMeta(config);

    // Already loading or loaded for the same module: keep it, do not reload.
    // (A previous error is retried automatically when the route is opened again.)
    const canReuse =
      currentRequest &&
      !currentRequest.cancelled &&
      currentRequest.src === targetSrc &&
      currentRequest.status !== "error";
    if (!force && canReuse) {
      return;
    }

    cancelCurrentRequest();

    let previousDocument = null;
    try {
      previousDocument = moduleIframe.contentDocument;
    } catch (_err) {
      previousDocument = null;
    }

    let targetHref = "";
    try {
      targetHref = new URL(targetSrc, window.location.href).href;
    } catch (_err) {
      targetHref = targetSrc;
    }

    const request = {
      id: ++requestCounter,
      src: targetSrc,
      targetHref: targetHref,
      previousDocument: previousDocument,
      status: "loading", // "loading" | "verifying" | "loaded" | "error"
      timedOut: false,
      cancelled: false,
      timeoutId: 0,
      onLoad: null,
    };
    request.onLoad = () => handleRequestLoad(request);
    request.timeoutId = window.setTimeout(() => handleRequestTimeout(request), LOAD_TIMEOUT_MS);
    currentRequest = request;

    showModuleLoading(targetSrc);
    moduleIframe.addEventListener("load", request.onLoad);

    // Setting the src attribute always starts a navigation, even when the value
    // is unchanged, so this also implements "Reload".
    moduleIframe.setAttribute("src", targetSrc);
  }

  /**
   * Called when the iframe `load` event has not fired in time.
   * The browser does not tell us why, so the message does not blame a cause.
   * @param {object} request
   */
  function handleRequestTimeout(request) {
    if (request !== currentRequest || request.cancelled || request.status !== "loading") {
      return;
    }
    request.status = "error";
    request.timedOut = true;
    showModuleError(
      request.src,
      "The module did not finish loading within " +
        LOAD_TIMEOUT_MS / 1000 +
        " seconds. It may be slow or unavailable. You can retry."
    );
  }

  /**
   * Checks the document that just fired `load` and decides whether it is usable.
   *
   * Browser limits: the iframe `load` event also fires for HTTP error pages
   * (404/500) and `error` is not fired for them, so `load` alone proves nothing.
   * Strategy, from most to least reliable:
   *  1. Same-origin navigation timing `responseStatus` (exact HTTP status).
   *  2. If that is unsupported, a HEAD request to the same URL.
   *  3. If the document cannot be inspected at all (the browser's own error
   *     page is cross-origin), report a generic failure — no HTTP claim.
   * Over file:// nothing can be verified, so the module is accepted as loaded.
   *
   * @param {object} request
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  async function verifyLoadedDocument(request) {
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
      return { ok: true };
    }

    let status = 0;
    try {
      const navigationEntry = moduleIframe.contentWindow.performance.getEntriesByType("navigation")[0];
      if (navigationEntry && typeof navigationEntry.responseStatus === "number") {
        status = navigationEntry.responseStatus;
      }
    } catch (_err) {
      // Cross-origin access blocked: typically the browser's network-error page.
      return {
        ok: false,
        message:
          "The browser could not display this module document. The file may be missing or the server may be unreachable.",
      };
    }

    if (status === 0) {
      try {
        const response = await fetch(request.src, { method: "HEAD", cache: "no-store" });
        status = response.status;
      } catch (_err) {
        return {
          ok: false,
          message: "The module could not be reached. Check that the file exists and that the site is served over HTTP.",
        };
      }
      // Servers that do not support HEAD cannot be verified; accept the load.
      if (status === 405 || status === 501) {
        return { ok: true };
      }
    }

    if (status >= 400) {
      return {
        ok: false,
        message: "The server responded with HTTP " + status + " for this module.",
      };
    }
    return { ok: true };
  }

  /**
   * Handles the iframe `load` event for one specific request.
   * `load` only means the iframe document's load event fired; it does not
   * guarantee that every script or asset inside the module initialised.
   * @param {object} request
   */
  function handleRequestLoad(request) {
    const canAcceptLoad =
      request === currentRequest &&
      !request.cancelled &&
      (request.status === "loading" || (request.status === "error" && request.timedOut));
    if (!canAcceptLoad || moduleIframe.getAttribute("src") !== request.src) {
      return;
    }

    let currentDoc = null;
    let currentHref = "";
    try {
      currentDoc = moduleIframe.contentDocument;
      if (moduleIframe.contentWindow && moduleIframe.contentWindow.location) {
        currentHref = moduleIframe.contentWindow.location.href;
      }
    } catch (_err) {
      // Cross-origin access blocked: treat as foreign document
      currentDoc = null;
      currentHref = "";
    }

    // Ignore stale load events originating from the outgoing document
    if (request.previousDocument && currentDoc && currentDoc === request.previousDocument) {
      return;
    }

    // Ignore events if the iframe location is known but still points elsewhere
    if (request.targetHref && currentHref && currentHref !== "about:blank") {
      try {
        const parsedTarget = new URL(request.targetHref);
        const parsedCurrent = new URL(currentHref);
        if (
          parsedCurrent.origin !== parsedTarget.origin ||
          parsedCurrent.pathname !== parsedTarget.pathname
        ) {
          return;
        }
      } catch (_err) {
        if (currentHref !== request.targetHref) {
          return;
        }
      }
    }

    window.clearTimeout(request.timeoutId);
    request.status = "verifying";

    verifyLoadedDocument(request).then((result) => {
      // The user may have navigated or reloaded while we were verifying.
      if (request !== currentRequest || request.cancelled) {
        return;
      }
      request.previousDocument = null;
      if (result.ok) {
        request.status = "loaded";
        hideModuleLoading();
      } else {
        request.status = "error";
        request.timedOut = false;
        showModuleError(request.src, result.message);
      }
    });
  }

  /**
   * Reloads the currently selected module (Reload and Retry buttons).
   * Each call cancels the previous request, so repeated clicks cannot leave
   * conflicting loading states.
   */
  function reloadCurrentModule() {
    if (!activeModuleConfig) {
      return;
    }
    startModuleRequest(activeModuleConfig, { force: true });
  }

  // ---------------------------------------------------------------------
  // View rendering (DOM updates — no routing decisions here)
  // ---------------------------------------------------------------------

  /**
   * Marks exactly one sidebar link active and sets aria-current on it.
   * @param {string} path
   */
  function updateSidebarState(path) {
    navItems.forEach((item) => {
      const isActive = item.getAttribute("data-nav-route") === "#" + path;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  /**
   * Updates the header title / breadcrumb and the browser tab title.
   * @param {object} config Route configuration.
   */
  function updateHeader(config) {
    const isOverview = config.kind === "overview";

    headerTitle.hidden = !isOverview;
    headerBreadcrumb.hidden = isOverview;
    breadcrumbCurrent.textContent = config.title;

    document.title = isOverview
      ? overviewDocumentTitle
      : config.title + " — " + SITE_NAME;
  }

  /**
   * Renders the active route view (Overview Dashboard, Shared Module View,
   * or Static Views for Documentation and About).
   * Static views are preserved in the DOM and toggled using the hidden attribute.
   * @param {object} config Route configuration.
   */
  function renderRouteView(config) {
    // Leaving a module route does not cancel its request: the iframe keeps its
    // document and the request state stays accurate for when the user returns.
    if (config.kind === "overview") {
      routeView.hidden = true;
      if (docsView) {
        docsView.hidden = true;
      }
      if (aboutView) {
        aboutView.hidden = true;
      }
      moduleView.hidden = true;
      overviewView.hidden = false;
      return;
    }

    if (config.kind === "module") {
      overviewView.hidden = true;
      routeView.hidden = true;
      if (docsView) {
        docsView.hidden = true;
      }
      if (aboutView) {
        aboutView.hidden = true;
      }
      moduleView.hidden = false;
      startModuleRequest(config);
      return;
    }

    // Static informational routes (#/docs, #/about)
    overviewView.hidden = true;
    moduleView.hidden = true;
    routeView.hidden = false;

    if (config.id === "docs" || config.title === "Documentation") {
      if (aboutView) {
        aboutView.hidden = true;
      }
      if (docsView) {
        docsView.hidden = false;
      }
    } else if (config.id === "about" || config.title === "About") {
      if (docsView) {
        docsView.hidden = true;
      }
      if (aboutView) {
        aboutView.hidden = false;
      }
    }
  }

  // ---------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------

  /**
   * Resolves the current hash and renders it; redirects unknown routes.
   */
  function handleRouteChange() {
    const route = resolveRoute(hashToPath(window.location.hash));

    if (!route) {
      window.location.replace("#" + DEFAULT_PATH);
      return;
    }

    updateSidebarState(route.path);
    updateHeader(route.config);
    renderRouteView(route.config);

    window.scrollTo(0, 0);
    if (!isFirstRender && mainEl) {
      mainEl.focus({ preventScroll: true });
    }
    isFirstRender = false;
  }

  /**
   * Handles in-page anchors such as "#modules" and the skip link ("#main")
   * without triggering route redirects.
   * @param {MouseEvent} event
   */
  function handleAnchorClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) {
      return;
    }

    const href = link.getAttribute("href");
    if (href === "#" || href.startsWith("#/")) {
      return;
    }

    const target = document.getElementById(href.slice(1));
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ block: "start" });
    if (
      !target.hasAttribute("tabindex") &&
      !/^(A|BUTTON|INPUT)$/.test(target.tagName)
    ) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  }

  // Note: each module request registers its own `load` listener in
  // startModuleRequest() (removed when the request is cancelled); the iframe
  // `error` event is not used because browsers do not fire it for HTTP errors
  // or network-error pages.

  if (moduleRetryBtn) {
    moduleRetryBtn.addEventListener("click", reloadCurrentModule);
  }
  if (moduleReloadBtn) {
    moduleReloadBtn.addEventListener("click", reloadCurrentModule);
  }

  document.addEventListener("click", handleAnchorClick);
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
})();
