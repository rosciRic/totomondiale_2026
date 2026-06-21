#!/usr/bin/env python3
"""
Totomondiale 2026 - importa_esiti.py
Importa i pronostici dei risultati esatti (Sedicesimi, Ottavi, Quarti, Semifinali, Finali) da Google Forms CSV.

Per evitare errori di formattazione del testo (es. '2-0', '2 - 0', '2:0'),
si consiglia di impostare nel modulo di Google due domande a elenco a discesa/scelta multipla per ogni partita:
- Partita [ID] - Gol Casa (Opzioni: 0, 1, 2, 3, 4, 5, etc.)
- Partita [ID] - Gol Trasferta (Opzioni: 0, 1, 2, 3, 4, 5, etc.)

Nel titolo della domanda deve essere presente l'ID del match racchiuso tra parentesi quadre o tonde,
oppure semplicemente il numero ID (es: "Giappone - Spagna [ID: 89] - Gol Casa").

Uso:
    python3 importa_esiti.py risposte_sedicesimi.csv 73 88
    (dove 73 e 88 sono l'ID di inizio e fine delle partite da importare nel CSV)
"""

import json
import csv
import os
import sys
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
PRONOSTICI_FILE = os.path.join(ROOT_DIR, "pronostici.json")

# Nomi dei partecipanti per la validazione
PARTICIPANTS = {
    "Marco D'Andrea", "Andrea Pellè", "Edoardo Roscica", "Leonardo Piras",
    "Marco Lala", "Raffaele Chiffi", "Andrea Quarto", "Marco Boellis",
    "Tony Pindinello", "Carlo Fantasia", "Matteo Birilli", "Gabriele Carrarini",
    "Luigi Marchello", "Filippo Marchello", "Matteo Serafino", "Leandro Micelli",
    "Pino Bruno", "Manuel Farlò", "Simone Turturo", "Mattia Tramacere",
    "Daniele Garzya", "Sergio Garzya", "Daniele Bove", "Marco Pellè",
    "Manuel Pellè", "Mattia Pellè", "Francesco Pastore", "Fabio Baldacci",
    "Stefano De Giorgi", "Jacopo De Giorgi", "Pino De Giorgi", "Luigi Miccoli",
    "Mattia Nicolau", "Giacomo Ingrosso", "Marco Ingrosso", "Daniele Sedile",
    "Andrea Sedile", "Carmine Apollonio",
}

