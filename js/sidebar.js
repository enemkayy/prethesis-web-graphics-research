/**
 * Web Graphics Lab — Responsive Sidebar & Desktop Collapse Controller
 * Handles mobile/tablet off-canvas navigation drawer open/close states,
 * desktop sidebar collapse/expand with localStorage persistence,
 * backdrop interaction, Escape key handling, and keyboard focus trapping.
 */

(function () {
  "use strict";

  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const openBtn = document.getElementById("menu-toggle-btn");
  const closeBtn = document.getElementById("sidebar-close-btn");
  const collapseBtn = document.getElementById("sidebar-collapse-btn");

  if (!sidebar || !backdrop || !openBtn || !closeBtn) {
    return;
  }

  const tabletBreakpoint = window.matchMedia("(max-width: 1023px)");
  const STORAGE_KEY = "grh_sidebar_collapsed";
  let isOpen = false;

  /**
   * Reads the stored desktop sidebar collapse state from localStorage.
   * @returns {boolean}
   */
  function getStoredCollapseState() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (_err) {
      return false;
    }
  }

  /**
   * Persists the desktop sidebar collapse state to localStorage.
   * @param {boolean} isCollapsed
   */
  function setStoredCollapseState(isCollapsed) {
    try {
      localStorage.setItem(STORAGE_KEY, isCollapsed ? "true" : "false");
    } catch (_err) {
      // Gracefully ignore storage exceptions (e.g. sandboxed iframe/storage blocked)
    }
  }

  /**
   * Updates the desktop collapse button attributes and icon visibility.
   * @param {boolean} isCollapsed
   */
  function updateCollapseButtonState(isCollapsed) {
    if (!collapseBtn) {
      return;
    }
    collapseBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    const nextActionLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
    collapseBtn.setAttribute("aria-label", nextActionLabel);
    collapseBtn.setAttribute("title", nextActionLabel);

    const iconCollapse = collapseBtn.querySelector(".icon-collapse");
    const iconExpand = collapseBtn.querySelector(".icon-expand");
    if (iconCollapse && iconExpand) {
      if (isCollapsed) {
        iconCollapse.setAttribute("hidden", "");
        iconExpand.removeAttribute("hidden");
      } else {
        iconCollapse.removeAttribute("hidden");
        iconExpand.setAttribute("hidden", "");
      }
    }
  }

  /**
   * Applies the desktop collapse state to document.body and updates controls.
   * @param {boolean} isCollapsed
   * @param {boolean} persist
   */
  function setDesktopCollapse(isCollapsed, persist) {
    document.body.classList.toggle("is-sidebar-collapsed", isCollapsed);
    updateCollapseButtonState(isCollapsed);
    if (persist) {
      setStoredCollapseState(isCollapsed);
    }
  }

  /**
   * Toggles the desktop sidebar between expanded and collapsed states.
   */
  function toggleDesktopSidebar() {
    if (tabletBreakpoint.matches) {
      return;
    }
    const isCurrentlyCollapsed =
      document.body.classList.contains("is-sidebar-collapsed");
    setDesktopCollapse(!isCurrentlyCollapsed, true);
  }

  /**
   * Returns all visible, focusable elements inside the sidebar.
   * @returns {HTMLElement[]}
   */
  function getFocusableElements() {
    const selector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(sidebar.querySelectorAll(selector)).filter((el) => {
      if (el.hasAttribute("hidden")) {
        return false;
      }
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  /**
   * Opens the off-canvas navigation drawer on tablet/mobile viewports.
   */
  function openDrawer() {
    if (isOpen || !tabletBreakpoint.matches) {
      return;
    }

    isOpen = true;
    backdrop.hidden = false;
    sidebar.classList.add("is-open");
    document.body.classList.add("is-drawer-open");
    openBtn.setAttribute("aria-expanded", "true");

    // Trigger backdrop opacity transition and move focus once visibility is active
    window.requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
      closeBtn.focus();
    });
  }

  /**
   * Closes the off-canvas navigation drawer and optionally restores focus.
   * @param {{ restoreFocus?: boolean }} options
   */
  function closeDrawer(options) {
    const restoreFocus =
      options && typeof options.restoreFocus === "boolean"
        ? options.restoreFocus
        : true;

    if (!isOpen) {
      return;
    }

    isOpen = false;
    sidebar.classList.remove("is-open");
    document.body.classList.remove("is-drawer-open");
    backdrop.classList.remove("is-visible");
    backdrop.hidden = true;
    openBtn.setAttribute("aria-expanded", "false");

    if (restoreFocus && tabletBreakpoint.matches) {
      openBtn.focus();
    }
  }

  /**
   * Handles keyboard events for Escape dismissal and Tab focus trapping.
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer({ restoreFocus: true });
      return;
    }

    if (event.key === "Tab") {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
  }

  /**
   * Updates active navigation item state and closes the mobile drawer on selection.
   * @param {MouseEvent} event
   */
  function handleSidebarClick(event) {
    const navLink = event.target.closest(".nav-item, .brand-link");
    if (!navLink) {
      return;
    }

    if (navLink.classList.contains("nav-item")) {
      const allNavItems = sidebar.querySelectorAll(".nav-item");
      allNavItems.forEach((item) => {
        item.classList.remove("is-active");
        item.removeAttribute("aria-current");
      });
      navLink.classList.add("is-active");
      navLink.setAttribute("aria-current", "page");
    } else if (navLink.classList.contains("brand-link")) {
      const allNavItems = sidebar.querySelectorAll(".nav-item");
      allNavItems.forEach((item) => {
        const isOverview = item.getAttribute("data-nav-route") === "#/";
        item.classList.toggle("is-active", isOverview);
        if (isOverview) {
          item.setAttribute("aria-current", "page");
        } else {
          item.removeAttribute("aria-current");
        }
      });
    }

    if (isOpen) {
      closeDrawer({ restoreFocus: true });
    }
  }

  // Wire event listeners
  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", () => closeDrawer({ restoreFocus: true }));
  backdrop.addEventListener("click", () => closeDrawer({ restoreFocus: true }));
  sidebar.addEventListener("click", handleSidebarClick);
  document.addEventListener("keydown", handleKeyDown);

  if (collapseBtn) {
    collapseBtn.addEventListener("click", toggleDesktopSidebar);
  }

  // Restore desktop collapsed preference on initial load
  if (!tabletBreakpoint.matches && getStoredCollapseState()) {
    setDesktopCollapse(true, false);
  }

  // Handle breakpoint transitions between desktop and tablet/mobile
  tabletBreakpoint.addEventListener("change", (event) => {
    if (!event.matches) {
      // Expanding to desktop: close mobile drawer if open, and restore desktop collapse preference
      if (isOpen) {
        closeDrawer({ restoreFocus: false });
      }
      if (getStoredCollapseState()) {
        setDesktopCollapse(true, false);
      } else {
        setDesktopCollapse(false, false);
      }
    }
  });
})();
