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
  const userBracketList = document.getElementById("user-bracket-list");
  const userAwardsList = document.getElementById("user-awards-list");

  // Home Tab Elements
  const homeTodayDate = document.getElementById("home-today-date");
  const homeTodayContainer = document.getElementById("home-today-container");

  // Statistics Tab Elements
  const statExactRatio = document.getElementById("stat-exact-ratio");
  const statSignRatio = document.getElementById("stat-sign-ratio");
  const hardestMatchesList = document.getElementById("hardest-matches-list");
  const easiestMatchesList = document.getElementById("easiest-matches-list");

  // Initialize Tabs Navigation
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Deactivate all tabs and contents
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      // Activate clicked tab and corresponding content
      tab.classList.add("active");
      const targetContent = document.getElementById(tab.getAttribute("data-tab"));
      if (targetContent) {
        targetContent.classList.add("active");
      }

      // Smooth scroll to content area on mobile devices
      if (window.innerWidth <= 768) {
        document.querySelector(".content-area")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Fetch all databases in parallel
  async function fetchDatabases() {
    try {
      const [classificaRes, partiteRes, pronosticiRes] = await Promise.all([
        fetch("classifica.json?t=" + Date.now()),
        fetch("partite.json?t=" + Date.now()),
        fetch("pronostici.json?t=" + Date.now())
      ]);

      if (!classificaRes.ok || !partiteRes.ok || !pronosticiRes.ok) {
        throw new Error("Impossibile caricare uno o più database statici.");
      }

      globalClassifica = await classificaRes.json();
      globalPartiteData = await partiteRes.json();
      globalPronostici = await pronosticiRes.json();

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

    // 6. Render Home Matches of the Day
    renderHome();

    // 7. Render Statistics Tab
    renderStatistiche();

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
      } else if (index === 1) {
        posClass = "pos-badge pos-2";
        posContent = `<i class="fa-solid fa-medal"></i>`;
      } else if (index === 2) {
        posClass = "pos-badge pos-3";
        posContent = `<i class="fa-solid fa-medal"></i>`;
      }

      row.innerHTML = `
        <td style="text-align: center;"><span class="${posClass}">${posContent}</span></td>
        <td><span class="player-name">${player.nome}</span></td>
        <td style="text-align: center;"><span class="points-val">${player.punti}</span></td>
        <td style="text-align: center;" class="hide-mobile badge-exact-col">${player.risultati_esatti}</td>
        <td style="text-align: center;" class="hide-mobile badge-sign-col">${player.prono_esatti}</td>
        <td style="text-align: center;" class="hide-mobile" style="opacity: 0.8;">${player.errori}</td>
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

      card.innerHTML = `
        <div class="match-header">
          <span class="match-stage">${detailsText}</span>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${formatDate(match.data)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.home)}</span>
              ${match.home}
            </span>
            <span class="team-score">${homeScore}</span>
          </div>
          <div class="team-row">
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
    userBracketList.innerHTML = "";
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

    // --- Render Bracket Qualified Teams ---
    const userPassaggio = userDati.passaggio_turno;
    const realPassaggio = globalPartiteData.passaggio_turno || {};

    if (!userPassaggio) {
      userBracketList.innerHTML = `
        <div class="badge badge-pending" style="display: block; text-align: center; padding: 12px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Nessun pronostico fase finale inserito.
        </div>
      `;
    } else {
      let bracketHtml = "";
      const phases = [
        { key: "sedicesimi", label: "Sedicesimi di Finale (Passano agli Ottavi)" },
        { key: "ottavi", label: "Ottavi di Finale (Passano ai Quarti)" },
        { key: "quarti", label: "Quarti di Finale (Passano alle Semifinali)" },
        { key: "semifinali", label: "Semifinali (Passano in Finale)" },
        { key: "finale", label: "Finale (Vincitrice & Finalista)" }
      ];

      phases.forEach(phase => {
        const userTeams = userPassaggio[phase.key] || [];
        const realTeams = realPassaggio[phase.key] || [];
        
        let chipsHtml = "";
        
        if (userTeams.length === 0) {
          chipsHtml = `<span style="font-size: 0.85rem; color: var(--color-text-muted);">Nessuna squadra pronosticata per questo turno.</span>`;
        } else {
          userTeams.forEach(team => {
            let chipClass = "team-unchecked";
            let iconHtml = `<i class="fa-regular fa-circle"></i>`;
            
            // Clean up to compare
            const cleanTeam = team.trim().toLowerCase();
            const cleanRealList = realTeams.map(t => t.trim().toLowerCase());
            
            if (realTeams && realTeams.length > 0) {
              if (cleanRealList.includes(cleanTeam)) {
                chipClass = "team-correct";
                iconHtml = `<i class="fa-solid fa-circle-check"></i>`;
              } else {
                chipClass = "team-incorrect";
                iconHtml = `<i class="fa-solid fa-circle-xmark"></i>`;
              }
            }
            
            chipsHtml += `
              <span class="bracket-team-chip ${chipClass}">
                ${iconHtml} ${getFlagEmoji(team)} ${team}
              </span>
            `;
          });
        }

        bracketHtml += `
          <div class="bracket-round-block">
            <h4>${phase.label}</h4>
            <div class="bracket-teams-flex">
              ${chipsHtml}
            </div>
          </div>
        `;
      });

      // Add Bracket Winner Check
      const uWinner = userPassaggio.vincitore;
      const rWinner = realPassaggio.vincitore;
      let winnerChipClass = "team-unchecked";
      let winnerIcon = `<i class="fa-regular fa-circle"></i>`;
      
      if (uWinner) {
        if (rWinner) {
          if (uWinner.trim().toLowerCase() === rWinner.trim().toLowerCase()) {
            winnerChipClass = "team-correct";
            winnerIcon = `<i class="fa-solid fa-circle-check"></i>`;
          } else {
            winnerChipClass = "team-incorrect";
            winnerIcon = `<i class="fa-solid fa-circle-xmark"></i>`;
          }
        }
        bracketHtml += `
          <div class="bracket-round-block" style="margin-top: 15px;">
            <h4>Vincitore Finale Tabellone (+1 pt)</h4>
            <div class="bracket-teams-flex">
              <span class="bracket-team-chip ${winnerChipClass}">
                ${winnerIcon} ${getFlagEmoji(uWinner)} ${uWinner}
              </span>
            </div>
          </div>
        `;
      }

      userBracketList.innerHTML = bracketHtml;
    }

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

  // Render Home Tab - Matches of the Day
  function renderHome() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (homeTodayDate) {
      homeTodayDate.textContent = today.toLocaleDateString('it-IT', options);
    }

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const todayMatches = globalPartiteData.partite.filter(match => match.data.startsWith(todayStr));

    if (!homeTodayContainer) return;
    homeTodayContainer.innerHTML = "";

    if (todayMatches.length === 0) {
      homeTodayContainer.innerHTML = `
        <div class="col-span-2 home-empty-box" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-calendar-xmark"></i>
          Nessuna partita in programma per oggi.
        </div>
      `;
      return;
    }

    todayMatches.forEach(match => {
      const card = document.createElement("div");
      card.className = "match-card";

      const badgeClass = match.conclusa ? "badge-finished" : "badge-pending";
      const badgeText = match.conclusa ? "Conclusa" : "Da Giocare";
      
      const homeScore = match.home_score !== null ? match.home_score : "-";
      const awayScore = match.away_score !== null ? match.away_score : "-";
      
      const detailsText = match.fase === "gironi" ? `Gruppo ${match.gruppo}` : match.fase.toUpperCase();

      card.innerHTML = `
        <div class="match-header">
          <span class="match-stage">${detailsText}</span>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${formatDate(match.data)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row">
            <span class="team-name">
              <span class="team-flag-mock">${getFlagEmoji(match.home)}</span>
              ${match.home}
            </span>
            <span class="team-score">${homeScore}</span>
          </div>
          <div class="team-row">
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

  // Render Statistics Tab
  function renderStatistiche() {
    // 1. Calculate General Aggregates
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



    // 3. Analyze & Render Match Difficulty
    const completedMatches = globalPartiteData.partite.filter(match => match.conclusa);
    const matchStats = [];

    completedMatches.forEach(match => {
      let totalMatchPoints = 0;
      let participantsCount = 0;

      Object.keys(globalPronostici.partecipanti).forEach(username => {
        const userDati = globalPronostici.partecipanti[username];
        if (userDati) {
          participantsCount++;
          const userPartite = userDati.partite || {};
          const pred = userPartite[match.id];
          if (pred) {
            if (match.home_score === pred.home_score && match.away_score === pred.away_score) {
              totalMatchPoints += 3;
            } else {
              const realSign = getSign(match.home_score, match.away_score);
              const predSign = getSign(pred.home_score, pred.away_score);
              if (realSign === predSign) {
                totalMatchPoints += 1;
              }
            }
          }
        }
      });

      const avgMatchPoints = participantsCount > 0 ? totalMatchPoints / participantsCount : 0;
      matchStats.push({
        match,
        avgPoints: avgMatchPoints
      });
    });

    const hardest = [...matchStats].sort((a, b) => a.avgPoints - b.avgPoints).slice(0, 3);
    const easiest = [...matchStats].sort((a, b) => b.avgPoints - a.avgPoints).slice(0, 3);

    function renderDifficultyList(container, matchesList, type) {
      if (!container) return;
      container.innerHTML = "";

      if (matchesList.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--color-text-muted); padding: 10px 0; text-align: center;">Nessun dato disponibile (nessuna partita conclusa).</p>`;
        return;
      }

      matchesList.forEach(item => {
        const m = item.match;
        const row = document.createElement("div");
        row.className = "difficulty-match-row";
        row.style.cursor = "pointer";
        row.style.display = "block"; // override flex for vertical layout with colpaccio

        const badgeClass = type === "hard" ? "diff-score-badge hard" : "diff-score-badge easy";
        const stageLabel = m.fase === "gironi" ? `Gruppo ${m.gruppo}` : m.fase.toUpperCase();

        // Calculate colpaccio for hard matches
        let colpaccioHtml = "";
        if (type === "hard") {
          const exactGuesses = [];
          Object.keys(globalPronostici.partecipanti).forEach(username => {
            const userDati = globalPronostici.partecipanti[username];
            if (userDati) {
              const userPartite = userDati.partite || {};
              const pred = userPartite[m.id];
              if (pred && m.home_score === pred.home_score && m.away_score === pred.away_score) {
                exactGuesses.push(username);
              }
            }
          });
          if (exactGuesses.length > 0) {
            colpaccioHtml = `<div class="diff-match-colpaccio" style="font-size: 0.78rem; color: var(--accent-gold); margin-top: 8px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-bullseye"></i> <strong>Colpaccio:</strong> ${exactGuesses.join(", ")}
            </div>`;
          } else {
            colpaccioHtml = `<div class="diff-match-colpaccio" style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 8px; display: flex; align-items: center; gap: 6px; opacity: 0.6;">
              <i class="fa-solid fa-face-frown-open"></i> Nessun ris. esatto indovinato
            </div>`;
          }
        }

        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div class="diff-match-info">
              <div class="diff-match-teams">
                ${getFlagEmoji(m.home)} ${m.home} ${m.home_score} - ${m.away_score} ${m.away} ${getFlagEmoji(m.away)}
              </div>
              <div class="diff-match-meta">
                ${stageLabel} &bull; ID Partita: ${m.id}
              </div>
            </div>
            <div class="${badgeClass}">
              ${item.avgPoints.toFixed(2)} pt
            </div>
          </div>
          ${colpaccioHtml}
        `;

        row.addEventListener("click", () => openMatchModal(m));
        container.appendChild(row);
      });
    }

    renderDifficultyList(hardestMatchesList, hardest, "hard");
    renderDifficultyList(easiestMatchesList, easiest, "easy");

  }

  // Load database on start
  fetchDatabases();
});
