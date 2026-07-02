import { state } from './js/state.js';
import { fetchDatabases } from './js/api.js';
import { switchTab } from './js/navigation.js';
import {
  renderDashboardMetrics,
  renderLeaderboard,
  filterLeaderboard,
  renderMatches,
  populateUserSelector,
  renderMontepremi,
  initCalendar,
  renderGlobalStats,
  initFaseFinale,
  renderUserPredictions,
  setLeaderboardSort
} from './js/ui.js?v=3.1.0';

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const tabs = document.querySelectorAll(".tab-button");
  const lastUpdateText = document.getElementById("last-update-text");
  const classificaSearch = document.getElementById("classifica-search");
  const filterStage = document.getElementById("filter-stage");
  const filterStatus = document.getElementById("filter-status");
  const userSelector = document.getElementById("user-selector");

  // Initialize Desktop Tabs Navigation
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTabId = tab.getAttribute("data-tab");
      switchTab(targetTabId);
    });
  });

  // Initialize Mobile Bottom Tabs Navigation
  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "mobile-more-btn") {
        const overlay = document.getElementById("mobile-more-overlay");
        if (overlay) overlay.classList.add("open");
        return;
      }
      
      const targetTabId = btn.getAttribute("data-tab");
      switchTab(targetTabId);
    });
  });

  // Close Mobile More Menu overlay and handle sub-tab selection
  const moreOverlay = document.getElementById("mobile-more-overlay");
  const closeMoreBtn = document.getElementById("close-more-btn");

  if (closeMoreBtn && moreOverlay) {
    closeMoreBtn.addEventListener("click", () => {
      moreOverlay.classList.remove("open");
    });
    
    moreOverlay.addEventListener("click", (e) => {
      if (e.target === moreOverlay) {
        moreOverlay.classList.remove("open");
      }
    });
  }

  document.querySelectorAll(".more-option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.getAttribute("data-tab");
      if (moreOverlay) moreOverlay.classList.remove("open");
      switchTab(targetTabId);
    });
  });

  // Load database on start
  try {
    await fetchDatabases();
    
    // Trigger onDataReady logic
    renderDashboardMetrics();
    renderLeaderboard();
    renderMatches();
    populateUserSelector();
    renderMontepremi();
    initCalendar();
    renderGlobalStats();
    initFaseFinale();

    if (lastUpdateText) {
      lastUpdateText.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Aggiornato in tempo reale`;
    }

    // Attach search and filter events
    if (classificaSearch) classificaSearch.addEventListener("input", filterLeaderboard);
    if (filterStage) filterStage.addEventListener("change", renderMatches);
    if (filterStatus) filterStatus.addEventListener("change", renderMatches);
    if (userSelector) {
      userSelector.addEventListener("change", (e) => renderUserPredictions(e.target.value));
    }

    // Attach leaderboard header sorting click events
    const headers = document.querySelectorAll(".premium-table th[data-sort]");
    headers.forEach(h => {
      h.addEventListener("click", () => {
        const sortKey = h.getAttribute("data-sort");
        setLeaderboardSort(sortKey);
      });
    });

    const mobileSortSelector = document.getElementById("mobile-sort-selector");
    if (mobileSortSelector) {
      mobileSortSelector.addEventListener("change", (e) => {
        setLeaderboardSort(e.target.value);
      });
    }

    const filterPronoStage = document.getElementById("filter-prono-stage");
    const filterPronoOutcome = document.getElementById("filter-prono-outcome");
    if (filterPronoStage && userSelector) {
      filterPronoStage.addEventListener("change", () => renderUserPredictions(userSelector.value));
    }
    if (filterPronoOutcome && userSelector) {
      filterPronoOutcome.addEventListener("change", () => renderUserPredictions(userSelector.value));
    }



    // Modal Close Events
    const matchModal = document.getElementById("match-modal");
    const closeBtn = document.getElementById("modal-close-btn");
    if (closeBtn && matchModal) {
      closeBtn.addEventListener("click", () => matchModal.classList.remove("open"));
      matchModal.addEventListener("click", (e) => {
        if (e.target === matchModal) matchModal.classList.remove("open");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && matchModal.classList.contains("open")) {
          matchModal.classList.remove("open");
        }
      });
    }

  } catch (err) {
    console.error(err);
    if (lastUpdateText) {
      lastUpdateText.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red)"></i> Errore nel caricamento dei dati.`;
    }
  }

  // Floating Back-to-Top Button Logic
  const btnBackToTop = document.getElementById("btn-back-to-top");
  if (btnBackToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        btnBackToTop.classList.add("visible");
      } else {
        btnBackToTop.classList.remove("visible");
      }
    });

    btnBackToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

// Redraw SVG bracket lines on window resize
window.addEventListener("resize", () => {
  const tabFaseFinale = document.getElementById("tab-fasefinale");
  if (tabFaseFinale && tabFaseFinale.classList.contains("active") && state.drawBracketLinesRef) {
    state.drawBracketLinesRef();
  }
});
