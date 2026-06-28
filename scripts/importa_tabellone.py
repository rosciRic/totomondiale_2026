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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
PRONOSTICI_FILE = os.path.join(ROOT_DIR, "data", "pronostici.json")
CSV_FILE = os.path.join(ROOT_DIR, "🏆 MODULO 1_ Pronostici Tabellone Mondiale 2026 (Risposte) - Risposte del modulo 1.csv")
if not os.path.exists(CSV_FILE):
    CSV_FILE = os.path.join(ROOT_DIR, "risposte_tabellone.csv")

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

import re

def clean_team_name(name):
    if not name:
        return ""
    # Rimuove emoji delle bandiere (Regional Indicator Symbols)
    name = re.sub(r'[\U0001F1E6-\U0001F1FF]', '', name)
    # Rimuove bandiere speciali (come Inghilterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿)
    name = re.sub(r'\U0001F3F4', '', name)
    # Rimuove caratteri tag di suddivisione invisibili
    name = re.sub(r'[\U000E0000-\U000E007F]', '', name)
    # Rimuove emoji del pallone da calcio e altri simboli comuni
    name = re.sub(r'[⚽\u2600-\u27BF\U0001f300-\U0001f64f\U0001f680-\U0001f6ff]', '', name)
    return name.strip()

def clean_list(text):
    """Pulisce le risposte multiscelta (es. 'Italia, Spagna' -> ['Italia', 'Spagna'])"""
    if not text:
        return []
    return [clean_team_name(t) for t in text.split(",") if t.strip()]

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
        idx_terzo = -1

        for idx, col in enumerate(header):
            col_lower = col.lower()
            if "nome" in col_lower or "giocatore" in col_lower:
                idx_nome = idx
            elif "[t16]" in col_lower:
                idx_ottavi = idx
            elif "[t8]" in col_lower:
                idx_quarti = idx
            elif "[t4]" in col_lower:
                idx_semi = idx
            elif "[t2]" in col_lower:
                idx_finale = idx
            elif "[t1]" in col_lower:
                idx_vincitore = idx
            elif "[t3]" in col_lower:
                idx_terzo = idx
            # Fallback basati su parole chiave per vecchi moduli
            elif idx_ottavi == -1 and "ottavi" in col_lower:
                idx_ottavi = idx
            elif idx_quarti == -1 and "quarti" in col_lower:
                idx_quarti = idx
            elif idx_semi == -1 and ("semifinali" in col_lower or "semi" in col_lower):
                idx_semi = idx
            elif idx_finale == -1 and ("finale" in col_lower or "finalista" in col_lower):
                idx_finale = idx
            elif idx_vincitore == -1 and ("vincitrice" in col_lower or "vincitore" in col_lower or "campione" in col_lower or "vincerà" in col_lower or "coppa" in col_lower or "mondo" in col_lower):
                idx_vincitore = idx
            elif idx_terzo == -1 and ("terzo" in col_lower or "3°" in col_lower or "3" in col_lower) and "posto" in col_lower:
                idx_terzo = idx

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
        if idx_terzo != -1:
            print(f" - Vincitore 3° Posto: Colonna {idx_terzo} ('{header[idx_terzo]}')")
        print("-" * 60)

        for row in reader:
            max_idx = max(idx_nome, idx_ottavi, idx_quarti, idx_semi, idx_finale, idx_vincitore, idx_terzo)
            if not row or len(row) <= max_idx:
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
            vincitore_team = clean_team_name(row[idx_vincitore])
            terzo_posto_team = clean_team_name(row[idx_terzo]) if idx_terzo != -1 else None

            # Mappa nel formato json di passaggio_turno
            passaggio_turno = {
                "sedicesimi": ottavi_teams,  # passano dai sedicesimi agli ottavi (16 squadre)
                "ottavi": quarti_teams,      # passano dai quarti (8 squadre)
                "quarti": semi_teams,        # passano alle semifinali (4 squadre)
                "semifinali": finale_teams,  # passano alla finale (2 squadre)
                "vincitore": vincitore_team
            }
            if terzo_posto_team:
                passaggio_turno["terzo_posto"] = terzo_posto_team

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
    print(f"Importazione completata con successo! Aggiornati {imported_count} partecipanti su {len(PARTICIPANTS)}.")
    print(f"Il database '{PRONOSTICI_FILE}' è stato aggiornato in locale. Esegui il push su GitHub per aggiornare la produzione.")

if __name__ == "__main__":
    main()