def main():
    print("=" * 60)
    print("TOTOMONDIALE 2026 - Importazione Risultati Esatti da Google Forms")
    print("=" * 60)

    # Controlla argomenti passati da riga di comando
    if len(sys.argv) < 4:
        print("Uso corretto dello script:")
        print("  python3 importa_esiti.py <nome_file.csv> <id_partitata_inizio> <id_partita_fine>")
        print("\nEsempio per i Sedicesimi (dalla partita 73 alla 88):")
        print("  python3 importa_esiti.py risposte_sedicesimi.csv 73 88")
        sys.exit(1)

    csv_filename = sys.argv[1]
    try:
        start_id = int(sys.argv[2])
        end_id = int(sys.argv[3])
    except ValueError:
        print("Errore: I parametri di inizio e fine ID partita devono essere numeri interi.")
        sys.exit(1)

    csv_path = csv_filename
    if not os.path.exists(csv_path):
        csv_path = os.path.join(ROOT_DIR, csv_filename)

    if not os.path.exists(csv_path):
        print(f"Errore: File '{csv_filename}' non trovato.")
        sys.exit(1)

    if not os.path.exists(PRONOSTICI_FILE):
        print(f"Errore: File '{PRONOSTICI_FILE}' non trovato.")
        sys.exit(1)

    # Carica database pronostici
    with open(PRONOSTICI_FILE, "r", encoding="utf-8") as f:
        pronostici = json.load(f)

    # Leggi il file CSV delle risposte
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)

        # 1. Identifica colonna del Giocatore
        idx_nome = -1
        for idx, col in enumerate(header):
            col_lower = col.lower()
            if "nome" in col_lower or "giocatore" in col_lower:
                idx_nome = idx
                break

        if idx_nome == -1:
            print("Errore: Impossibile trovare la colonna del Nome Giocatore nel CSV.")
            sys.exit(1)

        # 2. Mappa le colonne per ciascun match ID nel range selezionato
        # Mappa: match_id -> { "home_col_idx": int, "away_col_idx": int }
        match_cols = {}
        
        for match_id in range(start_id, end_id + 1):
            cols_found = []
            
            # Cerca l'ID nel testo delle colonne
            for idx, col in enumerate(header):
                # Cerchiamo l'ID come numero isolato o preceduto da ID (es. [ID: 73], (73), Partita 73)
                # Usiamo espressioni regolari per evitare falsi positivi (es. 73 non deve matchare 173 o 730)
                pattern = r'\b' + str(match_id) + r'\b'
                if re.search(pattern, col):
                    cols_found.append((idx, col))
            
            if len(cols_found) == 2:
                # Assumiamo che la prima colonna trovata per quel match sia la squadra in casa
                # e la seconda sia la squadra in trasferta
                match_cols[match_id] = {
                    "home_idx": cols_found[0][0],
                    "away_idx": cols_found[1][0]
                }
            elif len(cols_found) == 1:
                # Se è presente una sola colonna per partita, forse hanno inserito il punteggio in formato testo "2-0"
                # Supportiamo anche questo formato
                match_cols[match_id] = {
                    "single_idx": cols_found[0][0]
                }
            else:
                print(f"[AVVISO] Trovate {len(cols_found)} colonne per la Partita ID {match_id}. Impossibile mappare questo match.")

        if not match_cols:
            print("Errore: Impossibile trovare colonne corrispondenti agli ID partita nel CSV.")
            sys.exit(1)

        print(f"Mappatura completata. Trovati campi per {len(match_cols)} partite nel range {start_id}-{end_id}.")
        print("-" * 60)

        imported_users = 0

        # 3. Importa i dati riga per riga
        for row in reader:
            if not row or len(row) <= idx_nome:
                continue

            nome = row[idx_nome].strip()

            # Correzione robusta del nome giocatore
            if nome not in PARTICIPANTS:
                matched = False
                for p in PARTICIPANTS:
                    if p.lower() == nome.lower():
                        nome = p
                        matched = True
                        break
                if not matched:
                    print(f"[ATTENZIONE] Giocatore '{nome}' non riconosciuto nell'elenco ufficiale. Record saltato.")
                    continue

            # Assicurati che l'utente esista nel json
            if nome not in pronostici["partecipanti"]:
                print(f"[ATTENZIONE] Giocatore '{nome}' non trovato nel file {PRONOSTICI_FILE}.")
                continue

            user_predictions = pronostici["partecipanti"][nome].setdefault("partite", {})

            for match_id, cols in match_cols.items():
                match_id_str = str(match_id)
                home_score = None
                away_score = None

                if "single_idx" in cols:
                    # Caso 1: Singola colonna con formato testo (es. "2-0" o "1 - 1")
                    val = row[cols["single_idx"]].strip().replace(" ", "")
                    m = re.match(r"(\d+)-(\d+)", val)
                    if m:
                        home_score = int(m.group(1))
                        away_score = int(m.group(2))
                else:
                    # Caso 2: Due colonne separate per gol Casa e Gol Trasferta
                    val_h = row[cols["home_idx"]].strip()
                    val_a = row[cols["away_idx"]].strip()
                    if val_h.isdigit() and val_a.isdigit():
                        home_score = int(val_h)
                        away_score = int(val_a)

                if home_score is not None and away_score is not None:
                    user_predictions[match_id_str] = {
                        "home_score": home_score,
                        "away_score": away_score
                    }
            
            imported_users += 1
            print(f"Importati pronostici risultati esatti per: {nome}")

    # Salva il file json aggiornato
    with open(PRONOSTICI_FILE, "w", encoding="utf-8") as f:
        json.dump(pronostici, f, indent=2, ensure_ascii=False)

    # Aggiorna il file di versione per il caching del client
    import time
    version_file = os.path.join(ROOT_DIR, "version.json")
    try:
        with open(version_file, "w", encoding="utf-8") as f:
            json.dump({"version": int(time.time())}, f)
        print(f"File di versione {version_file} aggiornato con successo.")
    except Exception as e:
        print(f"Errore durante l'aggiornamento di {version_file}: {e}")

    print("-" * 60)
    print(f"Importazione completata con successo! Aggiornati {imported_users} partecipanti.")
    print("Esegui il push su GitHub per aggiornare la produzione online.")

if __name__ == "__main__":
    main()
