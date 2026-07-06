import { state } from '../state.js';
import { getFlagEmoji } from '../helpers.js';
import { openMatchModal } from './matches.js';

function getSurname(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts.slice(1).join(" ");
}

function isPlaceholder(name) {
  if (!name) return true;
  const n = name.trim();
  return n.startsWith("W") || n.startsWith("L") || n.startsWith("Vinc.") || n.startsWith("Perd.") || n.match(/^\d+[A-L]$/) || n.match(/^\d+$/);
}

export function initFaseFinale() {
  const tabelloneUserSelector = document.getElementById("tabellone-user-selector");
  const fasefinaleBracketContainer = document.getElementById("fasefinale-bracket-container");
  if (!tabelloneUserSelector) return;

  tabelloneUserSelector.innerHTML = "";

  // Add Torneo Reale option
  const optReal = document.createElement("option");
  optReal.value = "reale";
  optReal.textContent = "🏆 Torneo Reale";
  tabelloneUserSelector.appendChild(optReal);

  // Add players sorted alphabetically by surname
  const partecipanti = Object.keys(state.globalPronostici.partecipanti).sort((a, b) => {
    const surnameA = getSurname(a).toLowerCase();
    const surnameB = getSurname(b).toLowerCase();
    return surnameA.localeCompare(surnameB) || a.localeCompare(b);
  });

  partecipanti.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    tabelloneUserSelector.appendChild(opt);
  });

  tabelloneUserSelector.value = "reale";

  // Set change listener
  tabelloneUserSelector.addEventListener("change", (e) => {
    const val = e.target.value;
    renderTabellone(val);
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
    let lastActiveIndex = -1;
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

      if (activeIndex !== lastActiveIndex) {
        lastActiveIndex = activeIndex;
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
      }
    });
  }



  // Draw real bracket by default
  renderTabellone("reale");
}

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
      let nextPhaseKey = realNextPhaseMap[m.fase];
      if (m.fase === "finale" && m.id === 103) {
        nextPhaseKey = "terzo_posto";
      }
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
  
  // User predictions: resolved SOLELY by passaggio_turno (Module 1 CSV)
  const userPassaggio = userDati?.passaggio_turno || {};
  const nextPhaseKey = m.fase;
  
  let userWinner = null;
  let userLoser = null;

  if (nextPhaseKey) {
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

  if (!userWinner && m.id === 104) {
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

  if (!userWinner && m.id === 103) {
    const uThird = userPassaggio.terzo_posto;
    if (uThird) {
      if (uThird.toLowerCase().trim() === homeResolved.toLowerCase().trim()) {
        userWinner = homeResolved;
        userLoser = awayResolved;
      } else if (uThird.toLowerCase().trim() === awayResolved.toLowerCase().trim()) {
        userWinner = awayResolved;
        userLoser = homeResolved;
      }
    }
  }

  if (!userWinner) {
    userWinner = homeResolved;
    userLoser = awayResolved;
  }

  return { winner: userWinner, loser: userLoser };
}

export function renderTabellone(userKey) {
  state.currentTabelloneUserKey = userKey;
  const tabelloneTitle = document.getElementById("tabellone-title");
  if (tabelloneTitle) {
    tabelloneTitle.innerHTML = `<i class="fa-solid fa-sitemap"></i> Il Tabellone del Totomondiale`;
  }

  const fasefinaleBracketContainer = document.getElementById("fasefinale-bracket-container");
  if (!fasefinaleBracketContainer) return;
  fasefinaleBracketContainer.innerHTML = "";

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

  const eliminatedTeams = new Set();
  if (state.globalPartiteData && state.globalPartiteData.partite) {
    const allTeamsInWorldCup = new Set();
    state.globalPartiteData.partite.forEach(pm => {
      if (pm.home) allTeamsInWorldCup.add(pm.home.trim());
      if (pm.away) allTeamsInWorldCup.add(pm.away.trim());
    });

    const getNormList = (stageKey) => (realPassaggio[stageKey] || []).map(t => t.toLowerCase().trim());
    const sedicesimiList = getNormList("sedicesimi");
    const ottaviList = getNormList("ottavi");
    const quartiList = getNormList("quarti");
    const semifinaliList = getNormList("semifinali");
    const finaleList = getNormList("finale");
    const vincitoreList = getNormList("vincitore");

    // 1. Elimina le squadre uscite ai gironi (se i sedicesimi sono definiti, es. >= 32 squadre)
    if (sedicesimiList.length >= 32) {
      allTeamsInWorldCup.forEach(team => {
        const normTeam = team.toLowerCase().trim();
        if (!isPlaceholder(normTeam) && !sedicesimiList.includes(normTeam)) {
          eliminatedTeams.add(normTeam);
        }
      });
    }

    // 2. Elimina le squadre uscite ai sedicesimi
    if (ottaviList.length >= 16) {
      sedicesimiList.forEach(team => {
        if (!ottaviList.includes(team)) {
          eliminatedTeams.add(team);
        }
      });
    }

    // 3. Elimina le squadre uscite agli ottavi
    if (quartiList.length >= 8) {
      ottaviList.forEach(team => {
        if (!quartiList.includes(team)) {
          eliminatedTeams.add(team);
        }
      });
    }

    // 4. Elimina le squadre uscite ai quarti
    if (semifinaliList.length >= 4) {
      quartiList.forEach(team => {
        if (!semifinaliList.includes(team)) {
          eliminatedTeams.add(team);
        }
      });
    }

    // 5. Elimina le squadre uscite alle semifinali
    if (finaleList.length >= 2) {
      semifinaliList.forEach(team => {
        if (!finaleList.includes(team)) {
          eliminatedTeams.add(team);
        }
      });
    }

    // 6. Elimina la finalista perdente
    if (vincitoreList.length >= 1) {
      finaleList.forEach(team => {
        if (!vincitoreList.includes(team)) {
          eliminatedTeams.add(team);
        }
      });
    }

    // 7. Controllo di fallback in tempo reale in base alle partite concluse (es. in caso di pareggi risolti da rigori o aggiornamenti in corso)
    state.globalPartiteData.partite.forEach(pm => {
      if (pm.fase !== 'gironi' && pm.conclusa) {
        const homeScore = pm.home_score;
        const awayScore = pm.away_score;
        if (homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) {
            eliminatedTeams.add(pm.away.toLowerCase().trim());
          } else if (awayScore > homeScore) {
            eliminatedTeams.add(pm.home.toLowerCase().trim());
          } else {
            const realNextPhaseMap = {
              "sedicesimi": "ottavi",
              "ottavi": "quarti",
              "quarti": "semifinali",
              "semifinali": "finale",
              "finale": "vincitore"
            };
            const nextKey = realNextPhaseMap[pm.fase];
            if (nextKey && realPassaggio[nextKey]) {
              const nextList = (Array.isArray(realPassaggio[nextKey]) ? realPassaggio[nextKey] : [realPassaggio[nextKey]]).map(t => t.toLowerCase().trim());
              if (nextList.includes(pm.home.toLowerCase().trim())) {
                eliminatedTeams.add(pm.away.toLowerCase().trim());
              } else if (nextList.includes(pm.away.toLowerCase().trim())) {
                eliminatedTeams.add(pm.home.toLowerCase().trim());
              }
            }
          }
        }
      }
    });
  }

  const resolved = {};
  const knockoutMatches = state.globalPartiteData.partite.filter(p => p.fase !== 'gironi');
  knockoutMatches.sort((a, b) => a.id - b.id);

  const parentMatches = {
    89: { home: "W74", away: "W77" },
    90: { home: "W73", away: "W75" },
    91: { home: "W76", away: "W78" },
    92: { home: "W79", away: "W80" },
    93: { home: "W83", away: "W84" },
    94: { home: "W81", away: "W82" },
    95: { home: "W86", away: "W88" },
    96: { home: "W85", away: "W87" },
    97: { home: "W89", away: "W90" },
    98: { home: "W93", away: "W94" },
    99: { home: "W91", away: "W92" },
    100: { home: "W95", away: "W96" },
    101: { home: "W97", away: "W98" },
    102: { home: "W99", away: "W100" },
    103: { home: "L102", away: "L101" },
    104: { home: "W102", away: "W101" }
  };

  knockoutMatches.forEach(m => {
    let homeSource = m.home;
    let awaySource = m.away;
    if (userKey !== "reale" && parentMatches[m.id]) {
      homeSource = parentMatches[m.id].home;
      awaySource = parentMatches[m.id].away;
    }

    const hasPassaggio = userPassaggio && Object.keys(userPassaggio).length > 0;
    const isUserEmptyBracketMatch = (userKey !== "reale" && m.id >= 89 && !hasPassaggio);

    const homeResolved = isUserEmptyBracketMatch ? "" : resolveTeam(homeSource, resolved, userKey, userPassaggio);
    const awayResolved = isUserEmptyBracketMatch ? "" : resolveTeam(awaySource, resolved, userKey, userPassaggio);
    const outcome = isUserEmptyBracketMatch ? { winner: "", loser: "" } : getWinnerLoser(m, homeResolved, awayResolved, userKey, userDati);

    resolved[m.id] = {
      id: m.id,
      fase: m.fase,
      giorno: m.giorno,
      data: m.data,
      conclusa: m.conclusa,
      home: homeResolved,
      away: awayResolved,
      home_score: isUserEmptyBracketMatch ? null : (userKey === "reale" ? m.home_score : (userDati?.partite?.[m.id]?.home_score ?? null)),
      away_score: isUserEmptyBracketMatch ? null : (userKey === "reale" ? m.away_score : (userDati?.partite?.[m.id]?.away_score ?? null)),
      real_home_score: m.home_score,
      real_away_score: m.away_score,
      winner: outcome.winner,
      loser: outcome.loser
    };
  });

  function getTeamStatus(team, stage, m, isWinner) {
    if (userKey !== "reale" && m && m.id === 103) {
      if (team && eliminatedTeams.has(team.toLowerCase().trim())) {
        return {
          classes: "team-predicted-incorrect",
          icon: '<i class="fa-solid fa-circle-xmark" style="color: var(--color-canada); margin-right: 4px;"></i>'
        };
      }
      const uThird = userPassaggio.terzo_posto;
      const rThird = realPassaggio.terzo_posto;
      if (uThird && team.toLowerCase().trim() === uThird.toLowerCase().trim()) {
        if (rThird) {
          const isCorrect = uThird.toLowerCase().trim() === rThird.toLowerCase().trim();
          return {
            classes: isCorrect ? "team-predicted-correct" : "team-predicted-incorrect",
            icon: isCorrect ? '<i class="fa-solid fa-circle-check" style="color: var(--color-mexico); margin-right: 4px;"></i>' : '<i class="fa-solid fa-circle-xmark" style="color: var(--color-canada); margin-right: 4px;"></i>'
          };
        }
      }
      return { classes: "", icon: "" };
    }

    if (userKey === "reale") {
      if (m.conclusa) {
        const isRealWinner = resolved[m.id] && resolved[m.id].winner === team;
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
    const isEliminated = eliminatedTeams.has(team.toLowerCase().trim());

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

    if (isEliminated || (realList.length === maxSizes[stage] && !hasPassedReal)) {
      return {
        classes: "team-predicted-incorrect",
        icon: '<i class="fa-solid fa-circle-xmark" style="color: var(--color-canada); margin-right: 4px;"></i>'
      };
    }

    return { classes: "", icon: "" };
  }

  const columns = [
    { key: "sedicesimi", label: "Sedicesimi" },
    { key: "ottavi", label: "Ottavi" },
    { key: "quarti", label: "Quarti" },
    { key: "semifinali", label: "Semifinali" },
    { key: "finale", label: "Finale" },
    { key: "campione", label: "Vincitore" }
  ];

  const bracketOrder = {
    sedicesimi: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    ottavi: [89, 90, 93, 94, 91, 92, 95, 96],
    quarti: [97, 98, 99, 100],
    semifinali: [101, 102],
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
      
      let matchLabel = "";
      if (m.fase === "finale") {
        matchLabel = m.id === 104 ? "Finale 1° Posto" : "Finale 3°/4° Posto";
      } else if (userKey === "reale") {
        matchLabel = `Match ID: ${m.id}`;
      }

      const hasHeader = matchLabel || scoreDisplay;
      const headerHtml = hasHeader ? `
        <div class="bracket-node-header" style="display:flex; justify-content:space-between; margin-bottom: 4px;">
          <span>${matchLabel}</span>
          <span>${scoreDisplay}</span>
        </div>
      ` : "";

      matchNode.innerHTML = `
        ${headerHtml}
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
      
      if (userKey === "reale") {
        matchNode.style.cursor = "pointer";
        const rawMatch = state.globalPartiteData.partite.find(pm => pm.id === m.id);
        matchNode.addEventListener("click", () => openMatchModal(rawMatch));
      } else {
        matchNode.style.cursor = "default";
      }

      matchesDiv.appendChild(matchNode);
    });

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

      const thirdMatch = resolved[103];
      const thirdWinner = thirdMatch ? thirdMatch.winner : null;

      const thirdNode = document.createElement("div");
      thirdNode.className = "bracket-match-node";
      thirdNode.setAttribute("data-match-id", "third_place");
      thirdNode.style.border = "1px solid rgba(168, 85, 247, 0.25)";
      thirdNode.style.background = "linear-gradient(180deg, rgba(168, 85, 247, 0.04) 0%, rgba(13, 20, 35, 0.45) 100%)";
      thirdNode.style.marginTop = "20px";

      if (thirdWinner && !isPlaceholder(thirdWinner)) {
        const isThirdWinner = true;
        const thirdStatus = getTeamStatus(thirdWinner, "campione", thirdMatch, isThirdWinner);

        thirdNode.innerHTML = `
          <div class="bracket-node-header" style="color: var(--accent-purple); font-weight: 800; text-align: center;">
            <i class="fa-solid fa-medal" style="color: #cf6a4c;"></i> Terzo Posto
          </div>
          <div class="bracket-node-teams" style="margin-top: 5px;">
            <div class="bracket-node-team ${thirdStatus.classes}" data-team-name="${thirdWinner}" style="justify-content: center; text-align: center;">
              <span class="team-name" style="font-weight: 700; font-size: 0.9rem;">
                ${thirdStatus.icon} ${getFlagEmoji(thirdWinner)} ${thirdWinner}
              </span>
            </div>
          </div>
        `;
      } else {
        thirdNode.innerHTML = `
          <div class="bracket-node-header" style="color: var(--color-text-muted); font-weight: 700; text-align: center;">
            <i class="fa-solid fa-medal"></i> Terzo Posto
          </div>
          <div class="bracket-node-teams" style="margin-top: 5px;">
            <div class="bracket-node-team team-predicted-pending" style="justify-content: center; text-align: center;">
              <span class="team-name" style="font-weight: 500; font-size: 0.82rem;">
                <i class="fa-regular fa-clock"></i> In attesa della finalina
              </span>
            </div>
          </div>
        `;
      }
      matchesDiv.appendChild(thirdNode);
    }

    colDiv.appendChild(matchesDiv);
    scrollWrapper.appendChild(colDiv);
  });

  fasefinaleBracketContainer.appendChild(scrollWrapper);

  if (userKey !== "reale" && (!userPassaggio || Object.keys(userPassaggio).length === 0)) {
    const warning = document.createElement("div");
    warning.className = "badge badge-pending";
    warning.style.display = "block";
    warning.style.textAlign = "center";
    warning.style.padding = "10px";
    warning.style.marginBottom = "15px";
    warning.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Il partecipante non ha ancora compilato il tabellone fase finale.`;
    fasefinaleBracketContainer.insertBefore(warning, fasefinaleBracketContainer.firstChild);
  }

  state.currentResolvedData = resolved;
  state.drawBracketLinesRef = drawBracketLines;

  if (window.ResizeObserver) {
    if (state.bracketResizeObserver) {
      state.bracketResizeObserver.disconnect();
    }
    state.bracketResizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => drawBracketLines());
    });
    state.bracketResizeObserver.observe(scrollWrapper);
  }

  setTimeout(() => drawBracketLines(), 50);
}

