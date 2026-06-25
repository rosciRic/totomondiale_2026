import { state } from './state.js';

// Fetch all databases in parallel
export async function fetchDatabases() {
  try {
    // Determine if we are running locally or in production
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:";
    const basePath = isLocal ? "" : "https://raw.githubusercontent.com/rosciRic/totomondiale_2026/main/";

    // Caching system: checks version.json first to prevent continuous downloading of large files
    let version = Date.now();
    try {
      const versionRes = await fetch(`${basePath}data/version.json?t=${Date.now()}`);
      if (versionRes.ok) {
        const versionData = await versionRes.json();
        if (versionData && versionData.version) {
          version = versionData.version;
        }
      }
    } catch (err) {
      console.warn("Impossibile caricare version.json, uso fallback timestamp di sessione.", err);
    }

    const [classificaRes, partiteRes, pronosticiRes] = await Promise.all([
      fetch(`${basePath}data/classifica.json?v=${version}`),
      fetch(`${basePath}data/partite.json?v=${version}`),
      fetch(`${basePath}data/pronostici.json?v=${version}`)
    ]);

    if (!classificaRes.ok || !partiteRes.ok || !pronosticiRes.ok) {
      throw new Error("Impossibile caricare uno o più database statici.");
    }

    state.globalClassifica = await classificaRes.json();
    state.globalPartiteData = await partiteRes.json();
    state.globalPronostici = await pronosticiRes.json();



  } catch (error) {
    console.error("Errore durante il caricamento dei database:", error);
    alert("Errore critico: impossibile caricare i dati del torneo. Ricarica la pagina.");
  }
}
