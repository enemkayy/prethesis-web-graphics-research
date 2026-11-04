/**
 * Web Graphics Lab — Responsive Sidebar Drawer Controller
 * Handles mobile/tablet off-canvas navigation drawer open/close states,
 * backdrop interaction, Escape key handling, and keyboard focus trapping.
 */

(function () {
  "use strict";

  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const openBtn = document.getElementById("menu-toggle-btn");
  const closeBtn = document.getElementById("sidebar-close-btn");

  if (!sidebar || !backdrop || !openBtn || !closeBtn) {
    return;
  }

  const tabletBreakpoint = window.matchMedia("(max-width: 1023px)");
  let isOpen = false;

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

  // Reset mobile drawer state if viewport expands to desktop width
  tabletBreakpoint.addEventListener("change", (event) => {
    if (!event.matches && isOpen) {
      closeDrawer({ restoreFocus: false });
    }
  });
})();
