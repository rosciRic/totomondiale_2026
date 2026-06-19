#!/usr/bin/env python3
"""
Totomondiale 2026 - importa_tabellone.py
Importa i pronostici della Fase Finale (Tabellone) esportati in CSV da Google Sheets.

Il Google Form deve raccogliere:
1. "Nome Giocatore" (deve corrispondere esattamente all'elenco dei 38 partecipanti)
2. "Passano agli Ottavi" (Checkbox con le 16 squadre scelte)
3. "Passano ai Quarti" (Checkbox con le 8 squadre scelte)
4. "Passano alle Semifinali" (Checkbox con le 4 squadre scelte)
5. "Passano in Finale" (Checkbox con le 2 squadre scelte)
6. "Vincitrice Finale Tabellone" (Scelta singola con la vincitrice)

Esportare il Google Sheet in CSV e salvarlo come 'risposte_tabellone.csv' nella stessa cartella.
Quindi eseguire questo script:
    python3 importa_tabellone.py
"""

import json
import csv
import os
import sys

PRONOSTICI_FILE = "pronostici.json"
CSV_FILE = "risposte_tabellone.csv"

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

def clean_list(text):
    """Pulisce le risposte multiscelta (es. 'Italia, Spagna' -> ['Italia', 'Spagna'])"""
    if not text:
        return []
    return [t.strip() for t in text.split(",") if t.strip()]

def main():
    print("=" * 60)
    print("TOTOMONDIALE 2026 - Importazione Tabellone da Google Forms")
    print("=" * 60)

    if not os.path.exists(CSV_FILE):
        print(f"Errore: File '{CSV_FILE}' non trovato.")
        print(f"Scarica le risposte del Google Form come CSV, rinominalo in '{CSV_FILE}' e riprova.")
        sys.exit(1)

    if not os.path.exists(PRONOSTICI_FILE):
        print(f"Errore: File '{PRONOSTICI_FILE}' non trovato.")
        sys.exit(1)

    # Carica pronostici correnti
    with open(PRONOSTICI_FILE, "r", encoding="utf-8") as f:
        pronostici = json.load(f)

    imported_count = 0

    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader) # Salta l'intestazione

        # Trova gli indici delle colonne (cerca parole chiave nel titolo della domanda)
        idx_nome = -1
        idx_ottavi = -1
        idx_quarti = -1
        idx_semi = -1
        idx_finale = -1
        idx_vincitore = -1

        for idx, col in enumerate(header):
            col_lower = col.lower()
            if "nome" in col_lower or "giocatore" in col_lower:
                idx_nome = idx
            elif "ottavi" in col_lower:
                idx_ottavi = idx
            elif "quarti" in col_lower:
                idx_quarti = idx
            elif "semifinali" in col_lower or "semi" in col_lower:
                idx_semi = idx
            elif "finale" in col_lower or "finalista" in col_lower:
                idx_finale = idx
            elif "vincitrice" in col_lower or "vincitore" in col_lower or "campione" in col_lower:
                idx_vincitore = idx

        # Validazione colonne
        if idx_nome == -1 or idx_ottavi == -1 or idx_quarti == -1 or idx_semi == -1 or idx_finale == -1 or idx_vincitore == -1:
            print("Errore: Impossibile mappare automaticamente le colonne del CSV.")
            print("Intestazioni trovate:", header)
            print("Verifica che le domande contengano le parole chiave: 'nome', 'ottavi', 'quarti', 'semi', 'finale', 'vincitrice'.")
            sys.exit(1)

        print("Colonne associate con successo:")
        print(f" - Giocatore: Colonna {idx_nome} ('{header[idx_nome]}')")
        print(f" - Passano agli Ottavi: Colonna {idx_ottavi} ('{header[idx_ottavi]}')")
        print(f" - Passano ai Quarti: Colonna {idx_quarti} ('{header[idx_quarti]}')")
        print(f" - Passano alle Semifinali: Colonna {idx_semi} ('{header[idx_semi]}')")
        print(f" - Passano in Finale: Colonna {idx_finale} ('{header[idx_finale]}')")
        print(f" - Vincitore: Colonna {idx_vincitore} ('{header[idx_vincitore]}')")
        print("-" * 60)

        for row in reader:
            if not row or len(row) <= max(idx_nome, idx_ottavi, idx_quarti, idx_semi, idx_finale, idx_vincitore):
                continue

            nome = row[idx_nome].strip()
            
            # Controllo nome simile
            if nome not in PARTICIPANTS:
                # Cerca corrispondenze parziali
                matched = False
                for p in PARTICIPANTS:
                    if p.lower() == nome.lower():
                        nome = p
                        matched = True
                        break
                if not matched:
                    print(f"[ATTENZIONE] Giocatore '{nome}' non riconosciuto nell'elenco ufficiale. Record saltato.")
                    continue

            ottavi_teams = clean_list(row[idx_ottavi])
            quarti_teams = clean_list(row[idx_quarti])
            semi_teams = clean_list(row[idx_semi])
            finale_teams = clean_list(row[idx_finale])
            vincitore_team = row[idx_vincitore].strip()

            # Mappa nel formato json di passaggio_turno
            passaggio_turno = {
                "sedicesimi": ottavi_teams,  # passano dai sedicesimi agli ottavi (16 squadre)
                "ottavi": quarti_teams,      # passano dai quarti (8 squadre)
                "quarti": semi_teams,        # passano alle semifinali (4 squadre)
                "semifinali": finale_teams,  # passano alla finale (2 squadre)
                "vincitore": vincitore_team
            }

            # Associa all'utente
            if nome in pronostici["partecipanti"]:
                pronostici["partecipanti"][nome]["passaggio_turno"] = passaggio_turno
                imported_count += 1
                print(f"Importato tabellone per: {nome}")
            else:
                print(f"[ATTENZIONE] Impossibile trovare '{nome}' nel file {PRONOSTICI_FILE}.")

    # Scrivi il file aggiornato
    with open(PRONOSTICI_FILE, "w", encoding="utf-8") as f:
        json.dump(pronostici, f, indent=2, ensure_ascii=False)

    print("-" * 60)
    print(f"Importazione completata con successo! Aggiornati {imported_count} partecipanti su {len(PARTICIPANTS)}.")
    print(f"Il database '{PRONOSTICI_FILE}' è stato aggiornato in locale. Esegui il push su GitHub per aggiornare la produzione.")

if __name__ == "__main__":
    main()
