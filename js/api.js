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

    // Normalize knockout stage times to Rome timezone
    state.globalPartiteData.partite.forEach(p => {
      if (p.fase !== "gironi") {
        // Parse original date in UTC and force it to match tournament's Local Time (UTC-5 / UTC-6)
        // Then shift it to Rome (UTC+2) to display the correct Italian kickoff time
        const utcDate = new Date(p.data);
        
        // Let's assume tournament timezone offset is -5 (Eastern Standard Time)
        // We shift hours accordingly: UTC + Offset Rome (2) - Offset USA (-5) = +7 hours
        const shiftHours = 2 - (-5); 
        utcDate.setHours(utcDate.getHours() + shiftHours);
        p.data = utcDate.toISOString();
      }
    });

  } catch (error) {
    console.error("Errore durante il caricamento dei database:", error);
    alert("Errore critico: impossibile caricare i dati del torneo. Ricarica la pagina.");
  }
}
