# ⚽ Totomondiale 2026

Una web application moderna, ecocompatibile e a **costo zero** costruita con un'architettura **GitOps / Serverless** per gestire ed elaborare i pronostici dei mondiali di calcio USA-Messico-Canada 2026.

Il sistema gestisce **38 partecipanti**, la fase a gironi da **72 partite** (formato a 48 squadre) e l'intera fase a eliminazione diretta a partire dai **Sedicesimi di finale**.

---

## 🏗️ Architettura del Sistema

L'applicazione non richiede database tradizionali o server backend costosi:

*   **Frontend:** HTML5, CSS3 (con design responsive mobile-first) e Vanilla JavaScript, ospitato gratuitamente su **GitHub Pages**.
*   **Database:** I dati di classifica, partite e pronostici sono memorizzati direttamente all'interno della repository come file statici JSON (`classifica.json`, `partite.json`, `pronostici.json`).
*   **Backend & Automazione (GitOps):** Uno script Python (`aggiorna_dati.py`) viene eseguito periodicamente tramite **GitHub Actions**. Lo script scarica i risultati dal vivo da un'API sportiva esterna (API-Football), ricalcola i punteggi degli utenti secondo il regolamento, aggiorna i database JSON ed effettua un `git commit & push` automatico aggiornando istantaneamente il sito.

---

## 🏆 Regolamento del Gioco e Punteggi

Il calcolo della classifica segue le seguenti regole ufficiali:

1.  **Risultato Esatto (+3 Punti):** Punteggio esatto del match indovinato (es. pronostico 2-0, partita terminata 2-0).
2.  **Segno Esatto 1X2 (+1 Punto):** Risultato esatto errato ma esito 1X2 corretto (es. pronostico 2-0, partita terminata 2-1).
3.  **Passaggio Turno (+1 Punto per squadra):** Per ogni singola squadra indovinata che si qualifica ai turni successivi nel tabellone ad eliminazione diretta (Sedicesimi, Ottavi, Quarti, Semifinali, Finale).
4.  **Vincitore del Mondiale (+10 Punti):** Vincitore assoluto indovinato prima dell'inizio del torneo.
5.  **Premi Speciali (+5 Punti ciascuno):**
    *   L'altra squadra finalista del torneo.
    *   Miglior marcatore (Capocannoniere).
    *   Miglior giocatore del torneo (MVP).
    *   Miglior portiere del torneo.
    *   Miglior giovane del torneo.

---

## 🛠️ Come Eseguire il Progetto in Locale

### 1. Avviare il Portale Web
Per visualizzare l'interfaccia utente in locale, è sufficiente avviare un server web statico nella cartella principale del progetto:

```bash
python3 -m http.server 8080
```
Quindi apri il browser all'indirizzo [http://localhost:8080](http://localhost:8080).

### 2. Eseguire l'Aggiornamento della Classifica Manualmente
Puoi lanciare lo script di calcolo in locale tramite Python:

```bash
python3 aggiorna_dati.py
```
*Nota: In assenza di una chiave API configurata nelle variabili d'ambiente, lo script girerà in modalità simulazione locale (MOCK) aggiornando alcuni risultati campione a scopo dimostrativo.*

---

## 🔑 Configurazione GitHub Actions & API-Football

Per far sì che il backend si aggiorni da solo con i risultati del mondo reale:

1.  Registrati su [API-Sports (API-Football)](https://dashboard.api-sports.io/) e ottieni la tua **API Key**.
2.  Nel tuo repository GitHub, vai su **Settings** -> **Secrets and variables** -> **Actions**.
3.  Crea un nuovo segreto chiamato `API_FOOTBALL_KEY` ed inserisci il valore del tuo token.
4.  Il file di configurazione in `.github/workflows/update.yml` avvierà automaticamente lo script Python ogni giorno alle 03:00 UTC (o manualmente tramite la tab **Actions**) aggiornando il sito con i dati live.
