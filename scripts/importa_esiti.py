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
PRONOSTICI_FILE = os.path.join(ROOT_DIR, "data", "pronostici.json")

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

    # Cerca file CSV idonei in base agli ID delle partite
    def find_default_csv(start, end):
        keyword = "sedicesimi"
        if start == 89 and end == 96:
            keyword = "ottavi"
        elif start == 97 and end == 100:
            keyword = "quarti"
        elif start == 101 and end == 102:
            keyword = "semifinali"
        elif start >= 103:
            keyword = "finale"

        # Cerca file con la parola chiave specifica sia in ROOT_DIR che in ROOT_DIR/csv
        search_dirs = [ROOT_DIR, os.path.join(ROOT_DIR, "csv")]
        for s_dir in search_dirs:
            if os.path.exists(s_dir):
                matching_files = [f for f in os.listdir(s_dir) if f.lower().endswith('.csv') and (keyword in f.lower() or (keyword == "semifinali" and "semi" in f.lower()) or (keyword == "finale" and "finali" in f.lower()))]
                if matching_files:
                    return os.path.join(s_dir, matching_files[0])

        # Fallback generico
        for s_dir in search_dirs:
            if os.path.exists(s_dir):
                generic_files = [f for f in os.listdir(s_dir) if f.lower().endswith('.csv') and ('modulo' in f.lower() or 'risultati esatti' in f.lower() or 'esiti' in f.lower())]
                if generic_files:
                    return os.path.join(s_dir, generic_files[0])
        return "risposte_sedicesimi.csv"

    if len(sys.argv) >= 4:
        csv_filename = sys.argv[1]
        try:
            start_id = int(sys.argv[2])
            end_id = int(sys.argv[3])
        except ValueError:
            print("Errore: I parametri di inizio e fine ID partita devono essere numeri interi.")
            sys.exit(1)
    elif len(sys.argv) == 3:
        try:
            start_id = int(sys.argv[1])
            end_id = int(sys.argv[2])
            csv_filename = find_default_csv(start_id, end_id)
        except ValueError:
            print("Errore: I parametri di inizio e fine ID partita devono essere numeri interi.")
            sys.exit(1)
    elif len(sys.argv) == 2:
        csv_filename = sys.argv[1]
    else:
        csv_filename = find_default_csv(start_id, end_id)

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

    # Carica database partite per mappare le colonne tramite i nomi delle squadre
    PARTITE_FILE = os.path.join(ROOT_DIR, "data", "partite.json")
    partite_map = {}
    if os.path.exists(PARTITE_FILE):
        try:
            with open(PARTITE_FILE, "r", encoding="utf-8") as f:
                partite_data = json.load(f)
                partite_map = {m["id"]: m for m in partite_data.get("partite", [])}
        except Exception as e:
            print(f"[AVVISO] Impossibile caricare {PARTITE_FILE}: {e}")

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
            home_idx = -1
            away_idx = -1
            
            # 1. Prova prima a mappare tramite le chiavi esplicite H{match_id} e A{match_id} (es. [H73] e [A73])
            for idx, col in enumerate(header):
                if f"H{match_id}" in col:
                    home_idx = idx
                elif f"A{match_id}" in col:
                    away_idx = idx
            
            # 2. Se non li trova, prova a mappare per nome squadra (se abbiamo le info del match da partite.json)
            if home_idx == -1 or away_idx == -1:
                match_info = partite_map.get(match_id)
                if match_info:
                    home_team = match_info.get("home", "")
                    away_team = match_info.get("away", "")
                    
                    # Cerca le colonne corrispondenti alle squadre
                    for idx, col in enumerate(header):
                        col_lower = col.lower()
                        # Confronto case-insensitive
                        if home_team.lower() in col_lower:
                            home_idx = idx
                        elif away_team.lower() in col_lower:
                            away_idx = idx

            # Se la mappatura è riuscita (con codici o con nomi), registrala
            if home_idx != -1 and away_idx != -1:
                match_cols[match_id] = {
                    "home_idx": home_idx,
                    "away_idx": away_idx
                }
            else:
                # Fallback: prova con il vecchio metodo cercando l'ID partita nelle domande
                cols_found = []
                for idx, col in enumerate(header):
                    pattern = r'\b' + str(match_id) + r'\b'
                    if re.search(pattern, col):
                        cols_found.append((idx, col))
                
                if len(cols_found) == 2:
                    match_cols[match_id] = {
                        "home_idx": cols_found[0][0],
                        "away_idx": cols_found[1][0]
                    }
                elif len(cols_found) == 1:
                    match_cols[match_id] = {
                        "single_idx": cols_found[0][0]
                    }
                else:
                    match_info = partite_map.get(match_id)
                    home_team_name = match_info.get("home", "Casa") if match_info else "Casa"
                    away_team_name = match_info.get("away", "Trasferta") if match_info else "Trasferta"
                    print(f"[AVVISO] Impossibile mappare la Partita ID {match_id} ({home_team_name} vs {away_team_name}) nel CSV.")

        # 3. Allineamento sequenziale per i match con segnaposto non mappati per nome
        if len(match_cols) < (end_id - start_id + 1):
            print("[INFO] Alcune partite non sono state mappate per nome. Avvio l'allineamento sequenziale...")
            
            # Sequenza del tabellone per mappare le colonne in ordine
            bracket_order = [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]
            active_order = [mid for mid in bracket_order if start_id <= mid <= end_id]
            
            # Le colonne delle risposte delle partite partono subito dopo l'indice del nome giocatore
            current_col_idx = idx_nome + 1
            for mid in active_order:
                # Se questo match non è ancora stato mappato, lo associamo alle prossime due colonne disponibili
                if mid not in match_cols:
                    if current_col_idx + 1 < len(header):
                        match_cols[mid] = {
                            "home_idx": current_col_idx,
                            "away_idx": current_col_idx + 1
                        }
                # Avanziamo sempre di 2 colonne (1 per i gol di casa, 1 per i gol di trasferta)
                current_col_idx += 2

        if not match_cols:
            print("Errore: Impossibile trovare colonne corrispondenti alle partite nel CSV.")
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
