import { state } from '../state.js';

export function renderDashboardMetrics() {
  try {
    const statParticipants = document.getElementById("stat-participants");
    const statLeader = document.getElementById("stat-leader");
    const statMatches = document.getElementById("stat-matches");
    const statPoints = document.getElementById("stat-points");

    const classifica = Array.isArray(state.globalClassifica) ? state.globalClassifica : [];
    const partite = (state.globalPartiteData && Array.isArray(state.globalPartiteData.partite)) ? state.globalPartiteData.partite : [];

    if (statParticipants) statParticipants.textContent = classifica.length;
    
    if (statLeader) {
      if (classifica.length > 0) {
        statLeader.textContent = classifica[0].nome;
      } else {
        statLeader.textContent = "Nessuno";
      }
    }

    const completedCount = partite.filter(p => p.conclusa).length;
    const totalMatches = partite.length;
    if (statMatches) statMatches.textContent = `${completedCount} / ${totalMatches}`;

    const progressBar = document.getElementById("stat-matches-progress");
    if (progressBar && totalMatches > 0) {
      const percentage = (completedCount / totalMatches) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    const totalPts = classifica.reduce((sum, item) => sum + (item.punti || 0), 0);
    if (statPoints) statPoints.textContent = totalPts;

    renderTournamentConcluded();
  } catch (err) {
    console.error("Errore in renderDashboardMetrics:", err);
  }
}

export function renderTournamentConcluded() {
  try {
    const container = document.getElementById("tournament-concluded-container");
    if (!container) return;

    const classifica = Array.isArray(state.globalClassifica) ? state.globalClassifica : [];
    const partite = (state.globalPartiteData && Array.isArray(state.globalPartiteData.partite)) ? state.globalPartiteData.partite : [];

    const completedCount = partite.filter(p => p.conclusa).length;
    const totalMatches = partite.length;

    if (completedCount < totalMatches || totalMatches === 0 || classifica.length < 3) {
      container.innerHTML = "";
      return;
    }

    const p1 = classifica[0];
    const p2 = classifica[1];
    const p3 = classifica[2];

    container.innerHTML = `
      <div class="tournament-concluded-card animate-fade-in" style="margin-bottom: 20px;">
        <div class="concluded-title" style="margin-bottom: 16px;">🏆 PODIO FINALE 🏆</div>

        <div class="podium-grid" style="margin-bottom: 0;">
          <div class="podium-box rank-1">
            <div class="podium-icon">🥇</div>
            <div class="podium-name">${p1.nome}</div>
            <div class="podium-pts">${p1.punti} Punti</div>
            <div class="podium-prize">Premio: 250 €</div>
          </div>

          <div class="podium-box rank-2">
            <div class="podium-icon">🥈</div>
            <div class="podium-name">${p2.nome}</div>
            <div class="podium-pts">${p2.punti} Punti</div>
            <div class="podium-prize">Premio: 100 €</div>
          </div>

          <div class="podium-box rank-3">
            <div class="podium-icon">🥉</div>
            <div class="podium-name">${p3.nome}</div>
            <div class="podium-pts">${p3.punti} Punti</div>
            <div class="podium-prize">Premio: 30 €</div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Errore in renderTournamentConcluded:", err);
  }
}

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
  if (jackpot1Pct) jackpot1Pct.textContent = `${p1}%`;
  if (jackpot2Pct) jackpot2Pct.textContent = `${p2}%`;
  if (jackpot3Pct) jackpot3Pct.textContent = `${p3}%`;

  // Update cash values
  if (jackpot1Amount) jackpot1Amount.textContent = `${prize1} €`;
  if (jackpot2Amount) jackpot2Amount.textContent = `${prize2} €`;
  if (jackpot3Amount) jackpot3Amount.textContent = `${prize3} €`;
}
