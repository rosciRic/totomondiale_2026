import { state } from '../state.js';

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
    const statExactRatio = document.getElementById("stat-exact-ratio");
    const statSignRatio = document.getElementById("stat-sign-ratio");
    if (statExactRatio) statExactRatio.textContent = `${exactRatio}%`;
    if (statSignRatio) statSignRatio.textContent = `${signRatio}%`;
  }
}
