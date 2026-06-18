# ⚽ Totomondiale 2026

Una web application moderna, ecocompatibile e a **costo zero** costruita con un'architettura **GitOps / Serverless** per gestire ed elaborare i pronostici dei mondiali di calcio USA-Messico-Canada 2026.

Il sistema gestisce **38 partecipanti**, l'intero mondiale da **104 partite** (formato a 48 squadre, incluse le 72 della fase a gironi e le 32 ad eliminazione diretta) e l'intera fase a eliminazione diretta a partire dai **Sedicesimi di finale**.

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
Lo script si collegherà automaticamente al feed pubblico di openfootball per scaricare i risultati correnti.

---

## 🌍 Fonti di Dati & Ringraziamenti

I dati delle partite, i risultati in tempo reale e il tabellone dei Mondiali 2026 vengono sincronizzati automaticamente grazie al progetto:
- **[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)** (creato da Gerald Bauer e gestito dalla community di `football.db`).

### Dettagli sulla sorgente dati:
*   Il file JSON viene rigenerato via GitHub Actions a partire da un file sorgente in formato testuale (`cup.txt`).
*   I dati sono rilasciati nel pubblico dominio (licenza **CC0**), consentendo l'uso libero senza chiavi API o limiti commerciali.
*   L'applicazione interroga direttamente l'endpoint raw: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`.
*   I contributi ai punteggi sono aperti a tutti: chiunque può partecipare agli aggiornamenti inviando Pull Request al repository originale o richiedendo l'accesso in scrittura diretta.
