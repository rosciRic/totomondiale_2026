import { state } from '../state.js';
import { formatDate, getFlagEmoji, getSign } from '../helpers.js';
import { navigateToUserPredictions } from './leaderboard.js';
import { renderHome } from './home.js';

export function renderMatches() {
  const matchesContainer = document.getElementById("matches-container");
  const filterStage = document.getElementById("filter-stage");
  const filterStatus = document.getElementById("filter-status");

  if (!matchesContainer || !filterStage || !filterStatus) return;
  matchesContainer.innerHTML = "";
  const stageFilter = filterStage.value;
  const statusFilter = filterStatus.value;
  let filteredMatches = [...state.globalPartiteData.partite];
  filteredMatches.sort((a, b) => {
    if (a.data !== b.data) {
      return a.data.localeCompare(b.data);
    }
    return a.id - b.id;
  });

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
      <div class="match-status-bar" style="justify-content: flex-end;">
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
    `;

    card.addEventListener("click", () => openMatchModal(match));
    matchesContainer.appendChild(card);
  });
}

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
    row.addEventListener("click", () => {
      matchModal.classList.remove("open");
      navigateToUserPredictions(data.username);
    });
    modalList.appendChild(row);
  });

  // Show modal
  matchModal.classList.add("open");
}

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

export function initCalendar() {
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

  daysScroll.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    daysScroll.scrollLeft += evt.deltaY;
  });

  state.matchDates.forEach(dateStr => {
    const parsedDate = new Date(dateStr + "T00:00:00");
    let dayName = parsedDate.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).replace('.', '');
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayNum = parsedDate.getDate();

    const dayItem = document.createElement("div");
    dayItem.className = `calendar-day-item${dateStr === state.homeSelectedDate ? " active" : ""}`;
    dayItem.setAttribute("data-date", dateStr);
    
    const isToday = dateStr === todayStr;
    if (isToday) {
      dayItem.innerHTML = `<span class="day-today">Oggi</span>`;
    } else {
      dayItem.innerHTML = `
        <span class="day-name">${dayName}</span>
        <span class="day-num">${dayNum}</span>
      `;
    }

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

  // Swipe Gestures for Mobile users (Swipe Left/Right to change day)
  let touchStartX = 0;
  let touchEndX = 0;
  const homeTodayContainer = document.getElementById("home-today-container");

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
    const threshold = 60;
    const deltaX = touchEndX - touchStartX;
    const currentIndex = state.matchDates.indexOf(state.homeSelectedDate);

    if (Math.abs(deltaX) > threshold && currentIndex !== -1) {
      if (deltaX > 0 && currentIndex > 0) {
        const prevDate = state.matchDates[currentIndex - 1];
        const prevItem = daysScroll.querySelector(`.calendar-day-item[data-date="${prevDate}"]`);
        if (prevItem) prevItem.click();
      } else if (deltaX < 0 && currentIndex < state.matchDates.length - 1) {
        const nextDate = state.matchDates[currentIndex + 1];
        const nextItem = daysScroll.querySelector(`.calendar-day-item[data-date="${nextDate}"]`);
        if (nextItem) nextItem.click();
      }
    }
  }

  renderHome();

  const activeItem = daysScroll.querySelector('.calendar-day-item.active');
  if (activeItem) {
    setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }, 100);
  }
}