export function drawBracketLines() {
  const fasefinaleBracketContainer = document.getElementById("fasefinale-bracket-container");
  const container = fasefinaleBracketContainer;
  if (!container) return;

  container.querySelectorAll("svg.bracket-svg-overlay, svg#bracket-svg").forEach(svg => svg.remove());

  const scrollWrapper = container.querySelector(".bracket-scroll-wrapper");
  if (!scrollWrapper) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "bracket-svg");
  svg.setAttribute("class", "bracket-svg-overlay");
  svg.setAttribute("width", `${scrollWrapper.scrollWidth}px`);
  svg.setAttribute("height", `${scrollWrapper.scrollHeight}px`);
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = `${scrollWrapper.scrollWidth}px`;
  svg.style.height = `${scrollWrapper.scrollHeight}px`;
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "0";

  const parentMatches = {
    89: { home: 74, away: 77 },
    90: { home: 73, away: 75 },
    91: { home: 76, away: 78 },
    92: { home: 79, away: 80 },
    93: { home: 83, away: 84 },
    94: { home: 81, away: 82 },
    95: { home: 86, away: 88 },
    96: { home: 85, away: 87 },
    97: { home: 89, away: 90 },
    98: { home: 93, away: 94 },
    99: { home: 91, away: 92 },
    100: { home: 95, away: 96 },
    101: { home: 97, away: 98 },
    102: { home: 99, away: 100 },
    104: { home: 102, away: 101 }
  };

  const rectContainer = scrollWrapper.getBoundingClientRect();
  const resolved = state.currentResolvedData || {};

  Object.entries(parentMatches).forEach(([childId, parents]) => {
    const childNode = scrollWrapper.querySelector(`.bracket-match-node[data-match-id="${childId}"]`);
    const homeNode = scrollWrapper.querySelector(`.bracket-match-node[data-match-id="${parents.home}"]`);
    const awayNode = scrollWrapper.querySelector(`.bracket-match-node[data-match-id="${parents.away}"]`);

    if (!childNode || !homeNode || !awayNode) return;

    const rChild = childNode.getBoundingClientRect();
    const rHome = homeNode.getBoundingClientRect();
    const rAway = awayNode.getBoundingClientRect();

    const xChildLeft = rChild.left - rectContainer.left;
    const yChildMid = (rChild.top + rChild.bottom) / 2 - rectContainer.top;

    const xHomeRight = rHome.right - rectContainer.left;
    const yHomeMid = (rHome.top + rHome.bottom) / 2 - rectContainer.top;

    const xAwayRight = rAway.right - rectContainer.left;
    const yAwayMid = (rAway.top + rAway.bottom) / 2 - rectContainer.top;

    const midX = (xHomeRight + xChildLeft) / 2;

    const childMatch = resolved[childId];
    const parentHomeMatch = resolved[parents.home];
    const parentAwayMatch = resolved[parents.away];

    const isHomeActive = childMatch && parentHomeMatch && childMatch.home && parentHomeMatch.winner && 
                         (childMatch.home.toLowerCase().trim() === parentHomeMatch.winner.toLowerCase().trim());
    
    const isAwayActive = childMatch && parentAwayMatch && childMatch.away && parentAwayMatch.winner && 
                         (childMatch.away.toLowerCase().trim() === parentAwayMatch.winner.toLowerCase().trim());

    // Home Connection
    const pathHome = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const dHome = `M ${xHomeRight} ${yHomeMid} H ${midX} V ${yChildMid - 5} H ${xChildLeft}`;
    pathHome.setAttribute("d", dHome);
    pathHome.setAttribute("class", isHomeActive ? "bracket-path-active" : "bracket-path-inactive");
    svg.appendChild(pathHome);

    // Away Connection
    const pathAway = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const dAway = `M ${xAwayRight} ${yAwayMid} H ${midX} V ${yChildMid + 5} H ${xChildLeft}`;
    pathAway.setAttribute("d", dAway);
    pathAway.setAttribute("class", isAwayActive ? "bracket-path-active" : "bracket-path-inactive");
    svg.appendChild(pathAway);
  });

  scrollWrapper.appendChild(svg);
}

export function selectBracketPlayer(username) {
  const tabelloneUserSelector = document.getElementById("tabellone-user-selector");
  if (tabelloneUserSelector) {
    tabelloneUserSelector.value = username;
  }
  renderTabellone(username);
}
