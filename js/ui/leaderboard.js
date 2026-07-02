import { state } from '../state.js';
import { switchTab } from '../navigation.js';
import { renderUserPredictions } from './predictions.js';
import { selectBracketPlayer } from './bracket.js';

let leaderboardSortKey = 'punti';

export function renderLeaderboard() {
  const classificaBody = document.getElementById("classifica-body");
  if (!classificaBody) return;
  classificaBody.innerHTML = "";
  
  if (state.globalClassifica.length === 0) {
    classificaBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nessun partecipante in classifica.</td></tr>`;
    return;
  }

  // Clone and sort the standings array based on active leaderboardSortKey
  const sortedClassifica = [...state.globalClassifica].sort((a, b) => {
    if (leaderboardSortKey === 'punti') {
      return (b.punti || 0) - (a.punti || 0) || a.nome.localeCompare(b.nome);
    }
    if (leaderboardSortKey === 'nome') {
      return a.nome.localeCompare(b.nome);
    }
    if (leaderboardSortKey === 'esatti') {
      return (b.risultati_esatti || 0) - (a.risultati_esatti || 0) || (b.punti || 0) - (a.punti || 0);
    }
    if (leaderboardSortKey === 'segni') {
      return (b.prono_esatti || 0) - (a.prono_esatti || 0) || (b.punti || 0) - (a.punti || 0);
    }
    if (leaderboardSortKey === 'tabellone') {
      return (b.punti_tabellone || 0) - (a.punti_tabellone || 0) || (b.punti || 0) - (a.punti || 0);
    }
    if (leaderboardSortKey === 'speciali') {
      const getPuntiPremi = (player) => {
        const puntiRisultati = (player.risultati_esatti || 0) * 3;
        const puntiSegni = (player.prono_esatti || 0) * 1;
        const puntiTabellone = (player.punti_tabellone || 0);
        return player.punti_speciali !== undefined ? player.punti_speciali : (player.punti || 0) - (puntiRisultati + puntiSegni + puntiTabellone);
      };
      return getPuntiPremi(b) - getPuntiPremi(a) || (b.punti || 0) - (a.punti || 0);
    }
    return 0;
  });

  // Update mobile header text and color based on active metric
  const mobileHeader = document.getElementById("leaderboard-mobile-header");
  if (mobileHeader) {
    if (leaderboardSortKey === 'punti') {
      mobileHeader.textContent = "Punti Totali";
      mobileHeader.style.color = "var(--accent-purple)";
    } else if (leaderboardSortKey === 'esatti') {
      mobileHeader.textContent = "Risultati Esatti";
      mobileHeader.style.color = "var(--accent-green)";
    } else if (leaderboardSortKey === 'segni') {
      mobileHeader.textContent = "Pron. Esatti";
      mobileHeader.style.color = "var(--accent-gold)";
    } else if (leaderboardSortKey === 'tabellone') {
      mobileHeader.textContent = "Punti Tabellone";
      mobileHeader.style.color = "#ec4899";
    } else if (leaderboardSortKey === 'speciali') {
      mobileHeader.textContent = "Premi Speciali";
      mobileHeader.style.color = "var(--accent-cyan)";
    }
  }

  // Update mobile selector if present
  const mobileSortSelector = document.getElementById("mobile-sort-selector");
  if (mobileSortSelector) {
    mobileSortSelector.value = leaderboardSortKey;
  }

  sortedClassifica.forEach((player, index) => {
    const row = document.createElement("tr");
    row.setAttribute("data-player", player.nome.toLowerCase());
    
    let posClass = "pos-badge pos-other";
    let posContent = index + 1;
    
    if (leaderboardSortKey === 'punti') {
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
    }

    const puntiRisultati = (player.risultati_esatti || 0) * 3;
    const puntiSegni = (player.prono_esatti || 0) * 1;
    const puntiTabellone = (player.punti_tabellone || 0);
    const puntiPremi = player.punti_speciali !== undefined ? player.punti_speciali : (player.punti || 0) - (puntiRisultati + puntiSegni + puntiTabellone);

    let mobileVal = "";
    let mobileColor = "";
    if (leaderboardSortKey === 'punti') {
      mobileVal = `${player.punti} PT`;
      mobileColor = "color: var(--accent-purple);";
    } else if (leaderboardSortKey === 'esatti') {
      mobileVal = `${player.risultati_esatti} (${puntiRisultati} PT)`;
      mobileColor = "color: var(--accent-green);";
    } else if (leaderboardSortKey === 'segni') {
      mobileVal = `${player.prono_esatti} (${puntiSegni} PT)`;
      mobileColor = "color: var(--accent-gold);";
    } else if (leaderboardSortKey === 'tabellone') {
      mobileVal = `${puntiTabellone} PT`;
      mobileColor = "color: #ec4899;";
    } else if (leaderboardSortKey === 'speciali') {
      mobileVal = `${puntiPremi} PT`;
      mobileColor = "color: var(--accent-cyan);";
    } else {
      mobileVal = `${player.punti} PT`;
    }

    row.innerHTML = `
      <td style="text-align: center;"><span class="${posClass}">${posContent}</span></td>
      <td><span class="player-name">${player.nome}</span></td>
      <td style="text-align: center;" class="hide-mobile"><span class="points-val">${player.punti}</span></td>
      <td style="text-align: center; color: var(--accent-green); font-weight: 600;" class="hide-mobile badge-exact-col">${player.risultati_esatti}</td>
      <td style="text-align: center; color: var(--accent-gold); font-weight: 600;" class="hide-mobile badge-sign-col">${player.prono_esatti}</td>
      <td style="text-align: center; color: #ec4899; font-weight: 600;" class="hide-mobile badge-tabellone-col">${puntiTabellone}</td>
      <td style="text-align: center; color: var(--accent-cyan); font-weight: 600;" class="hide-mobile badge-premi-col">${puntiPremi}</td>
      <td style="text-align: center; display: none; font-weight: 600; ${mobileColor}" class="show-mobile points-val">${mobileVal}</td>
    `;

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
            <td colspan="3">
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
                  <span>Premi Spec. (+5/10)</span>
                  <strong style="color: var(--accent-cyan)">${puntiPremi}</strong>
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

export function filterLeaderboard() {
  const classificaBody = document.getElementById("classifica-body");
  const classificaSearch = document.getElementById("classifica-search");
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

export function navigateToUserPredictions(username) {
  switchTab("tab-pronostici");
  const userSearch = document.getElementById("user-search");
  const userSelector = document.getElementById("user-selector");
  if (userSearch) {
    userSearch.value = username;
  }
  if (userSelector) {
    userSelector.value = username;
  }
  renderUserPredictions(username);
}

export function navigateToUserTabellone(username) {
  switchTab("tab-fasefinale");
  selectBracketPlayer(username);
}

export function setLeaderboardSort(sortKey) {
  leaderboardSortKey = sortKey;
  
  const headers = document.querySelectorAll(".premium-table th[data-sort]");
  headers.forEach(h => {
    const k = h.getAttribute("data-sort");
    if (k === sortKey) {
      h.classList.add("active-sort");
    } else {
      h.classList.remove("active-sort");
    }
  });

  renderLeaderboard();
}
