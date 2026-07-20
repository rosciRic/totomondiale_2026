import { state } from './state.js';

export function switchTab(targetTabId) {
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  // Hide all tabs and contents
  tabs.forEach(t => t.classList.remove("active"));
  tabContents.forEach(c => c.classList.remove("active"));

  // Deactivate mobile nav buttons
  document.querySelectorAll(".mobile-nav-btn, .more-option-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  // Activate target tab content
  const targetContent = document.getElementById(targetTabId);
  if (targetContent) {
    targetContent.classList.add("active");
  }

  // Highlight corresponding desktop tab button
  const desktopBtn = document.querySelector(`.tab-button[data-tab="${targetTabId}"]`);
  if (desktopBtn) {
    desktopBtn.classList.add("active");
  }

  // Highlight corresponding mobile nav button (bottom nav)
  const mobileBtn = document.querySelector(`.mobile-nav-btn[data-tab="${targetTabId}"]`);
  if (mobileBtn) {
    mobileBtn.classList.add("active");
  } else {
    // Highlight "Altro" if it's a sub-tab from the more menu
    const moreBtn = document.getElementById("mobile-more-btn");
    if (moreBtn && (targetTabId === "tab-partite" || targetTabId === "tab-regolamento")) {
      moreBtn.classList.add("active");
    }
  }

  // Special handlers per specific tab
  if (targetTabId === "tab-home" && state.resetCalendarToTodayRef) {
    state.resetCalendarToTodayRef();
  }

  // Smooth scroll to content area on mobile devices
  if (window.innerWidth <= 768) {
    document.querySelector(".content-area")?.scrollIntoView({ behavior: "smooth" });
  }

  // If switching to Tabellone, render bracket and redraw lines
  if (targetTabId === "tab-fasefinale") {
    if (state.renderTabelloneRef) {
      state.renderTabelloneRef(state.currentTabelloneUserKey || "reale");
    }
    if (state.drawBracketLinesRef) {
      setTimeout(() => {
        state.drawBracketLinesRef();
      }, 50);
    }
  }
}
