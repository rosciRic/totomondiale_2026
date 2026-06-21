# ⚽ Totomondiale 2026

Una web application moderna a **costo zero** costruita con architettura **GitOps / Serverless** per gestire ed elaborare i pronostici dei mondiali di calcio USA-Messico-Canada 2026.

Il sistema gestisce **38 partecipanti**, l'intero torneo da **104 partite** (formato a 48 squadre) e la fase a eliminazione diretta a partire dai Sedicesimi di finale.

---

## 🏗️ Struttura della Repository (Moduli ES6 & CSS)

La codebase è organizzata in moduli separati per isolare le responsabilità grafiche e logiche:

```text
├── index.html                  # Interfaccia utente principale (Standings, Matches, Bracket)
├── app.js                      # Entry point JavaScript (configurato come script type="module")
├── css/                        # Fogli di stile separati
│   ├── variables.css           # Token di design e variabili globali
│   ├── base.css                # Reset globale, layout di base e testata
│   ├── components.css          # Tabelle, bottoni, modali e schede partite
│   ├── bracket.css             # Visualizzazione tabellone ad albero binario ed SVG
│   └── mobile.css              # Adattamenti e ottimizzazioni responsive
├── js/                         # Moduli JavaScript ES6
│   ├── state.js                # Oggetto dello stato globale condiviso
│   ├── helpers.js              # Utility pure (formattazione date, bandiere CDN lazy, segni 1X2)
│   ├── api.js                  # Fetching asincrono dei dati reali con cache bust intelligente
│   ├── navigation.js           # Gestione tab desktop e mobile bottom nav
│   └── ui.js                   # Rendering dinamico del DOM (classifiche, partite, tabellone, modali)
├── classifica.json             # DB Classifica calcolato automaticamente via Actions
├── partite.json                # DB Partite reali e squadre qualificate
├── pronostici.json             # DB Pronostici di tutti i 38 partecipanti
├── scripts/                    # Script Python per calcoli e importazioni
│   ├── aggiorna_dati.py        # Script GitOps di calcolo automatico della classifica
│   ├── importa_tabellone.py    # Importazione tabelloni da Google Forms CSV
│   └── importa_esiti.py        # Importazione risultati esatti da Google Forms CSV
└── .github/workflows/
    └── update.yml              # Automazione GitHub Actions (avviata ogni 10 minuti o via API)
```

---

## 🏆 Regolamento del Gioco e Punteggi

*   **Risultato Esatto (+3 Punti):** Punteggio esatto del match indovinato al 120' minuto (supplementari inclusi, rigori esclusi).
*   **Segno Esatto 1X2 (+1 Punto):** Risultato esatto errato ma esito 1X2 corretto al 120'.
*   **Passaggio Turno (+1 Punto):** Per ogni singola squadra indovinata che si qualifica alla fase successiva nel tabellone (Sedicesimi, Ottavi, Quarti, Semifinali, Finale).
*   **Vincitore Antepost (+10 Punti):** Vincitore assoluto del mondiale indovinato prima dell'inizio del torneo.
*   **Premi Speciali (+5 Punti ciascuno):** Altra finalista, capocannoniere, MVP, miglior portiere, miglior giovane.

---

## 📝 Gestione Pronostici con Google Forms

### 1. Importazione Tabelloni Completi
Scarica le risposte del Google Form come CSV, salvalo come `risposte_tabellone.csv` nella root ed esegui:
```bash
python3 scripts/importa_tabellone.py
```

### 2. Importazione Risultati Esatti (Fase per Fase)
Scarica le risposte del Google Form come CSV (es. `risposte_sedicesimi.csv`) ed esegui passando il file e il range di ID partite (es. da 73 a 88):
```bash
python3 scripts/importa_esiti.py risposte_sedicesimi.csv 73 88
```

---

## 🛠️ Esecuzione in Locale

Avvia un server web statico nella root del progetto per testare i moduli ES6 evitando errori CORS:

```bash
python3 -m http.server 8000
```
Quindi naviga su [http://localhost:8000](http://localhost:8000).

Per aggiornare manualmente la classifica interrogando l'API in tempo reale ed aggiornando il JSON locale:
```bash
python3 scripts/aggiorna_dati.py
```
