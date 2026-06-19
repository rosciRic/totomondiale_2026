# ⚽ Totomondiale 2026

Una web application moderna, ecocompatibile e a **costo zero** costruita con un'architettura **GitOps / Serverless** per gestire ed elaborare i pronostici dei mondiali di calcio USA-Messico-Canada 2026.

Il sistema gestisce **38 partecipanti**, l'intero mondiale da **104 partite** (formato a 48 squadre, incluse le 72 della fase a gironi e le 32 ad eliminazione diretta) e l'intera fase a eliminazione diretta a partire dai **Sedicesimi di finale**.

---

## 🏗️ Struttura della Repository

La cartella è organizzata per separare chiaramente il frontend statico dai moduli di backend e script di utilità:

```text
├── index.html                  # Interfaccia utente principale (Standings, Matches, Bracket)
├── index.css                   # Foglio di stile CSS con design premium responsive
├── app.js                      # Logica frontend (Fetch dati CDN, navigazione tabellone mobile-sync)
├── classifica.json             # DB Classifica calcolato (aggiornato da GitHub Actions)
├── partite.json                # DB Partite reali e squadre qualificate (aggiornato da Actions)
├── pronostici.json             # DB Pronostici di tutti i 38 partecipanti
├── scripts/                    # Script Python per calcoli e importazione dati
│   ├── aggiorna_dati.py        # Script GitOps di calcolo automatico della classifica
│   ├── importa_tabellone.py    # Script per importare i tabelloni degli utenti da Google Forms CSV
│   ├── importa_esiti.py        # Script per importare i risultati esatti degli utenti da Google Forms CSV
│   └── import_data.py          # Script di inizializzazione iniziale
└── .github/workflows/
    └── update.yml              # Automazione GitHub Actions (avviata ogni 10 minuti o via API)
```

---

## 🏆 Regolamento del Gioco e Punteggi

Il calcolo della classifica segue le seguenti regole ufficiali:

1.  **Risultato Esatto (+3 Punti):** Punteggio esatto del match indovinato al 120' minuto (supplementari inclusi, rigori esclusi).
2.  **Segno Esatto 1X2 (+1 Punto):** Risultato esatto errato ma esito 1X2 corretto al 120' minuto.
3.  **Passaggio Turno (+1 Punto per squadra):** Per ogni singola squadra indovinata che si qualifica ai turni successivi nel tabellone ad eliminazione diretta (Sedicesimi, Ottavi, Quarti, Semifinali, Finale).
4.  **Vincitore del Mondiale (+10 Punti):** Vincitore assoluto indovinato prima dell'inizio del torneo (Antepost).
5.  **Premi Speciali (+5 Punti ciascuno):**
    *   L'altra squadra finalista del torneo.
    *   Miglior marcatore (Capocannoniere).
    *   Miglior giocatore del torneo (MVP).
    *   Miglior portiere del torneo.
    *   Miglior giovane del torneo.

---

## 📝 Gestione Pronostici con Google Forms

Per facilitare la raccolta dei dati dai 38 giocatori, puoi generare automaticamente i moduli Google Forms utilizzando il codice in **Google Apps Script** presente nella cartella del progetto.

### 1. Modulo 1: Pronostici del Tabellone Completo (Qualificazioni)
*Raccoglie le 16 squadre che passano gli ottavi, 8 quarti, 4 semifinali, 2 finali e il campione. Viene inviato una sola volta prima dei Sedicesimi.*
*   **Procedura d'importazione**:
    1. Scarica le risposte del Google Form in formato CSV.
    2. Rinomina il file scaricato in `risposte_tabellone.csv` e salvalo nella cartella principale del progetto.
    3. Esegui il comando:
       ```bash
       python3 scripts/importa_tabellone.py
       ```
    4. Lo script aggiornerà `pronostici.json` in automatico.

### 2. Modulo 2: Pronostici Risultati Esatti (Fase per Fase)
*Raccoglie i gol delle partite reali (supplementari inclusi, rigori esclusi) ed è inviato di volta in volta (Sedicesimi, Ottavi, Quarti, Semifinali, Finali) man mano che i match reali vengono stabiliti.*
*   **Procedura d'importazione**:
    1. Scarica le risposte del Google Form in formato CSV (es. `risposte_sedicesimi.csv`).
    2. Salvalo nella cartella principale del progetto.
    3. Esegui lo script passando il nome del file CSV e l'intervallo degli ID partita da importare (es. per i Sedicesimi da ID 73 a 88):
       ```bash
       python3 scripts/importa_esiti.py risposte_sedicesimi.csv 73 88
       ```
    4. Lo script mapperà le risposte e aggiornerà `pronostici.json` in automatico.

---

## 🛠️ Come Eseguire il Progetto in Locale

### 1. Avviare il Portale Web Statico
Per visualizzare l'interfaccia utente in locale (con visualizzazione del tabellone mobile-responsive e scorrimento del calendario), avvia un server web statico nella cartella principale:

```bash
python3 -m http.server 8080
```
Quindi apri il browser all'indirizzo [http://localhost:8080](http://localhost:8080).

### 2. Eseguire l'Aggiornamento Manuale della Classifica
Puoi lanciare lo script di calcolo in locale tramite Python (leggerà i dati in tempo reale dall'API e aggiornerà la classifica locale):

```bash
python3 scripts/aggiorna_dati.py
```

---

## 🌍 Fonti di Dati & Ringraziamenti

I dati delle partite, i risultati in tempo reale e il tabellone dei Mondiali 2026 vengono sincronizzati automaticamente grazie al progetto:
- **[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)** (creato da Gerald Bauer e gestito dalla community di `football.db`).
- L'applicazione interroga direttamente l'endpoint raw in CDN per evitare problemi di cache del browser: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`.
