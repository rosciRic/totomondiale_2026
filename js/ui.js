import { state } from './state.js';
import { formatDate, getFlagEmoji, getSign } from './helpers.js';
import { switchTab } from './navigation.js';

// DOM Elements Cache
const statParticipants = document.getElementById("stat-participants");
const statLeader = document.getElementById("stat-leader");
const statMatches = document.getElementById("stat-matches");
const statPoints = document.getElementById("stat-points");
const classificaSearch = document.getElementById("classifica-search");
const classificaBody = document.getElementById("classifica-body");
const filterStage = document.getElementById("filter-stage");
const filterStatus = document.getElementById("filter-status");
const matchesContainer = document.getElementById("matches-container");
const userSelector = document.getElementById("user-selector");
const userSummaryStats = document.getElementById("user-summary-stats");
const userMatchesList = document.getElementById("user-matches-list");
const userAwardsList = document.getElementById("user-awards-list");
const scoreCalculationContainer = document.getElementById("score-calculation-container");
const homeTodayDate = document.getElementById("home-today-date");
const homeTodayContainer = document.getElementById("home-today-container");
const tabelloneUserSelector = document.getElementById("tabellone-user-selector");
const fasefinaleBracketContainer = document.getElementById("fasefinale-bracket-container");

// Register callbacks in state to prevent circular dependencies
state.resetCalendarToTodayRef = resetCalendarToToday;

// Calculate and display top widgets metrics
export function renderDashboardMetrics() {
  if (statParticipants) statParticipants.textContent = state.globalClassifica.length;
  
  if (statLeader) {
    if (state.globalClassifica.length > 0) {
      statLeader.textContent = state.globalClassifica[0].nome;
    } else {
      statLeader.textContent = "Nessuno";
    }
  }

  const completedCount = state.globalPartiteData.partite.filter(p => p.conclusa).length;
  const totalMatches = state.globalPartiteData.partite.length;
  if (statMatches) statMatches.textContent = `${completedCount} / ${totalMatches}`;

  const progressBar = document.getElementById("stat-matches-progress");
  if (progressBar && totalMatches > 0) {
    const percentage = (completedCount / totalMatches) * 100;
    progressBar.style.width = `${percentage}%`;
  }

  const totalPts = state.globalClassifica.reduce((sum, item) => sum + item.punti, 0);
  if (statPoints) statPoints.textContent = totalPts;
}

