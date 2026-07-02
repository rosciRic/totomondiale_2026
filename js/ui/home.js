import { state } from '../state.js';
import { getFlagEmoji, formatDate } from '../helpers.js';
import { openMatchModal } from './matches.js';

export function renderHome() {
  if (!state.homeSelectedDate) return;

  const homeTodayDate = document.getElementById("home-today-date");
  const homeTodayContainer = document.getElementById("home-today-container");

  // 1. Update the date header with full readable Italian date
  const selectedParsedDate = new Date(state.homeSelectedDate + "T00:00:00");
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = selectedParsedDate.toLocaleDateString('it-IT', options);
  if (homeTodayDate) {
    homeTodayDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  // 2. Filter matches for the selected date and sort chronologically by time
  const selectedMatches = state.globalPartiteData.partite
    .filter(match => match.data.startsWith(state.homeSelectedDate))
    .sort((a, b) => {
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
      }
      return a.id - b.id;
    });

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
      <div class="match-status-bar" style="justify-content: flex-end;">
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
    `;

    card.addEventListener("click", () => openMatchModal(match));
    homeTodayContainer.appendChild(card);
  });
}
