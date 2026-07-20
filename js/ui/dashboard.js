import { state } from '../state.js';

export function renderDashboardMetrics() {
  const statParticipants = document.getElementById("stat-participants");
  const statLeader = document.getElementById("stat-leader");
  const statMatches = document.getElementById("stat-matches");
  const statPoints = document.getElementById("stat-points");

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

  renderTournamentConcluded();
}

export function renderTournamentConcluded() {
  const container = document.getElementById("tournament-concluded-container");
  if (!container) return;

  const completedCount = state.globalPartiteData.partite.filter(p => p.conclusa).length;
  const totalMatches = state.globalPartiteData.partite.length;

  if (completedCount < totalMatches || totalMatches === 0 || state.globalClassifica.length < 3) {
    container.innerHTML = "";
    return;
  }

  const p1 = state.globalClassifica[0];
  const p2 = state.globalClassifica[1];
  const p3 = state.globalClassifica[2];

  const premi = state.globalPartiteData.premi_finali || {};
  const winnerTeam = Array.isArray(premi.vincitore) ? premi.vincitore.join(", ") : (premi.vincitore || "Spagna");
  const capocannoniere = Array.isArray(premi.capocannoniere) ? premi.capocannoniere.join(", ") : (premi.capocannoniere || "-");
  const mvp = Array.isArray(premi.mvp) ? premi.mvp.join(", ") : (premi.mvp || "-");
  const portiere = Array.isArray(premi.portiere) ? premi.portiere.join(", ") : (premi.portiere || "-");
  const giovane = Array.isArray(premi.giovane) ? premi.giovane.join(", ") : (premi.giovane || "-");

  container.innerHTML = `
    <div class="tournament-concluded-card animate-fade-in">
      <div class="concluded-title">🏆 TOTOMONDIALE 2026 CONCLUSO 🏆</div>
      <div class="concluded-subtitle">
        Campione del Mondo: <strong>🇪🇸 ${winnerTeam}</strong> | Tutte le 104 partite sono state giocate!
      </div>

      <div class="podium-grid">
        <div class="podium-box rank-2">
          <div class="podium-icon">🥈</div>
          <div class="podium-name">${p2.nome}</div>
          <div class="podium-pts">${p2.punti} Punti</div>
          <div class="podium-prize">Premio: 100 €</div>
        </div>

        <div class="podium-box rank-1">
          <div class="podium-icon">🥇</div>
          <div class="podium-name">${p1.nome}</div>
          <div class="podium-pts">${p1.punti} Punti</div>
          <div class="podium-prize">Premio: 250 €</div>
        </div>

        <div class="podium-box rank-3">
          <div class="podium-icon">🥉</div>
          <div class="podium-name">${p3.nome}</div>
          <div class="podium-pts">${p3.punti} Punti</div>
          <div class="podium-prize">Premio: 30 €</div>
        </div>
      </div>

      <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-gold); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        🎖️ Vincitori Premi Ufficiali Mondiale 2026
      </div>

      <div class="awards-summary-grid">
        <div class="award-summary-item">
          <span class="award-summary-label">⚽ Capocannoniere</span>
          <span class="award-summary-val">${capocannoniere}</span>
        </div>
        <div class="award-summary-item">
          <span class="award-summary-label">🎖️ Miglior Giocatore (MVP)</span>
          <span class="award-summary-val">${mvp}</span>
        </div>
        <div class="award-summary-item">
          <span class="award-summary-label">🧤 Miglior Portiere</span>
          <span class="award-summary-val">${portiere}</span>
        </div>
        <div class="award-summary-item">
          <span class="award-summary-label">💎 Miglior Giovane</span>
          <span class="award-summary-val">${giovane}</span>
        </div>
      </div>
    </div>
  `;
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