// Calculate and display Montepremi and Quote based on actual classification size
export function renderMontepremi() {
  const rulesParticipants = document.getElementById("rules-participants");
  const rulesTotalJackpot = document.getElementById("rules-total-jackpot");
  const jackpot1Pct = document.getElementById("jackpot-1-pct");
  const jackpot1Amount = document.getElementById("jackpot-1-amount");
  const jackpot2Pct = document.getElementById("jackpot-2-pct");
  const jackpot2Amount = document.getElementById("jackpot-2-amount");
  const jackpot3Pct = document.getElementById("jackpot-3-pct");
  const jackpot3Amount = document.getElementById("jackpot-3-amount");

  if (!rulesParticipants || !rulesTotalJackpot) return;

  const N = state.globalClassifica.length;
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
export function renderLeaderboard() {
  if (!classificaBody) return;
  classificaBody.innerHTML = "";
  
  if (state.globalClassifica.length === 0) {
    classificaBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nessun partecipante in classifica.</td></tr>`;
    return;
  }

  state.globalClassifica.forEach((player, index) => {
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
      <td style="text-align: center; color: var(--accent-purple); font-weight: 600;" class="hide-mobile badge-tabellone-col">${player.punti_tabellone ?? 0}</td>
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

    // Click behavior: Toggles accordion on mobile, navigates directly on desktop
    row.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        const detailRowKey = player.nome.toLowerCase();
        const existingDetailRow = classificaBody.querySelector(`.player-detail-row[data-for="${detailRowKey}"]`);

        const closeAccordion = (detailRow, mainRow) => {
          if (mainRow) mainRow.classList.remove("accordion-expanded");
          const card = detailRow.querySelector(".player-detail-card");
          if (card) {
            card.classList.add("slide-up");
            setTimeout(() => {
              detailRow.remove();
            }, 250);
          } else {
            detailRow.remove();
          }
        };

        if (existingDetailRow) {
          closeAccordion(existingDetailRow, row);
        } else {
          // Close other open accordions
          classificaBody.querySelectorAll(".player-detail-row").forEach(r => {
            closeAccordion(r, r.previousElementSibling);
          });

          // Create detail accordion row
          const detailRow = document.createElement("tr");
          detailRow.className = "player-detail-row";
          detailRow.setAttribute("data-for", detailRowKey);
          detailRow.innerHTML = `
            <td colspan="4">
              <div class="player-detail-card">
                <div class="detail-badge">
                  <span>Risultati Esatti (+3)</span>
                  <strong style="color: var(--accent-green)">${player.risultati_esatti}</strong>
                </div>
                <div class="detail-badge">
                  <span>Esiti 1X2 (+1)</span>
                  <strong style="color: var(--accent-gold)">${player.prono_esatti}</strong>
                </div>
                <div class="detail-badge">
                  <span>Tabellone (+1)</span>
                  <strong style="color: var(--accent-purple)">${player.punti_tabellone ?? 0}</strong>
                </div>
                <div class="detail-badge">
                  <span>Errori</span>
                  <strong style="color: var(--accent-red)">${player.errori}</strong>
                </div>
              </div>
            </td>
          `;

          detailRow.addEventListener("click", (e) => {
            e.stopPropagation();
          });

          row.classList.add("accordion-expanded");
          row.after(detailRow);
        }
      } else {
        navigateToUserPredictions(player.nome);
      }
    });

    classificaBody.appendChild(row);
  });
}

// Filter Leaderboard on search query
export function filterLeaderboard() {
  if (!classificaBody || !classificaSearch) return;
  const query = classificaSearch.value.trim().toLowerCase();

  // Close accordion rows first
  classificaBody.querySelectorAll(".player-detail-row").forEach(r => r.remove());
  classificaBody.querySelectorAll("tr").forEach(r => r.classList.remove("accordion-expanded"));

  const rows = classificaBody.querySelectorAll("tr");
  
  rows.forEach(row => {
    if (row.classList.contains("player-detail-row")) return;
    const playerName = row.getAttribute("data-player");
    if (playerName && playerName.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Navigate to user prediction tab and auto select the user
export function navigateToUserPredictions(username) {
  switchTab("tab-pronostici");
  if (userSelector) {
    userSelector.value = username;
  }
  renderUserPredictions(username);
}

// Render Matches Grid based on filters
export function renderMatches() {
  if (!matchesContainer || !filterStage || !filterStatus) return;
  matchesContainer.innerHTML = "";
  const stageFilter = filterStage.value;
  const statusFilter = filterStatus.value;

  let filteredMatches = state.globalPartiteData.partite;

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
export function openMatchModal(match) {
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

  Object.keys(state.globalPronostici.partecipanti).forEach(username => {
    const userDati = state.globalPronostici.partecipanti[username];
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
    const rankIndex = state.globalClassifica.findIndex(c => c.nome === username);
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

// Helper to get surname (everything after the first name)
function getSurname(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts.slice(1).join(" ");
}

// Populate User dropdown list
export function populateUserSelector() {
  if (!userSelector) return;
  userSelector.innerHTML = "";
  const partecipanti = Object.keys(state.globalPronostici.partecipanti).sort((a, b) => {
    const surnameA = getSurname(a).toLowerCase();
    const surnameB = getSurname(b).toLowerCase();
    return surnameA.localeCompare(surnameB) || a.localeCompare(b);
  });
  
  if (partecipanti.length === 0) {
    userSelector.innerHTML = `<option value="">Nessun utente</option>`;
    return;
  }

  partecipanti.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    userSelector.appendChild(opt);
  });

  // Default to the leader or first player
  const defaultUser = state.globalClassifica.length > 0 ? state.globalClassifica[0].nome : partecipanti[0];
  userSelector.value = defaultUser;
  renderUserPredictions(defaultUser);
}

// Render user predictions detailed breakdown
export function renderUserPredictions(username) {
  if (!userSummaryStats || !userMatchesList || !userAwardsList) return;
  userSummaryStats.innerHTML = "";
  userMatchesList.innerHTML = "";
  userAwardsList.innerHTML = "";
  if (scoreCalculationContainer) {
    scoreCalculationContainer.innerHTML = "";
  }

  const userDati = state.globalPronostici.partecipanti[username];
  if (!userDati) {
    userMatchesList.innerHTML = `<p>Nessun dato per l'utente selezionato.</p>`;
    return;
  }

  // Fetch user overall placement from classifica
  const placement = state.globalClassifica.find(c => c.nome === username) || { punti: 0, risultati_esatti: 0, prono_esatti: 0, punti_tabellone: 0, errori: 0 };
  
  // Calculate mathematical breakdown terms
  const puntiRisultati = (placement.risultati_esatti || 0) * 3;
  const puntiSegni = (placement.prono_esatti || 0) * 1;
  const puntiTabellone = (placement.punti_tabellone || 0);
  const puntiPremi = (placement.punti || 0) - (puntiRisultati + puntiSegni + puntiTabellone);

  // Render mathematical points breakdown card
  if (scoreCalculationContainer) {
    scoreCalculationContainer.innerHTML = `
      <div class="score-formula-card card">
        <div class="score-formula-header">
          <h3><i class="fa-solid fa-calculator"></i> Calcolo Punteggio Finale</h3>
          <span class="formula-subtitle">Dettaglio matematico dei punti accumulati</span>
        </div>
        <div class="score-formula-container">
          <div class="formula-term term-risultati">
            <div class="term-value">${placement.risultati_esatti || 0}</div>
            <div class="term-label">
              <span class="desktop-only-text">Risultati Esatti</span>
              <span class="mobile-only-text">Risultati Esatti: <strong>${placement.risultati_esatti || 0}</strong> <span class="term-multiplier-inline">(&times; 3 pt)</span></span>
            </div>
            <div class="term-multiplier">&times; 3 Punti</div>
            <div class="term-calc-value">+${puntiRisultati} PT</div>
          </div>
          <div class="formula-operator">+</div>
          <div class="formula-term term-segni">
            <div class="term-value">${placement.prono_esatti || 0}</div>
            <div class="term-label">
              <span class="desktop-only-text">Esiti 1X2 (Segni)</span>
              <span class="mobile-only-text">Esiti 1X2 (Segni): <strong>${placement.prono_esatti || 0}</strong> <span class="term-multiplier-inline">(&times; 1 pt)</span></span>
            </div>
            <div class="term-multiplier">&times; 1 Punto</div>
            <div class="term-calc-value">+${puntiSegni} PT</div>
          </div>
          <div class="formula-operator">+</div>
          <div class="formula-term term-tabellone">
            <div class="term-value">${placement.punti_tabellone || 0}</div>
            <div class="term-label">
              <span class="desktop-only-text">Punti Tabellone</span>
              <span class="mobile-only-text">Punti Tabellone: <strong>${placement.punti_tabellone || 0}</strong> <span class="term-multiplier-inline">(&times; 1 pt)</span></span>
            </div>
            <div class="term-multiplier">&times; 1 Punto</div>
            <div class="term-calc-value">+${puntiTabellone} PT</div>
          </div>
          <div class="formula-operator">+</div>
          <div class="formula-term term-premi">
            <div class="term-value">${puntiPremi}</div>
            <div class="term-label">
              <span class="desktop-only-text">Premi Speciali</span>
              <span class="mobile-only-text">Premi Speciali</span>
            </div>
            <div class="term-multiplier">Vincitore/Capoc./etc.</div>
            <div class="term-calc-value">+${puntiPremi} PT</div>
          </div>
          <div class="formula-operator">=</div>
          <div class="formula-total">
            <div class="total-value">${placement.punti || 0}</div>
            <div class="total-label">Punti Totali</div>
          </div>
        </div>
      </div>
    `;
  }

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
      <span>Tabellone (+1)</span>
      <strong style="color: var(--accent-purple)">${placement.punti_tabellone ?? 0}</strong>
    </div>
    <div class="user-stat-badge">
      <span>Errori</span>
      <strong style="color: var(--accent-red)">${placement.errori}</strong>
    </div>
  `;

  // Map matches map
  const partiteMap = {};
  state.globalPartiteData.partite.forEach(m => {
    partiteMap[m.id] = m;
  });

  // Render User Matches Predictions
  const userPartite = userDati.partite || {};
  let predictionRowsHtml = "";

  let matchesToRender = [...state.globalPartiteData.partite];

  if (state.currentSortMode === "esito") {
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
  const realPremi = state.globalPartiteData.premi_finali || {};

  if (userPremi) {
    let awardsHtml = "";
    const awards = [
      { key: "vincitore", label: "Vincitore Mondiale (+10 pt)", icon: "fa-trophy" },
      { key: "capocannoniere", label: "Capocannoniere (+5 pt)", icon: "fa-shoe-prints" },
      { key: "mvp", label: "Miglior Giocatore (+5 pt)", icon: "fa-star" },
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

      // Adjust FontAwesome icon for gloves
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
export function getDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (state.matchDates.includes(todayStr)) {
    return todayStr;
  } else {
    // If not, find the closest date in the future
    const futureDates = state.matchDates.filter(d => d >= todayStr);
    if (futureDates.length > 0) {
      return futureDates[0];
    } else {
      return state.matchDates[state.matchDates.length - 1];
    }
  }
}

// Reset horizontal calendar to today or default date and scroll to it
export function resetCalendarToToday() {
  if (state.matchDates.length === 0) return;
  const defaultDate = getDefaultDate();
  state.homeSelectedDate = defaultDate;

  const daysScroll = document.getElementById("calendar-days-scroll");
  if (!daysScroll) return;

  const items = daysScroll.querySelectorAll(".calendar-day-item");
  items.forEach(item => {
    if (item.getAttribute("data-date") === state.homeSelectedDate) {
      item.classList.add("active");
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      item.classList.remove("active");
    }
  });

  renderHome();
}

// Initialize the horizontal calendar slider
export function initCalendar() {
  // 1. Extract unique dates sorted in chronological order (YYYY-MM-DD)
  state.matchDates = [...new Set(state.globalPartiteData.partite
    .map(m => m.data)
    .filter(d => d)
    .map(d => d.split('T')[0]))
  ].sort();

  if (state.matchDates.length === 0) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  state.homeSelectedDate = getDefaultDate();

  const daysScroll = document.getElementById("calendar-days-scroll");
  if (!daysScroll) return;
  daysScroll.innerHTML = "";

  // Wheel horizontal scroll for desktop mouse users
  daysScroll.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    daysScroll.scrollLeft += evt.deltaY;
  });

  // 3. Dynamically populate calendar items
  state.matchDates.forEach(dateStr => {
    const parsedDate = new Date(dateStr + "T00:00:00");
    // Format day name (short) and day number
    let dayName = parsedDate.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).replace('.', '');
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayNum = parsedDate.getDate();

    const dayItem = document.createElement("div");
    dayItem.className = `calendar-day-item${dateStr === state.homeSelectedDate ? " active" : ""}`;
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

    // Scroll selected item into view and load games
    dayItem.addEventListener("click", () => {
      state.homeSelectedDate = dateStr;
      daysScroll.querySelectorAll(".calendar-day-item").forEach(item => {
        item.classList.remove("active");
      });
      dayItem.classList.add("active");
      dayItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      renderHome();
    });

    daysScroll.appendChild(dayItem);
  });

  // 4. Swipe Gestures for Mobile users (Swipe Left/Right to change day)
  let touchStartX = 0;
  let touchEndX = 0;

  if (homeTodayContainer) {
    homeTodayContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    homeTodayContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipeGesture();
    }, { passive: true });
  }

  function handleSwipeGesture() {
    const threshold = 60; // minimum swipe distance in pixels
    const deltaX = touchEndX - touchStartX;
    const currentIndex = state.matchDates.indexOf(state.homeSelectedDate);

    if (Math.abs(deltaX) > threshold && currentIndex !== -1) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right -> Go to previous day
        const prevDate = state.matchDates[currentIndex - 1];
        const prevItem = daysScroll.querySelector(`.calendar-day-item[data-date="${prevDate}"]`);
        if (prevItem) prevItem.click();
      } else if (deltaX < 0 && currentIndex < state.matchDates.length - 1) {
        // Swipe left -> Go to next day
        const nextDate = state.matchDates[currentIndex + 1];
        const nextItem = daysScroll.querySelector(`.calendar-day-item[data-date="${nextDate}"]`);
        if (nextItem) nextItem.click();
      }
    }
  }

  // Render matches for initial date
  renderHome();

  // Scroll the active (today's or next upcoming) day item into view on load
  const activeItem = daysScroll.querySelector('.calendar-day-item.active');
  if (activeItem) {
    setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }, 100);
  }
}

// Render Home Tab - Matches of the selected day
export function renderHome() {
  if (!state.homeSelectedDate) return;

  // 1. Update the date header with full readable Italian date
  const selectedParsedDate = new Date(state.homeSelectedDate + "T00:00:00");
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = selectedParsedDate.toLocaleDateString('it-IT', options);
  if (homeTodayDate) {
    homeTodayDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  // 2. Filter matches for the selected date
  const selectedMatches = state.globalPartiteData.partite.filter(match => match.data.startsWith(state.homeSelectedDate));

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
    card.className = "match-card animate-fade-in";

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
export function renderGlobalStats() {
  let totalExact = 0;
  let totalSign = 0;
  state.globalClassifica.forEach(item => {
    totalExact += item.risultati_esatti;
    totalSign += item.prono_esatti;
  });

  const totalPossible = state.globalClassifica.length * state.globalPartiteData.partite.filter(p => p.conclusa).length;
  
  if (totalPossible > 0) {
    const exactRatio = (totalExact / totalPossible * 100).toFixed(1);
    const signRatio = (totalSign / totalPossible * 100).toFixed(1);
    if (document.getElementById("stat-exact-ratio")) document.getElementById("stat-exact-ratio").textContent = `${exactRatio}%`;
    if (document.getElementById("stat-sign-ratio")) document.getElementById("stat-sign-ratio").textContent = `${signRatio}%`;
  }
}

// Initialize bracket view elements
export function initFaseFinale() {
  if (!tabelloneUserSelector) return;
  tabelloneUserSelector.innerHTML = "";

  // 1. Add real tournament view option
  const optReal = document.createElement("option");
  optReal.value = "reale";
  optReal.textContent = "Torneo Reale";
  tabelloneUserSelector.appendChild(optReal);

  // 2. Add all participants alphabetically by surname
  const names = Object.keys(state.globalPronostici.partecipanti).sort((a, b) => {
    const surnameA = getSurname(a).toLowerCase();
    const surnameB = getSurname(b).toLowerCase();
    return surnameA.localeCompare(surnameB) || a.localeCompare(b);
  });
  names.forEach(name => {
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
          const firstCard = columns[colIndex].querySelector(".bracket-match-node");
          if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          } else {
            columns[colIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
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
          const navContainer = document.getElementById("bracket-nav-mobile");
          if (navContainer) {
            const btnScrollLeft = btn.offsetLeft - (navContainer.clientWidth - btn.clientWidth) / 2;
            navContainer.scrollTo({
              left: btnScrollLeft,
              behavior: 'smooth'
            });
          }
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
export function resolveTeam(placeholder, resolvedMap, userKey, userPassaggio) {
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
export function getWinnerLoser(m, homeResolved, awayResolved, userKey, userDati) {
  const realConcluded = m.conclusa;
  
  if (userKey === "reale") {
    if (realConcluded) {
      if (m.home_score > m.away_score) return { winner: homeResolved, loser: awayResolved };
      if (m.away_score > m.home_score) return { winner: awayResolved, loser: homeResolved };
      
      // Draw (penalties): check real passaggio_turno for who qualified
      const realPassaggio = state.globalPartiteData.passaggio_turno || {};
      const realNextPhaseMap = {
        "sedicesimi": "ottavi",
        "ottavi": "quarti",
        "quarti": "semifinali",
        "semifinali": "finale",
        "finale": "vincitore"
      };
      const nextPhaseKey = realNextPhaseMap[m.fase];
      if (nextPhaseKey && realPassaggio[nextPhaseKey]) {
        const nextList = (Array.isArray(realPassaggio[nextPhaseKey]) ? realPassaggio[nextPhaseKey] : [realPassaggio[nextPhaseKey]]).map(t => t.toLowerCase().trim());
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
export function renderTabellone(userKey) {
  state.currentTabelloneUserKey = userKey;
  if (!fasefinaleBracketContainer) return;
  fasefinaleBracketContainer.innerHTML = "";

  // Update bracket points badge for the selected player
  const tabelloneScoreBadge = document.getElementById("tabellone-score-badge");
  if (tabelloneScoreBadge) {
    if (userKey === "reale") {
      tabelloneScoreBadge.style.display = "none";
    } else {
      const placement = state.globalClassifica.find(c => c.nome === userKey) || { punti_tabellone: 0 };
      tabelloneScoreBadge.style.display = "inline-flex";
      tabelloneScoreBadge.innerHTML = `<i class="fa-solid fa-star"></i> Punti Tabellone: ${placement.punti_tabellone ?? 0} PT`;
    }
  }

  const userDati = userKey !== "reale" ? state.globalPronostici.partecipanti[userKey] : null;
  const userPassaggio = userDati ? (userDati.passaggio_turno || {}) : {};
  const realPassaggio = state.globalPartiteData.passaggio_turno || {};

  // 1. Resolve all matches chronologically
  const resolved = {};
  const knockoutMatches = state.globalPartiteData.partite.filter(p => p.fase !== 'gironi');
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
    if (userKey !== "reale" && m && m.id === 103) {
      return { classes: "", icon: "" };
    }

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

    if (stage === "sedicesimi" || isPlaceholder(team)) {
      return { classes: "", icon: "" };
    }

    const realListMap = {
      "ottavi": realPassaggio.ottavi || [],
      "quarti": realPassaggio.quarti || [],
      "semifinali": realPassaggio.semifinali || [],
      "finale": realPassaggio.finale || [],
      "campione": realPassaggio.vincitore ? [realPassaggio.vincitore] : []
    };

    const realList = realListMap[stage] || [];
    const hasPassedReal = realList.map(t => t.toLowerCase().trim()).includes(team.toLowerCase().trim());

    if (hasPassedReal) {
      return {
        classes: "team-predicted-correct",
        icon: '<i class="fa-solid fa-circle-check" style="color: var(--color-mexico); margin-right: 4px;"></i>'
      };
    }

    const maxSizes = {
      "ottavi": 16,
      "quarti": 8,
      "semifinali": 4,
      "finale": 2,
      "campione": 1
    };

    if (realList.length === maxSizes[stage] && !hasPassedReal) {
      return {
        classes: "team-predicted-incorrect",
        icon: '<i class="fa-solid fa-circle-xmark" style="color: var(--color-canada); margin-right: 4px;"></i>'
      };
    }

    return { classes: "", icon: "" };
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
    colDiv.className = `bracket-column bracket-column-${col.key}`;
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
      if (userKey === "reale" && m.home_score !== null && m.away_score !== null) {
        scoreDisplay = `<span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:600;">${homeScore} - ${awayScore}</span>`;
      }

      const matchNode = document.createElement("div");
      matchNode.className = "bracket-match-node";
      matchNode.setAttribute("data-match-id", m.id);
      
      let matchLabel = m.fase === "finale" ? (m.id === 104 ? "Finale 1° Posto" : "Finale 3°/4° Posto") : `Match ID: ${m.id}`;

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
        const rawMatch = state.globalPartiteData.partite.find(pm => pm.id === m.id);
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
