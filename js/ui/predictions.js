import { state } from '../state.js';
import { getFlagEmoji, getSign } from '../helpers.js';
import { switchTab } from '../navigation.js';

function getSurname(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts.slice(1).join(" ");
}

export function populateUserSelector() {
  const userSelector = document.getElementById("user-selector");
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

  const defaultUser = state.globalClassifica.length > 0 ? state.globalClassifica[0].nome : partecipanti[0];
  userSelector.value = defaultUser;

  renderUserPredictions(defaultUser);
}

function initCollapsibleMatches() {
  const pronoHeader = document.getElementById("user-prono-header");
  const matchesWrapper = document.getElementById("user-matches-collapse-wrapper");
  const toggleIcon = document.getElementById("matches-toggle-icon");
  
  if (pronoHeader && matchesWrapper && toggleIcon) {
    pronoHeader.addEventListener("click", (e) => {
      const isCollapsed = matchesWrapper.style.display === "none";
      if (isCollapsed) {
        matchesWrapper.style.display = "";
        toggleIcon.classList.remove("fa-chevron-down");
        toggleIcon.classList.add("fa-chevron-up");
      } else {
        matchesWrapper.style.display = "none";
        toggleIcon.classList.remove("fa-chevron-up");
        toggleIcon.classList.add("fa-chevron-down");
      }
    });
  }
}

export function renderUserPredictions(username) {
  const userSummaryStats = document.getElementById("user-summary-stats");
  const userMatchesList = document.getElementById("user-matches-list");
  const userAwardsList = document.getElementById("user-awards-list");

  if (!userSummaryStats || !userMatchesList || !userAwardsList) return;
  userSummaryStats.innerHTML = "";
  userMatchesList.innerHTML = "";
  userAwardsList.innerHTML = "";

  const userDati = state.globalPronostici.partecipanti[username];
  if (!userDati) {
    userMatchesList.innerHTML = `<p>Nessun dato per l'utente selezionato.</p>`;
    return;
  }

  // Fetch user overall placement from classifica
  const placement = state.globalClassifica.find(c => c.nome === username) || { punti: 0, risultati_esatti: 0, prono_esatti: 0, punti_tabellone: 0 };
  
  // Display participant widgets summary
  const puntiRisultati = (placement.risultati_esatti || 0) * 3;
  const puntiSegni = (placement.prono_esatti || 0) * 1;
  const puntiTabellone = (placement.punti_tabellone || 0);
  const puntiPremi = (placement.punti || 0) - (puntiRisultati + puntiSegni + puntiTabellone);

  userSummaryStats.innerHTML = `
    <div class="user-stat-badge stat-punti">
      <span>Punteggio</span>
      <strong>${placement.punti} PT</strong>
    </div>
    <div class="user-stat-badge stat-esatti">
      <span>Esatti (+3)</span>
      <strong>${placement.risultati_esatti}</strong>
    </div>
    <div class="user-stat-badge stat-segni">
      <span>Segni (+1)</span>
      <strong>${placement.prono_esatti}</strong>
    </div>
    <div class="user-stat-badge stat-tabellone">
      <span>Tabellone</span>
      <strong>${placement.punti_tabellone ?? 0}</strong>
    </div>
    <div class="user-stat-badge stat-premi">
      <span>Speciali</span>
      <strong>${puntiPremi}</strong>
    </div>
  `;

  // Initialize collapsible matches once
  if (!state.matchesToggleInitialized) {
    state.matchesToggleInitialized = true;
    initCollapsibleMatches();
  }

  // Map matches map
  const partiteMap = {};
  state.globalPartiteData.partite.forEach(m => {
    partiteMap[m.id] = m;
  });

  // Render User Matches Predictions
  const userPartite = userDati.partite || {};
  let predictionRowsHtml = "";

  const pronoStageFilter = document.getElementById("filter-prono-stage");
  const pronoOutcomeFilter = document.getElementById("filter-prono-outcome");
  
  const stageVal = pronoStageFilter ? pronoStageFilter.value : "all";
  const outcomeVal = pronoOutcomeFilter ? pronoOutcomeFilter.value : "all";

  let matchesToRender = [...state.globalPartiteData.partite];

  // Filter by Stage
  if (stageVal === "gironi") {
    matchesToRender = matchesToRender.filter(m => m.fase === "gironi");
  } else if (stageVal === "eliminazione") {
    matchesToRender = matchesToRender.filter(m => m.fase !== "gironi");
  }

  // Filter by Outcome
  if (outcomeVal !== "all") {
    matchesToRender = matchesToRender.filter(m => {
      const pred = userPartite[m.id];
      if (outcomeVal === "programmati") {
        return !m.conclusa;
      }
      if (!m.conclusa) return false;
      
      const hasPred = pred && pred.home_score !== null && pred.away_score !== null;
      
      if (outcomeVal === "esatti") {
        return hasPred && m.home_score === pred.home_score && m.away_score === pred.away_score;
      }
      
      if (outcomeVal === "segni") {
        if (!hasPred) return false;
        const realSign = getSign(m.home_score, m.away_score);
        const predSign = getSign(pred.home_score, pred.away_score);
        return realSign === predSign && !(m.home_score === pred.home_score && m.away_score === pred.away_score);
      }
      
      if (outcomeVal === "errati") {
        if (!hasPred) return true;
        const realSign = getSign(m.home_score, m.away_score);
        const predSign = getSign(pred.home_score, pred.away_score);
        return realSign !== predSign;
      }
      
      return true;
    });
  }

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
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
      }
      return a.id - b.id;
    });
  } else {
    // Sort chronologically by default
    matchesToRender.sort((a, b) => {
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
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

    let ptsIcon = "";
    if (match.conclusa) {
      if (ptsClass === "pts-3") {
        ptsIcon = `<i class="fa-solid fa-trophy" style="color: var(--accent-gold); font-size: 0.72rem;"></i>`;
      } else if (ptsClass === "pts-1") {
        ptsIcon = `<i class="fa-solid fa-check" style="font-size: 0.75rem;"></i>`;
      } else if (ptsClass === "pts-0") {
        ptsIcon = `<i class="fa-solid fa-xmark" style="font-size: 0.75rem; opacity: 0.6;"></i>`;
      }
    } else {
      ptsIcon = `<i class="fa-regular fa-clock" style="font-size: 0.75rem; opacity: 0.5;"></i>`;
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
          <div class="score-punti-badge ${ptsClass}" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            ${ptsIcon}
            <span>${ptsText}</span>
          </div>
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
      { key: "finalista", label: "Altra Finalista (+5 pt)", icon: "fa-medal" },
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
