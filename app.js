/**
 * Totomondiale 2026 - Client App JS
 * Handles dynamic data rendering and responsive UI events.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global App State
  let globalClassifica = [];
  let globalPartiteData = { partite: [], passaggio_turno: {}, premi_finali: {} };
  let globalPronostici = { partecipanti: {} };
  let currentSortMode = "cronologico";
  let homeSelectedDate = "";
  let matchDates = [];
  let drawBracketLinesRef = null;
  let currentTabelloneUserKey = "reale";

  // DOM Elements
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Dashboard Metrics Elements
  const statParticipants = document.getElementById("stat-participants");
  const statLeader = document.getElementById("stat-leader");
  const statMatches = document.getElementById("stat-matches");
  const statPoints = document.getElementById("stat-points");
  const lastUpdateText = document.getElementById("last-update-text");

  // Leaderboard Elements
  const classificaSearch = document.getElementById("classifica-search");
  const classificaBody = document.getElementById("classifica-body");

  // Matches Elements
  const filterStage = document.getElementById("filter-stage");
  const filterStatus = document.getElementById("filter-status");
  const matchesContainer = document.getElementById("matches-container");

  // User Predictions Elements
  const userSelector = document.getElementById("user-selector");
  const userSummaryStats = document.getElementById("user-summary-stats");
  const userMatchesList = document.getElementById("user-matches-list");
  const userAwardsList = document.getElementById("user-awards-list");

  // Home Tab Elements
  const homeTodayDate = document.getElementById("home-today-date");
  const homeTodayContainer = document.getElementById("home-today-container");

  // Statistics Tab Elements
  const statExactRatio = document.getElementById("stat-exact-ratio");
  const statSignRatio = document.getElementById("stat-sign-ratio");
  const tabelloneUserSelector = document.getElementById("tabellone-user-selector");
  const fasefinaleBracketContainer = document.getElementById("fasefinale-bracket-container");

  // Initialize Tabs Navigation
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTabId = tab.getAttribute("data-tab");

      // Deactivate all tabs and contents
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      // Activate clicked tab and corresponding content
      tab.classList.add("active");
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add("active");
      }

      // If returning to Home Tab, reset calendar to today/default
      if (targetTabId === "tab-home") {
        resetCalendarToToday();
      }

      // Smooth scroll to content area on mobile devices
      if (window.innerWidth <= 768) {
        document.querySelector(".content-area")?.scrollIntoView({ behavior: "smooth" });
      }

      // If switching to Tabellone, redraw bracket lines
      if (targetTabId === "tab-fasefinale" && drawBracketLinesRef) {
        setTimeout(() => {
          drawBracketLinesRef();
        }, 50);
      }
    });
  });

  // Fetch all databases in parallel
  async function fetchDatabases() {
    try {
      // Determine if we are running locally or in production
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:";
      const basePath = isLocal ? "" : "https://raw.githubusercontent.com/rosciRic/totomondiale_2026/main/";

      const [classificaRes, partiteRes, pronosticiRes] = await Promise.all([
        fetch(`${basePath}classifica.json?t=${Date.now()}`),
        fetch(`${basePath}partite.json?t=${Date.now()}`),
        fetch(`${basePath}pronostici.json?t=${Date.now()}`)
      ]);

      if (!classificaRes.ok || !partiteRes.ok || !pronosticiRes.ok) {
        throw new Error("Impossibile caricare uno o più database statici.");
      }

      globalClassifica = await classificaRes.json();
      globalPartiteData = await partiteRes.json();
      globalPronostici = await pronosticiRes.json();

      // Normalize knockout stage times to Rome timezone
      const knockoutOffsets = {
        73: -7, 74: -4, 75: -6, 76: -5, 77: -4, 78: -5, 79: -6, 80: -4,
        81: -7, 82: -7, 83: -4, 84: -7, 85: -7, 86: -4, 87: -5, 88: -5,
        89: -4, 90: -5, 91: -4, 92: -6, 93: -7, 94: -4, 95: -7, 96: -4,
        97: -4, 98: -7, 99: -4, 100: -5, 101: -5, 102: -4, 103: -4, 104: -4
      };

      globalPartiteData.partite.forEach(m => {
        if (m.fase !== 'gironi' && knockoutOffsets[m.id] !== undefined) {
          const offsetVal = knockoutOffsets[m.id];
          const sign = offsetVal >= 0 ? "+" : "-";
          const absOffset = Math.abs(offsetVal);
          const offsetString = `${sign}${String(absOffset).padStart(2, '0')}:00`;
          
          if (m.data && m.data.length === 19) {
            try {
              const localIso = `${m.data}${offsetString}`;
              const date = new Date(localIso);
              if (!isNaN(date.getTime())) {
                const romeTimeStr = date.toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', 'T');
                m.data = romeTimeStr;
              }
            } catch (e) {
              console.error("Error normalizing date for match", m.id, e);
            }
          }
        }
      });

      onDataReady();
    } catch (err) {
      console.error(err);
      if (lastUpdateText) lastUpdateText.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red)"></i> Errore nel caricamento dei dati.`;
    }
  }

  // Triggered when all data files are fetched successfully
  function onDataReady() {
    // 1. Render Dashboard Header and Metrics
    renderDashboardMetrics();

    // 2. Render Leaderboard Table
    renderLeaderboard();

    // 3. Render Matches Grid
    renderMatches();

    // 4. Populate User Dropdown Selector and Draw User Detail
    populateUserSelector();

    // 5. Render Montepremi Details
    renderMontepremi();

    // 6. Initialize and Render Calendar on Home Tab
    initCalendar();

    // 7. Render Global standings stats and Fase Finale tabellone
    renderGlobalStats();
    initFaseFinale();

    // Set last update timestamp based on local time (or static meta if available)
    const now = new Date();
    if (lastUpdateText) lastUpdateText.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Aggiornato in tempo reale`;

    // Attach search and filter events
    classificaSearch.addEventListener("input", filterLeaderboard);
    filterStage.addEventListener("change", renderMatches);
    filterStatus.addEventListener("change", renderMatches);
    userSelector.addEventListener("change", (e) => renderUserPredictions(e.target.value));
    const btnToggleSort = document.getElementById("btn-toggle-sort");
    if (btnToggleSort) {
      btnToggleSort.addEventListener("click", () => {
        if (currentSortMode === "cronologico") {
          currentSortMode = "esito";
          btnToggleSort.classList.add("active-esito");
          document.getElementById("sort-label").textContent = "Esito";
          document.getElementById("sort-icon").className = "fa-solid fa-arrow-down-wide-short";
        } else {
          currentSortMode = "cronologico";
          btnToggleSort.classList.remove("active-esito");
          document.getElementById("sort-label").textContent = "Cronologico";
          document.getElementById("sort-icon").className = "fa-solid fa-calendar-days";
        }
        renderUserPredictions(userSelector.value);
      });
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
  }

  // Calculate and display top widgets metrics
  function renderDashboardMetrics() {
    if (statParticipants) statParticipants.textContent = globalClassifica.length;
    
    if (statLeader) {
      if (globalClassifica.length > 0) {
        statLeader.textContent = globalClassifica[0].nome;
      } else {
        statLeader.textContent = "Nessuno";
      }
    }

    const completedCount = globalPartiteData.partite.filter(p => p.conclusa).length;
    if (statMatches) statMatches.textContent = `${completedCount} / ${globalPartiteData.partite.length}`;

    const totalPts = globalClassifica.reduce((sum, item) => sum + item.punti, 0);
    if (statPoints) statPoints.textContent = totalPts;
  }

  // Calculate and display Montepremi and Quote based on actual classification size
  function renderMontepremi() {
    const rulesParticipants = document.getElementById("rules-participants");
    const rulesTotalJackpot = document.getElementById("rules-total-jackpot");
    const jackpot1Pct = document.getElementById("jackpot-1-pct");
    const jackpot1Amount = document.getElementById("jackpot-1-amount");
    const jackpot2Pct = document.getElementById("jackpot-2-pct");
    const jackpot2Amount = document.getElementById("jackpot-2-amount");
    const jackpot3Pct = document.getElementById("jackpot-3-pct");
    const jackpot3Amount = document.getElementById("jackpot-3-amount");

    if (!rulesParticipants || !rulesTotalJackpot) return;

    const N = globalClassifica.length;
    rulesParticipants.textContent = N;
    
    const pricePerParticipant = 10;
    const totalJackpot = N * pricePerParticipant;
    rulesTotalJackpot.textContent = `${totalJackpot} €`;

    // Fixed prizes as requested
    const prize1 = 250;
    const prize2 = 100;
    const prize3 = 30;

    // Calculate percentages
    const p1 = totalJackpot > 0 ? (prize1 / totalJackpot * 100).toFixed(1) : 0;
    const p2 = totalJackpot > 0 ? (prize2 / totalJackpot * 100).toFixed(1) : 0;
    const p3 = totalJackpot > 0 ? (prize3 / totalJackpot * 100).toFixed(1) : 0;

    // Update percentages labels
    jackpot1Pct.textContent = `${p1}%`;
    jackpot2Pct.textContent = `${p2}%`;
    jackpot3Pct.textContent = `${p3}%`;

    // Update cash values
    jackpot1Amount.textContent = `${prize1} €`;
    jackpot2Amount.textContent = `${prize2} €`;
    jackpot3Amount.textContent = `${prize3} €`;
  }

  // Render Leaderboard
  function renderLeaderboard() {
    classificaBody.innerHTML = "";
    
    if (globalClassifica.length === 0) {
      classificaBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Nessun partecipante in classifica.</td></tr>`;
      return;
    }

    globalClassifica.forEach((player, index) => {
      const row = document.createElement("tr");
      row.setAttribute("data-player", player.nome.toLowerCase());
      
      let posClass = "pos-badge pos-other";
      let posContent = index + 1;
      
      if (index === 0) {
        posClass = "pos-badge pos-1";
        posContent = `<i class="fa-solid fa-medal"></i>`;
        row.classList.add("row-rank-1");
      } else if (index === 1) {
        posClass = "pos-badge pos-2";
        posContent = `<i class="fa-solid fa-medal"></i>`;
        row.classList.add("row-rank-2");
      } else if (index === 2) {
        posClass = "pos-badge pos-3";
        posContent = `<i class="fa-solid fa-medal"></i>`;
        row.classList.add("row-rank-3");
      }

      row.innerHTML = `
        <td style="text-align: center;"><span class="${posClass}">${posContent}</span></td>
        <td><span class="player-name">${player.nome}</span></td>
        <td style="text-align: center;"><span class="points-val">${player.punti}</span></td>
        <td style="text-align: center;" class="hide-mobile badge-exact-col">${player.risultati_esatti}</td>
        <td style="text-align: center;" class="hide-mobile badge-sign-col">${player.prono_esatti}</td>
        <td style="text-align: center;" class="hide-mobile badge-error-col">${player.errori}</td>
        <td style="text-align: center;">
          <button class="btn-details" data-user="${player.nome}">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      `;

      // Attach button click event to navigate to user predictions
      const btn = row.querySelector(".btn-details");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateToUserPredictions(player.nome);
      });

      // Make the entire row clickable for better mobile and desktop UX
      row.addEventListener("click", () => {
        navigateToUserPredictions(player.nome);
      });

      classificaBody.appendChild(row);
    });
  }

  // Filter Leaderboard on search query
  function filterLeaderboard() {
    const query = classificaSearch.value.trim().toLowerCase();
    const rows = classificaBody.querySelectorAll("tr");
    
    rows.forEach(row => {
      const playerName = row.getAttribute("data-player");
      if (playerName && playerName.includes(query)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }

  // Navigate to user prediction tab and auto select the user
  function navigateToUserPredictions(username) {
    // Set active tab button
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    const userTabBtn = document.getElementById("tab-btn-pronostici");
    const userTabContent = document.getElementById("tab-pronostici");

    if (userTabBtn && userTabContent) {
      userTabBtn.classList.add("active");
      userTabContent.classList.add("active");
    }

    // Set dropdown selection
    userSelector.value = username;
    renderUserPredictions(username);

    // Smooth scroll to content area on mobile devices
    if (window.innerWidth <= 768) {
      document.querySelector(".content-area")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Format datetime ISO string into readable format
  function formatDate(isoString) {
    if (!isoString) return "";
    const options = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
    const date = new Date(isoString);
    return date.toLocaleDateString('it-IT', options).replace(',', ' -');
  }

  // Get flag representation (img tag from Flagcdn or fallback emoji)
  function getFlagEmoji(teamName) {
    if (!teamName) return "⚽";
    const key = teamName.trim().toLowerCase();
    
    // Mapping for team names to ISO codes (lower case)
    const flagCodes = {
      "messico": "mx", "sudafrica": "za", "corea del sud": "kr", "repubblica ceca": "cz",
      "canada": "ca", "bosnia ed erzegovina": "ba", "stati uniti": "us", "paraguay": "py",
      "qatar": "qa", "svizzera": "ch", "brasile": "br", "marocco": "ma", "germania": "de",
      "curaçao": "cw", "curacao": "cw", "giappone": "jp", "costa d'avorio": "ci", "ecuador": "ec",
      "svezia": "se", "tunisia": "tn", "spagna": "es", "capo verde": "cv", "belgio": "be",
      "egitto": "eg", "arabia saudita": "sa", "uruguay": "uy", "iran": "ir",
      "nuova zelanda": "nz", "francia": "fr", "senegal": "sn", "iraq": "iq",
      "norvegia": "no", "argentina": "ar", "algeria": "dz", "austria": "at",
      "giordan": "jo", "giordania": "jo", "portogallo": "pt", "rd congo": "cd",
      "inghilterra": "gb-eng", "croazia": "hr", "ghana": "gh", "panama": "pa",
      "uzbekistan": "uz", "colombia": "co", "italia": "it", "olanda": "nl",
      "australia": "au", "scozia": "gb-sct", "turchia": "tr", "haiti": "ht"
    };

    const code = flagCodes[key];
    if (code) {
      return `<img src="https://flagcdn.com/w40/${code}.png" class="flag-img" alt="${teamName}" loading="lazy">`;
    }
    return "⚽";
  }

  // Render Matches Grid based on filters
  function renderMatches() {
    matchesContainer.innerHTML = "";
    const stageFilter = filterStage.value;
    const statusFilter = filterStatus.value;

    let filteredMatches = globalPartiteData.partite;

    // Filtra per fase del torneo
    if (stageFilter === "gironi") {
      filteredMatches = filteredMatches.filter(p => p.fase === "gironi");
    } else if (stageFilter === "eliminazione") {
      filteredMatches = filteredMatches.filter(p => p.fase !== "gironi");
    } else if (stageFilter !== "all") {
      filteredMatches = filteredMatches.filter(p => p.fase === stageFilter);
    }

    // Filter by status
    if (statusFilter === "conclusa") {
      filteredMatches = filteredMatches.filter(p => p.conclusa);
    } else if (statusFilter === "programmata") {
      filteredMatches = filteredMatches.filter(p => !p.conclusa);
    }

    if (filteredMatches.length === 0) {
      matchesContainer.innerHTML = `<div class="card col-span-2" style="text-align: center; grid-column: 1 / -1;">Nessuna partita soddisfa i filtri impostati.</div>`;
      return;
    }

    filteredMatches.forEach(match => {
      const card = document.createElement("div");
      card.className = "match-card";

      const badgeClass = match.conclusa ? "badge-finished" : "badge-pending";
      const badgeText = match.conclusa ? "Conclusa" : "Da Giocare";
      
      const homeScore = match.home_score !== null ? match.home_score : "-";
      const awayScore = match.away_score !== null ? match.away_score : "-";
      
      const detailsText = match.fase === "gironi" ? `Gruppo ${match.gruppo}` : match.fase.toUpperCase();

      const isHomeWinner = match.conclusa && match.home_score > match.away_score;
      const isAwayWinner = match.conclusa && match.away_score > match.home_score;
      const isLoserHome = match.conclusa && match.home_score < match.away_score;
      const isLoserAway = match.conclusa && match.away_score < match.home_score;

      const homeRowClass = isHomeWinner ? "winner-row" : (isLoserHome ? "loser-row" : "");
      const awayRowClass = isAwayWinner ? "winner-row" : (isLoserAway ? "loser-row" : "");

      card.innerHTML = `
        <div class="match-header">
          <span class="match-stage">${detailsText}</span>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${formatDate(match.data)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row ${homeRowClass}">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.home)}</span>
              ${match.home}
            </span>
            <span class="team-score">${homeScore}</span>
          </div>
          <div class="team-row ${awayRowClass}">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.away)}</span>
              ${match.away}
            </span>
            <span class="team-score">${awayScore}</span>
          </div>
        </div>
        <div class="match-status-bar">
          <span>ID Partita: <strong>${match.id}</strong></span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
      `;

      card.addEventListener("click", () => openMatchModal(match));
      matchesContainer.appendChild(card);
    });
  }

  // Open modal displaying all participants' predictions for a specific match
  function openMatchModal(match) {
    const matchModal = document.getElementById("match-modal");
    const modalStage = document.getElementById("modal-match-stage");
    const modalTitle = document.getElementById("modal-match-title");
    const modalInfo = document.getElementById("modal-match-info");
    const modalSummary = document.getElementById("modal-prono-summary");
    const modalList = document.getElementById("modal-prono-list");

    if (!matchModal || !modalList) return;

    // Set header information
    if (modalStage) {
      modalStage.textContent = match.fase === "gironi" ? `Gruppo ${match.gruppo}` : match.fase.toUpperCase();
    }
    if (modalTitle) {
      modalTitle.innerHTML = `${getFlagEmoji(match.home)} ${match.home} <span style="font-size: 0.9em; opacity: 0.5;">vs</span> ${match.away} ${getFlagEmoji(match.away)}`;
    }
    if (modalInfo) {
      modalInfo.innerHTML = `<i class="fa-regular fa-clock"></i> ID Partita: <strong>${match.id}</strong> &bull; ${formatDate(match.data)}`;
    }

    // Populate predictions list
    modalList.innerHTML = "";
    
    const userPronoDataList = [];
    let count3 = 0, count1 = 0, count0 = 0, countPending = 0;

    Object.keys(globalPronostici.partecipanti).forEach(username => {
      const userDati = globalPronostici.partecipanti[username];
      const userPartite = userDati.partite || {};
      const pred = userPartite[match.id];

      let predH = "-";
      let predA = "-";
      let ptsAwarded = -1; // -1 means pending / no outcome
      let ptsText = "-";
      let ptsClass = "pts-pending";

      if (pred) {
        predH = pred.home_score !== undefined ? pred.home_score : "-";
        predA = pred.away_score !== undefined ? pred.away_score : "-";

        if (match.conclusa) {
          if (match.home_score === pred.home_score && match.away_score === pred.away_score) {
            ptsAwarded = 3;
            ptsText = "+3";
            ptsClass = "pts-3";
            count3++;
          } else {
            const realSign = getSign(match.home_score, match.away_score);
            const predSign = getSign(pred.home_score, pred.away_score);
            if (realSign === predSign) {
              ptsAwarded = 1;
              ptsText = "+1";
              ptsClass = "pts-1";
              count1++;
            } else {
              ptsAwarded = 0;
              ptsText = "0";
              ptsClass = "pts-0";
              count0++;
            }
          }
        } else {
          countPending++;
        }
      } else if (match.conclusa) {
        ptsAwarded = 0;
        ptsText = "0";
        ptsClass = "pts-0";
        count0++;
      } else {
        countPending++;
      }

      // Fetch user rank from classification
      const rankIndex = globalClassifica.findIndex(c => c.nome === username);
      const userRank = rankIndex !== -1 ? rankIndex + 1 : "-";

      userPronoDataList.push({
        username,
        rank: userRank,
        predText: `${predH} - ${predA}`,
        ptsAwarded,
        ptsText,
        ptsClass
      });
    });

    // Sort: 
    // 1. Decrescente per punti assegnati (3, poi 1, poi 0, poi -1)
    // 2. Crescente per posizione in classifica (rank)
    userPronoDataList.sort((a, b) => {
      if (b.ptsAwarded !== a.ptsAwarded) {
        return b.ptsAwarded - a.ptsAwarded;
      }
      return (a.rank === "-" ? 999 : a.rank) - (b.rank === "-" ? 999 : b.rank);
    });

    // Populate summary statistics
    if (modalSummary) {
      if (match.conclusa) {
        modalSummary.innerHTML = `
          <div class="summary-box" style="border-color: rgba(0, 219, 139, 0.2)">
            Risultati Esatti (+3)
            <strong style="color: var(--accent-green)">${count3}</strong>
          </div>
          <div class="summary-box" style="border-color: rgba(255, 183, 3, 0.2)">
            Segni Esatti (+1)
            <strong style="color: var(--accent-gold)">${count1}</strong>
          </div>
          <div class="summary-box" style="border-color: rgba(255, 65, 108, 0.2)">
            Errati
            <strong style="color: var(--accent-red)">${count0}</strong>
          </div>
        `;
        modalSummary.style.display = "grid";
      } else {
        modalSummary.style.display = "none";
      }
    }

    // Render sorted list in modal
    userPronoDataList.forEach(data => {
      const row = document.createElement("div");
      row.className = "modal-prono-row";
      row.style.cursor = "pointer";
      row.innerHTML = `
        <div class="modal-user-info">
          <span class="modal-user-rank">#${data.rank}</span>
          <span class="modal-user-name">${data.username}</span>
        </div>
        <div class="modal-prono-values">
          <span class="modal-prono-val">${data.predText}</span>
          <span class="modal-pts-badge ${data.ptsClass}">${data.ptsText}</span>
        </div>
      `;
      // Clicking on user inside the modal goes to their user page details and closes the modal
      row.addEventListener("click", () => {
        matchModal.classList.remove("open");
        navigateToUserPredictions(data.username);
      });
      modalList.appendChild(row);
    });

    // Show modal
    matchModal.classList.add("open");
  }

  // Populate User dropdown list
  function populateUserSelector() {
    userSelector.innerHTML = "";
    const partecipanti = Object.keys(globalPronostici.partecipanti);
    
    if (partecipanti.length === 0) {
      userSelector.innerHTML = `<option value="">Nessun utente</option>`;
      return;
    }

    // Populate drop-down
    partecipanti.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      userSelector.appendChild(opt);
    });

    // Default to the leader or first player
    const defaultUser = globalClassifica.length > 0 ? globalClassifica[0].nome : partecipanti[0];
    userSelector.value = defaultUser;
    renderUserPredictions(defaultUser);
  }

  // Return outcome sign ('1', 'X', '2')
  function getSign(home, away) {
    if (home === null || away === null) return null;
    if (home > away) return "1";
    if (home < away) return "2";
    return "X";
  }

  // Render user predictions detailed breakdown
  function renderUserPredictions(username) {
    userSummaryStats.innerHTML = "";
    userMatchesList.innerHTML = "";
    userAwardsList.innerHTML = "";

    const userDati = globalPronostici.partecipanti[username];
    if (!userDati) {
      userMatchesList.innerHTML = `<p>Nessun dato per l'utente selezionato.</p>`;
      return;
    }

    // Fetch user overall placement from classifica
    const placement = globalClassifica.find(c => c.nome === username) || { punti: 0, risultati_esatti: 0, prono_esatti: 0, errori: 0 };
    
    // Display participant widgets summary
    userSummaryStats.innerHTML = `
      <div class="user-stat-badge">
        <span>Punteggio</span>
        <strong>${placement.punti} Punti</strong>
      </div>
      <div class="user-stat-badge">
        <span>Esatti (+3)</span>
        <strong style="color: var(--accent-green)">${placement.risultati_esatti}</strong>
      </div>
      <div class="user-stat-badge">
        <span>Segni (+1)</span>
        <strong style="color: var(--accent-gold)">${placement.prono_esatti}</strong>
      </div>
      <div class="user-stat-badge">
        <span>Errori</span>
        <strong style="color: var(--accent-red)">${placement.errori}</strong>
      </div>
    `;

    // Map matches map
    const partiteMap = {};
    globalPartiteData.partite.forEach(m => {
      partiteMap[m.id] = m;
    });

    // Render User Matches Predictions
    const userPartite = userDati.partite || {};
    let predictionRowsHtml = "";

    let matchesToRender = [...globalPartiteData.partite];

    if (currentSortMode === "esito") {
      const getOutcomeWeight = (match, pred) => {
        if (!match.conclusa) return 0;
        if (!pred) return 1;
        if (match.home_score === pred.home_score && match.away_score === pred.away_score) {
          return 3;
        }
        const realSign = getSign(match.home_score, match.away_score);
        const predSign = getSign(pred.home_score, pred.away_score);
        if (realSign === predSign) {
          return 2;
        }
        return 1;
      };

      matchesToRender.sort((a, b) => {
        const predA = userPartite[a.id];
        const predB = userPartite[b.id];
        const weightA = getOutcomeWeight(a, predA);
        const weightB = getOutcomeWeight(b, predB);
        
        if (weightB !== weightA) {
          return weightB - weightA;
        }
        return a.id - b.id;
      });
    }

    matchesToRender.forEach(match => {
      const pred = userPartite[match.id];
      let rowHtml = "";

      const matchLabel = match.fase === "gironi" ? `GIRONE ${match.gruppo}` : match.fase.toUpperCase();
      
      const realHomeScore = match.home_score !== null ? match.home_score : "-";
      const realAwayScore = match.away_score !== null ? match.away_score : "-";
      
      let predHomeScore = "-";
      let predAwayScore = "-";
      let ptsText = "-";
      let ptsClass = "pts-pending";

      if (pred) {
        predHomeScore = pred.home_score !== undefined ? pred.home_score : "-";
        predAwayScore = pred.away_score !== undefined ? pred.away_score : "-";

        if (match.conclusa) {
          if (match.home_score === pred.home_score && match.away_score === pred.away_score) {
            ptsText = "+3";
            ptsClass = "pts-3";
          } else {
            const realSign = getSign(match.home_score, match.away_score);
            const predSign = getSign(pred.home_score, pred.away_score);
            if (realSign === predSign) {
              ptsText = "+1";
              ptsClass = "pts-1";
            } else {
              ptsText = "0";
              ptsClass = "pts-0";
            }
          }
        }
      } else if (match.conclusa) {
        ptsText = "0";
        ptsClass = "pts-0";
      }

      rowHtml = `
        <div class="user-match-row">
          <div class="match-info-meta">
            <h5>${matchLabel} - ID: ${match.id}</h5>
            <div class="match-info-teams">
              ${getFlagEmoji(match.home)} ${match.home} vs ${match.away} ${getFlagEmoji(match.away)}
            </div>
          </div>
          <div class="scores-comparison">
            <div class="score-box">
              <span class="score-box-label">Pron.</span>
              <span class="score-num">${predHomeScore} - ${predAwayScore}</span>
            </div>
            <div class="score-box">
              <span class="score-box-label">Reale</span>
              <span class="score-num">${realHomeScore} - ${realAwayScore}</span>
            </div>
            <div class="score-punti-badge ${ptsClass}">${ptsText}</div>
          </div>
        </div>
      `;
      predictionRowsHtml += rowHtml;
    });

    userMatchesList.innerHTML = predictionRowsHtml || `<p>Nessun pronostico inserito.</p>`;



    // --- Render Final Special Awards ---
    const userPremi = userDati.premi_finali;
    const realPremi = globalPartiteData.premi_finali || {};

    if (!userPremi) {
      userAwardsList.innerHTML = `
        <div class="badge badge-pending" style="display: block; text-align: center; padding: 12px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Nessun pronostico premi speciali inserito.
        </div>
      `;
    } else {
      let awardsHtml = "";
      const awards = [
        { key: "vincitore", label: "Campione del Mondo (+10 pt)", icon: "fa-trophy" },
        { key: "finalista", label: "L'altra Finalista (+5 pt)", icon: "fa-shield-halved" },
        { key: "capocannoniere", label: "Capocannoniere (+5 pt)", icon: "fa-shoe-prints" },
        { key: "mvp", label: "Miglior Giocatore MVP (+5 pt)", icon: "fa-star" },
        { key: "portiere", label: "Miglior Portiere (+5 pt)", icon: "fa-hands-gloves" },
        { key: "giovane", label: "Miglior Giovane (+5 pt)", icon: "fa-child" }
      ];

      awards.forEach(award => {
        const uVal = userPremi[award.key] || "-";
        const rVal = realPremi[award.key];
        
        let borderStyle = "";
        let pointsIndicator = "";
        
        if (rVal) {
          const cleanUser = uVal.trim().toLowerCase();
          let isCorrect = false;
          
          if (Array.isArray(rVal)) {
            isCorrect = rVal.map(t => t.trim().toLowerCase()).includes(cleanUser);
          } else if (typeof rVal === "string") {
            isCorrect = rVal.trim().toLowerCase() === cleanUser;
          }
          
          if (isCorrect) {
            borderStyle = "border: 1px solid var(--accent-green); background: rgba(0, 219, 139, 0.05);";
            const pts = award.key === "vincitore" ? "+10" : "+5";
            pointsIndicator = `<span class="badge badge-finished">${pts} PT</span>`;
          } else {
            borderStyle = "border: 1px solid var(--accent-red); background: rgba(255, 65, 108, 0.02);";
            pointsIndicator = `<span class="badge" style="background: rgba(255, 65, 108, 0.1); color: var(--accent-red); border: 1px solid rgba(255, 65, 108, 0.2)">0 PT</span>`;
          }
        } else {
          pointsIndicator = `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--color-text-muted);">Attesa</span>`;
        }

        // Adjust FontAwesome icon for gloves (since hands-gloves might not be in free version, fall back to hand)
        const faIcon = award.icon === "fa-hands-gloves" ? "fa-hand-back-fist" : award.icon;

        awardsHtml += `
          <div class="award-row" style="${borderStyle}">
            <div class="award-info" style="display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid ${faIcon}" style="color: var(--accent-gold); font-size: 1.1rem; width: 20px;"></i>
              <div>
                <h5>${award.label}</h5>
                <p>${getFlagEmoji(uVal)} ${uVal}</p>
              </div>
            </div>
            ${pointsIndicator}
          </div>
        `;
      });

      userAwardsList.innerHTML = awardsHtml;
    }
  }

  // Helper to get default calendar date
  function getDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (matchDates.includes(todayStr)) {
      return todayStr;
    } else {
      const futureDates = matchDates.filter(d => d >= todayStr);
      if (futureDates.length > 0) {
        return futureDates[0];
      } else {
        return matchDates[matchDates.length - 1];
      }
    }
  }

  // Reset horizontal calendar to today or default date and scroll to it
  function resetCalendarToToday() {
    if (matchDates.length === 0) return;
    const defaultDate = getDefaultDate();
    homeSelectedDate = defaultDate;

    const daysScroll = document.getElementById("calendar-days-scroll");
    if (!daysScroll) return;

    const items = daysScroll.querySelectorAll(".calendar-day-item");
    items.forEach(item => {
      if (item.getAttribute("data-date") === homeSelectedDate) {
        item.classList.add("active");
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        item.classList.remove("active");
      }
    });

    renderHome();
  }

  // Initialize the horizontal calendar slider
  function initCalendar() {
    // 1. Extract unique dates sorted in chronological order (YYYY-MM-DD)
    matchDates = [...new Set(globalPartiteData.partite
      .map(m => m.data)
      .filter(d => d)
      .map(d => d.split('T')[0]))
    ].sort();

    if (matchDates.length === 0) return;

    // 2. Select initial date: today if tournament is active today, or closest future, or fallback
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    homeSelectedDate = getDefaultDate();

    const daysScroll = document.getElementById("calendar-days-scroll");
    if (!daysScroll) return;
    daysScroll.innerHTML = "";

    // Wheel horizontal scroll for desktop mouse users
    daysScroll.addEventListener("wheel", (evt) => {
      evt.preventDefault();
      daysScroll.scrollLeft += evt.deltaY;
    });

    // 3. Dynamically populate calendar items
    matchDates.forEach(dateStr => {
      const parsedDate = new Date(dateStr + "T00:00:00");
      // Format day name (short) and day number
      let dayName = parsedDate.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).replace('.', '');
      dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const dayNum = parsedDate.getDate();

      const dayItem = document.createElement("div");
      dayItem.className = `calendar-day-item${dateStr === homeSelectedDate ? " active" : ""}`;
      dayItem.setAttribute("data-date", dateStr);
      
      const isToday = dateStr === todayStr;
      if (isToday) {
        dayItem.innerHTML = `
          <span class="day-today">Oggi</span>
        `;
      } else {
        dayItem.innerHTML = `
          <span class="day-name">${dayName}</span>
          <span class="day-num">${dayNum}</span>
        `;
      }

      dayItem.addEventListener("click", () => {
        // Remove active class from others
        document.querySelectorAll(".calendar-day-item").forEach(item => item.classList.remove("active"));
        dayItem.classList.add("active");
        
        homeSelectedDate = dateStr;
        renderHome();
        
        // Scroll item to center smoothly
        dayItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });

      daysScroll.appendChild(dayItem);
    });

    // 4. Center active day initially after a short timeout to let CSS/rendering finish
    setTimeout(() => {
      const activeItem = daysScroll.querySelector(".calendar-day-item.active");
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }, 150);

    // 5. Arrow controls click events
    const prevBtn = document.getElementById("calendar-prev-btn");
    const nextBtn = document.getElementById("calendar-next-btn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const currentIndex = matchDates.indexOf(homeSelectedDate);
        if (currentIndex > 0) {
          const prevDate = matchDates[currentIndex - 1];
          const prevItem = daysScroll.querySelector(`.calendar-day-item[data-date="${prevDate}"]`);
          if (prevItem) prevItem.click();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const currentIndex = matchDates.indexOf(homeSelectedDate);
        if (currentIndex < matchDates.length - 1) {
          const nextDate = matchDates[currentIndex + 1];
          const nextItem = daysScroll.querySelector(`.calendar-day-item[data-date="${nextDate}"]`);
          if (nextItem) nextItem.click();
        }
      });
    }

    // 6. Touch swipe gestures on the matches grid container (#home-today-container)
    if (homeTodayContainer) {
      let touchStartX = 0;
      let touchEndX = 0;

      homeTodayContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      homeTodayContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
      }, { passive: true });

      function handleSwipeGesture() {
        const threshold = 65; // minimum swipe distance in px
        const deltaX = touchEndX - touchStartX;
        const currentIndex = matchDates.indexOf(homeSelectedDate);

        if (Math.abs(deltaX) > threshold && currentIndex !== -1) {
          if (deltaX > 0 && currentIndex > 0) {
            // Swipe right -> Go to previous day
            const prevDate = matchDates[currentIndex - 1];
            const prevItem = daysScroll.querySelector(`.calendar-day-item[data-date="${prevDate}"]`);
            if (prevItem) prevItem.click();
          } else if (deltaX < 0 && currentIndex < matchDates.length - 1) {
            // Swipe left -> Go to next day
            const nextDate = matchDates[currentIndex + 1];
            const nextItem = daysScroll.querySelector(`.calendar-day-item[data-date="${nextDate}"]`);
            if (nextItem) nextItem.click();
          }
        }
      }
    }

    // Render matches for initial date
    renderHome();
  }

  // Render Home Tab - Matches of the selected day
  function renderHome() {
    if (!homeSelectedDate) return;

    // 1. Update the date header with full readable Italian date
    const selectedParsedDate = new Date(homeSelectedDate + "T00:00:00");
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedParsedDate.toLocaleDateString('it-IT', options);
    if (homeTodayDate) {
      homeTodayDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    // 2. Filter matches for the selected date
    const selectedMatches = globalPartiteData.partite.filter(match => match.data.startsWith(homeSelectedDate));

    if (!homeTodayContainer) return;
    homeTodayContainer.innerHTML = "";

    // 3. Handle empty schedule
    if (selectedMatches.length === 0) {
      homeTodayContainer.innerHTML = `
        <div class="col-span-2 home-empty-box" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-calendar-xmark"></i>
          Nessuna partita in programma per questo giorno.
        </div>
      `;
      return;
    }

    // 4. Render match cards
    selectedMatches.forEach(match => {
      const card = document.createElement("div");
      card.className = "match-card animate-fade-in"; // Premium micro-animation

      const badgeClass = match.conclusa ? "badge-finished" : "badge-pending";
      const badgeText = match.conclusa ? "Conclusa" : "Da Giocare";
      
      const homeScore = match.home_score !== null ? match.home_score : "-";
      const awayScore = match.away_score !== null ? match.away_score : "-";
      
      const detailsText = match.fase === "gironi" ? `Gruppo ${match.gruppo}` : match.fase.toUpperCase();

      const isHomeWinner = match.conclusa && match.home_score > match.away_score;
      const isAwayWinner = match.conclusa && match.away_score > match.home_score;
      const isLoserHome = match.conclusa && match.home_score < match.away_score;
      const isLoserAway = match.conclusa && match.away_score < match.home_score;

      const homeRowClass = isHomeWinner ? "winner-row" : (isLoserHome ? "loser-row" : "");
      const awayRowClass = isAwayWinner ? "winner-row" : (isLoserAway ? "loser-row" : "");

      card.innerHTML = `
        <div class="match-header">
          <span class="match-stage">${detailsText}</span>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${formatDate(match.data)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row ${homeRowClass}">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.home)}</span>
              ${match.home}
            </span>
            <span class="team-score">${homeScore}</span>
          </div>
          <div class="team-row ${awayRowClass}">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.away)}</span>
              ${match.away}
            </span>
            <span class="team-score">${awayScore}</span>
          </div>
        </div>
        <div class="match-status-bar">
          <span>ID Partita: <strong>${match.id}</strong></span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
      `;

      card.addEventListener("click", () => openMatchModal(match));
      homeTodayContainer.appendChild(card);
    });
  }

  // Render Global standings stats in leaderboard
  function renderGlobalStats() {
    let totalExact = 0;
    let totalSign = 0;
    let totalError = 0;
    globalClassifica.forEach(player => {
      totalExact += player.risultati_esatti || 0;
      totalSign += player.prono_esatti || 0;
      totalError += player.errori || 0;
    });
    const totalProno = totalExact + totalSign + totalError;
    const exactRatio = totalProno > 0 ? (totalExact / totalProno * 100).toFixed(1) : 0;
    const signRatio = totalProno > 0 ? (totalSign / totalProno * 100).toFixed(1) : 0;

    if (statExactRatio) statExactRatio.innerHTML = `${totalExact} <span style="font-size: 0.8rem; font-weight: 400; opacity: 0.7;">(${exactRatio}%)</span>`;
    if (statSignRatio) statSignRatio.innerHTML = `${totalSign} <span style="font-size: 0.8rem; font-weight: 400; opacity: 0.7;">(${signRatio}%)</span>`;
  }

  // Populate drop-down list of participants for the Fase Finale tabellone
  function initFaseFinale() {
    if (!tabelloneUserSelector) return;
    
    // Clear and set real as default
    tabelloneUserSelector.innerHTML = '<option value="reale">Reale (Mondiale 2026)</option>';
    
    // Sort participants by name
    const partecipanti = Object.keys(globalPronostici.partecipanti).sort();
    partecipanti.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      tabelloneUserSelector.appendChild(opt);
    });

    // Add event listener
    tabelloneUserSelector.addEventListener("change", (e) => {
      renderTabellone(e.target.value);
    });

    // Setup Mobile Navigation Scroll-Sync for the Bracket
    const mobileBtns = document.querySelectorAll(".bracket-nav-btn");
    if (mobileBtns.length > 0 && fasefinaleBracketContainer) {
      mobileBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const colIndex = parseInt(btn.getAttribute("data-col"), 10);
          const columns = fasefinaleBracketContainer.querySelectorAll(".bracket-column");
          if (columns[colIndex]) {
            columns[colIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
          mobileBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });

      // Synchronize scroll swipe with navigation buttons
      fasefinaleBracketContainer.addEventListener("scroll", () => {
        const columns = fasefinaleBracketContainer.querySelectorAll(".bracket-column");
        if (columns.length === 0) return;
        
        let activeIndex = 0;
        let minDiff = Infinity;
        const containerCenter = fasefinaleBracketContainer.scrollLeft + (fasefinaleBracketContainer.clientWidth / 2);

        columns.forEach((col, idx) => {
          const colCenter = col.offsetLeft + (col.clientWidth / 2);
          const diff = Math.abs(containerCenter - colCenter);
          if (diff < minDiff) {
            minDiff = diff;
            activeIndex = idx;
          }
        });

        mobileBtns.forEach((btn, idx) => {
          if (idx === activeIndex) {
            btn.classList.add("active");
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } else {
            btn.classList.remove("active");
          }
        });
      });
    }

    // Draw real bracket by default
    renderTabellone("reale");
  }

  // Helper to resolve placeholders like W74 and L101 dynamically
  function resolveTeam(placeholder, resolvedMap, userKey, userPassaggio) {
    if (!placeholder) return "-";
    const cleanPlaceholder = placeholder.trim();
    
    if (cleanPlaceholder.startsWith("W")) {
      const prevMatchId = parseInt(cleanPlaceholder.slice(1), 10);
      if (resolvedMap[prevMatchId]) {
        return resolvedMap[prevMatchId].winner || `Vinc. ${prevMatchId}`;
      }
      return `Vinc. ${prevMatchId}`;
    }
    
    if (cleanPlaceholder.startsWith("L")) {
      const prevMatchId = parseInt(cleanPlaceholder.slice(1), 10);
      if (resolvedMap[prevMatchId]) {
        return resolvedMap[prevMatchId].loser || `Perd. ${prevMatchId}`;
      }
      return `Perd. ${prevMatchId}`;
    }
    
    return cleanPlaceholder;
  }

  // Helper to determine the winner and loser of a match for the selected bracket view
  function getWinnerLoser(m, homeResolved, awayResolved, userKey, userDati) {
    const realConcluded = m.conclusa;
    
    if (userKey === "reale") {
      if (realConcluded) {
        if (m.home_score > m.away_score) return { winner: homeResolved, loser: awayResolved };
        if (m.away_score > m.home_score) return { winner: awayResolved, loser: homeResolved };
        
        // Draw (penalties): check real passaggio_turno for who qualified
        const realPassaggio = globalPartiteData.passaggio_turno || {};
        const nextPhaseKey = m.fase;
        if (nextPhaseKey && realPassaggio[nextPhaseKey]) {
          const nextList = realPassaggio[nextPhaseKey].map(t => t.toLowerCase().trim());
          if (nextList.includes(homeResolved.toLowerCase().trim())) {
            return { winner: homeResolved, loser: awayResolved };
          }
          if (nextList.includes(awayResolved.toLowerCase().trim())) {
            return { winner: awayResolved, loser: homeResolved };
          }
        }
        return { winner: homeResolved, loser: awayResolved };
      } else {
        return { winner: `W${m.id}`, loser: `L${m.id}` };
      }
    }
    
    // User predictions
    const userPassaggio = userDati?.passaggio_turno || {};
    const nextPhaseKey = m.fase;
    
    let userWinner = null;
    let userLoser = null;

    // 1. Try to find the winner from predicted score (if not a tie)
    const userPartite = userDati?.partite || {};
    const pred = userPartite[m.id];
    if (pred && pred.home_score !== null && pred.away_score !== null) {
      if (pred.home_score > pred.away_score) {
        userWinner = homeResolved;
        userLoser = awayResolved;
      } else if (pred.away_score > pred.home_score) {
        userWinner = awayResolved;
        userLoser = homeResolved;
      }
    }

    // 2. Fall back to passaggio_turno list
    if (!userWinner && nextPhaseKey) {
      const uQualifiers = userPassaggio[nextPhaseKey] || [];
      const cleanQualifiers = uQualifiers.map(t => t.toLowerCase().trim());
      
      if (cleanQualifiers.includes(homeResolved.toLowerCase().trim())) {
        userWinner = homeResolved;
        userLoser = awayResolved;
      } else if (cleanQualifiers.includes(awayResolved.toLowerCase().trim())) {
        userWinner = awayResolved;
        userLoser = homeResolved;
      }
    }

    // 3. Special check for Champion prediction in match 104
    if (m.id === 104) {
      const uChamp = userPassaggio.vincitore || userDati?.premi_finali?.vincitore;
      if (uChamp) {
        if (uChamp.toLowerCase().trim() === homeResolved.toLowerCase().trim()) {
          userWinner = homeResolved;
          userLoser = awayResolved;
        } else if (uChamp.toLowerCase().trim() === awayResolved.toLowerCase().trim()) {
          userWinner = awayResolved;
          userLoser = homeResolved;
        }
      }
    }

    // Fallback: default to homeResolved or real winner
    if (!userWinner) {
      if (realConcluded) {
        if (m.home_score > m.away_score) {
          userWinner = homeResolved;
          userLoser = awayResolved;
        } else {
          userWinner = awayResolved;
          userLoser = homeResolved;
        }
      } else {
        userWinner = homeResolved;
        userLoser = awayResolved;
      }
    }

    return { winner: userWinner, loser: userLoser };
  }

  // Render bracket tree and validate predictions
  function renderTabellone(userKey) {
    currentTabelloneUserKey = userKey;
    if (!fasefinaleBracketContainer) return;
    fasefinaleBracketContainer.innerHTML = "";

    // Reset mobile navigation highlights and scroll position
    fasefinaleBracketContainer.scrollLeft = 0;
    const mobileBtns = document.querySelectorAll(".bracket-nav-btn");
    mobileBtns.forEach((btn, idx) => {
      if (idx === 0) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    const userDati = userKey !== "reale" ? globalPronostici.partecipanti[userKey] : null;
    const userPassaggio = userDati ? (userDati.passaggio_turno || {}) : {};
    const realPassaggio = globalPartiteData.passaggio_turno || {};

    // 1. Resolve all matches chronologically
    const resolved = {};
    const knockoutMatches = globalPartiteData.partite.filter(p => p.fase !== 'gironi');
    knockoutMatches.sort((a, b) => a.id - b.id);

    knockoutMatches.forEach(m => {
      const homeResolved = resolveTeam(m.home, resolved, userKey, userPassaggio);
      const awayResolved = resolveTeam(m.away, resolved, userKey, userPassaggio);
      const outcome = getWinnerLoser(m, homeResolved, awayResolved, userKey, userDati);

      resolved[m.id] = {
        id: m.id,
        fase: m.fase,
        giorno: m.giorno,
        data: m.data,
        conclusa: m.conclusa,
        home: homeResolved,
        away: awayResolved,
        home_score: userKey === "reale" ? m.home_score : (userDati?.partite?.[m.id]?.home_score ?? null),
        away_score: userKey === "reale" ? m.away_score : (userDati?.partite?.[m.id]?.away_score ?? null),
        real_home_score: m.home_score,
        real_away_score: m.away_score,
        winner: outcome.winner,
        loser: outcome.loser
      };
    });

    // Helper to determine if a name is a placeholder
    function isPlaceholder(name) {
      if (!name) return true;
      const n = name.trim();
      return n.startsWith("W") || n.startsWith("L") || n.startsWith("Vinc.") || n.startsWith("Perd.") || n.match(/^\d+[A-L]$/) || n.match(/^\d+$/);
    }

    // Helper to validate team predictions and return CSS class + status icon
    function getTeamStatus(team, stage, m, isWinner) {
      if (userKey === "reale") {
        if (m.conclusa) {
          const isRealWinner = (m.real_home_score > m.real_away_score && team === m.home) || 
                               (m.real_away_score > m.real_home_score && team === m.away) ||
                               (m.real_home_score === m.real_away_score && (realPassaggio[m.fase] || []).map(t=>t.toLowerCase().trim()).includes(team.toLowerCase().trim()));
          return {
            classes: isRealWinner ? "winner-highlight" : "loser-dimmed",
            icon: isRealWinner ? '<i class="fa-solid fa-check" style="font-size: 0.75rem; margin-right: 4px;"></i>' : ""
          };
        }
        return { classes: "", icon: "" };
      }

      if (isPlaceholder(team)) {
        return { classes: "team-predicted-pending", icon: '<i class="fa-regular fa-clock"></i>' };
      }

      // Check if team reached this stage in real life
      let reachedReal = false;
      let realList = [];
      
      if (stage === "sedicesimi") {
        realList = realPassaggio.sedicesimi || [];
      } else if (stage === "ottavi") {
        realList = realPassaggio.ottavi || [];
      } else if (stage === "quarti") {
        realList = realPassaggio.quarti || [];
      } else if (stage === "semifinali") {
        realList = realPassaggio.semifinali || [];
      } else if (stage === "finale") {
        realList = realPassaggio.finale || [];
      } else if (stage === "campione") {
        realList = [realPassaggio.vincitore || ""];
      }

      if (realList.length === 0) {
        return { classes: "team-predicted-pending", icon: '<i class="fa-regular fa-clock"></i>' };
      }
      reachedReal = realList.map(t => t.toLowerCase().trim()).includes(team.toLowerCase().trim());

      if (!reachedReal) {
        return { classes: "team-predicted-incorrect", icon: '<i class="fa-solid fa-circle-xmark"></i>' };
      }

      // If it reached real stage, and is not predicted winner, it's correct so far
      if (!isWinner) {
        return { classes: "team-predicted-correct", icon: '<i class="fa-solid fa-circle-check"></i>' };
      }

      // If it is predicted winner, verify next stage qualification
      let nextRealList = [];
      let isChamp = false;

      if (stage === "sedicesimi") nextRealList = realPassaggio.ottavi || [];
      else if (stage === "ottavi") nextRealList = realPassaggio.quarti || [];
      else if (stage === "quarti") nextRealList = realPassaggio.semifinali || [];
      else if (stage === "semifinali") nextRealList = realPassaggio.finale || [];
      else if (stage === "finale" || stage === "campione") isChamp = true;

      if (isChamp) {
        const rChamp = realPassaggio.vincitore || globalPartiteData.premi_finali?.vincitore;
        if (rChamp && rChamp.toLowerCase().trim() === team.toLowerCase().trim()) {
          return { classes: "team-predicted-correct", icon: '<i class="fa-solid fa-circle-check"></i>' };
        } else if (rChamp) {
          return { classes: "team-predicted-incorrect", icon: '<i class="fa-solid fa-circle-xmark"></i>' };
        } else {
          return { classes: "team-predicted-pending", icon: '<i class="fa-regular fa-clock"></i>' };
        }
      }

      if (nextRealList.length === 0) {
        return { classes: "team-predicted-pending", icon: '<i class="fa-regular fa-clock"></i>' };
      }

      const qualifiedNext = nextRealList.map(t => t.toLowerCase().trim()).includes(team.toLowerCase().trim());
      if (qualifiedNext) {
        return { classes: "team-predicted-correct", icon: '<i class="fa-solid fa-circle-check"></i>' };
      } else {
        return { classes: "team-predicted-incorrect", icon: '<i class="fa-solid fa-circle-xmark"></i>' };
      }
    }

    // Build the visual columns
    const columns = [
      { key: "sedicesimi", label: "Sedicesimi" },
      { key: "ottavi", label: "Ottavi" },
      { key: "quarti", label: "Quarti" },
      { key: "semifinali", label: "Semifinali" },
      { key: "finale", label: "Finale" },
      { key: "campione", label: "Vincitore" }
    ];

    // Define correct vertical sequence of matches to ensure binary tree alignment
    const bracketOrder = {
      sedicesimi: [79, 80, 76, 78, 85, 87, 86, 88, 81, 82, 83, 84, 74, 77, 73, 75],
      ottavi: [92, 91, 96, 95, 94, 93, 89, 90],
      quarti: [99, 100, 98, 97],
      semifinali: [102, 101],
      finale: [104, 103]
    };

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "bracket-scroll-wrapper";

    columns.forEach(col => {
      const colDiv = document.createElement("div");
      colDiv.className = "bracket-column";
      colDiv.innerHTML = `<h3>${col.label}</h3>`;

      const matchesDiv = document.createElement("div");
      matchesDiv.className = "bracket-column-matches";

      const colMatches = Object.values(resolved).filter(m => {
        if (col.key === "finale") {
          return m.fase === "finale";
        }
        return m.fase === col.key;
      });

      // Sort matches in each column according to the custom bracketOrder
      const order = bracketOrder[col.key];
      if (order) {
        colMatches.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }

      colMatches.forEach(m => {
        const isHomeWinner = m.winner === m.home;
        const isAwayWinner = m.winner === m.away;

        const homeStatus = getTeamStatus(m.home, m.fase, m, isHomeWinner);
        const awayStatus = getTeamStatus(m.away, m.fase, m, isAwayWinner);

        const homeScore = m.home_score !== null ? m.home_score : "-";
        const awayScore = m.away_score !== null ? m.away_score : "-";

        let scoreDisplay = "";
        if (m.home_score !== null && m.away_score !== null) {
          scoreDisplay = `<span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:600;">${homeScore} - ${awayScore}</span>`;
        }

        const matchNode = document.createElement("div");
        matchNode.className = "bracket-match-node";
        matchNode.setAttribute("data-match-id", m.id);
        
        let matchLabel = m.fase === "finale" ? (m.id === 104 ? "Finale 1° Posto" : "Finale 3° Posto") : `Match ID: ${m.id}`;

        matchNode.innerHTML = `
          <div class="bracket-node-header" style="display:flex; justify-content:space-between;">
            <span>${matchLabel}</span>
            <span>${scoreDisplay}</span>
          </div>
          <div class="bracket-node-teams">
            <div class="bracket-node-team ${homeStatus.classes}" data-team-name="${m.home}">
              <span class="team-name">
                ${homeStatus.icon} ${getFlagEmoji(m.home)} ${m.home}
              </span>
            </div>
            <div class="bracket-node-team ${awayStatus.classes}" data-team-name="${m.away}">
              <span class="team-name">
                ${awayStatus.icon} ${getFlagEmoji(m.away)} ${m.away}
              </span>
            </div>
          </div>
        `;
        
        // Make matches clickable to view prediction detail in modal (ONLY when displaying the REAL bracket)
        if (userKey === "reale") {
          matchNode.style.cursor = "pointer";
          const rawMatch = globalPartiteData.partite.find(pm => pm.id === m.id);
          matchNode.addEventListener("click", () => openMatchModal(rawMatch));
        } else {
          matchNode.style.cursor = "default";
        }

        matchesDiv.appendChild(matchNode);
      });

      // Render the Champion card in the dedicated 'campione' column
      if (col.key === "campione") {
        const finalMatch = resolved[104];
        const champion = finalMatch ? finalMatch.winner : null;

        const champNode = document.createElement("div");
        champNode.className = "bracket-match-node winner-node";
        champNode.setAttribute("data-match-id", "champion");

        if (champion && !isPlaceholder(champion)) {
          const isChampWinner = true;
          const champStatus = getTeamStatus(champion, "campione", finalMatch, isChampWinner);

          champNode.innerHTML = `
            <div class="bracket-node-header" style="color: var(--accent-gold); font-weight: 800; text-align: center;">
              <i class="fa-solid fa-crown"></i> Campione del Mondo
            </div>
            <div class="bracket-node-teams" style="margin-top: 5px;">
              <div class="bracket-node-team ${champStatus.classes}" data-team-name="${champion}" style="justify-content: center; text-align: center;">
                <span class="team-name" style="font-weight: 700; font-size: 0.9rem;">
                  ${champStatus.icon} ${getFlagEmoji(champion)} ${champion}
                </span>
              </div>
            </div>
          `;
        } else {
          champNode.innerHTML = `
            <div class="bracket-node-header" style="color: var(--color-text-muted); font-weight: 700; text-align: center;">
              <i class="fa-solid fa-crown"></i> Campione del Mondo
            </div>
            <div class="bracket-node-teams" style="margin-top: 5px;">
              <div class="bracket-node-team team-predicted-pending" style="justify-content: center; text-align: center;">
                <span class="team-name" style="font-weight: 500; font-size: 0.82rem;">
                  <i class="fa-regular fa-clock"></i> In attesa della finale
                </span>
              </div>
            </div>
          `;
        }
        matchesDiv.appendChild(champNode);
      }

      colDiv.appendChild(matchesDiv);
      scrollWrapper.appendChild(colDiv);
    });

    fasefinaleBracketContainer.appendChild(scrollWrapper);

    // Draw the dynamic SVG connector paths between parent and child nodes
    function drawBracketLines(resolvedData) {
      const oldSvg = document.getElementById("bracket-svg");
      if (oldSvg) oldSvg.remove();

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", "bracket-svg");
      
      if (window.getComputedStyle(scrollWrapper).position === "static") {
        scrollWrapper.style.position = "relative";
      }
      scrollWrapper.appendChild(svg);

      const rectWrapper = scrollWrapper.getBoundingClientRect();

      // Parent to child map [parentId, childId]
      const connections = [
        // Sedicesimi to Ottavi
        [79, 92], [80, 92],
        [76, 91], [78, 91],
        [85, 96], [87, 96],
        [86, 95], [88, 95],
        [81, 94], [82, 94],
        [83, 93], [84, 93],
        [74, 89], [77, 89],
        [73, 90], [75, 90],

        // Ottavi to Quarti
        [92, 99], [91, 99],
        [96, 100], [95, 100],
        [94, 98], [93, 98],
        [89, 97], [90, 97],

        // Quarti to Semifinali
        [99, 102], [100, 102],
        [98, 101], [97, 101],

        // Semifinali to Finale
        [102, 104], [101, 104],

        // Finale to Champion
        [104, "champion"]
      ];

      connections.forEach(([pId, cId]) => {
        const pEl = document.querySelector(`[data-match-id="${pId}"]`);
        const cEl = document.querySelector(`[data-match-id="${cId}"]`);

        if (pEl && cEl) {
          const pRect = pEl.getBoundingClientRect();
          const cRect = cEl.getBoundingClientRect();

          const xA = pRect.right - rectWrapper.left;
          const yA = pRect.top + pRect.height / 2 - rectWrapper.top;

          const xB = cRect.left - rectWrapper.left;
          const yB = cRect.top + cRect.height / 2 - rectWrapper.top;

          const xMid = (xA + xB) / 2;
          const d = `M ${xA} ${yA} H ${xMid} V ${yB} H ${xB}`;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", d);
          path.setAttribute("fill", "none");
          
          // Trace if the team that won the parent match is in the child match
          let isHighlighted = false;
          const pMatch = resolvedData[pId];
          const pWinner = pMatch ? pMatch.winner : null;

          if (pWinner && !isPlaceholder(pWinner)) {
            if (cId === "champion") {
              isHighlighted = true;
            } else {
              const cMatch = resolvedData[cId];
              if (cMatch && (cMatch.home === pWinner || cMatch.away === pWinner)) {
                // Confirm the team isn't marked as incorrect prediction in the child match
                const cTeamEl = cEl.querySelector(`[data-team-name="${pWinner}"]`);
                if (!cTeamEl || !cTeamEl.classList.contains("team-predicted-incorrect")) {
                  isHighlighted = true;
                }
              }
            }
          }

          if (isHighlighted) {
            path.setAttribute("class", "bracket-path-active");
          } else {
            path.setAttribute("class", "bracket-path-inactive");
          }

          svg.appendChild(path);
        }
      });
    }

    // Save active redraw function reference and call it
    drawBracketLinesRef = drawBracketLines;
    drawBracketLines(resolved);
    
    // Warn if player has not filled bracket
    if (userKey !== "reale" && (!userPassaggio || Object.keys(userPassaggio).length === 0)) {
      const warning = document.createElement("div");
      warning.className = "badge badge-pending";
      warning.style.display = "block";
      warning.style.textAlign = "center";
      warning.style.padding = "10px";
      warning.style.marginBottom = "15px";
      warning.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Il partecipante non ha ancora compilato il tabellone fase finale (mostrato tabellone reale).`;
      fasefinaleBracketContainer.insertBefore(warning, fasefinaleBracketContainer.firstChild);
    }
  }

  // Redraw SVG bracket lines on window resize
  window.addEventListener("resize", () => {
    const tabFaseFinale = document.getElementById("tab-fasefinale");
    if (tabFaseFinale && tabFaseFinale.classList.contains("active") && drawBracketLinesRef) {
      drawBracketLinesRef();
    }
  });

  // Load database on start
  fetchDatabases();
});
