#!/usr/bin/env python3
"""
Totomondiale 2026 - valida_pronostici.py
Valida la coerenza dei tabelloni direttamente dal file CSV scaricato da Google Forms (risposte_tabellone.csv).
Rileva errori di logica prima che vengano caricati nel database locale.
"""

import os
import re
import csv
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
CSV_FILE = os.path.join(ROOT_DIR, "risposte_tabellone.csv")
PARTITE_FILE = os.path.join(ROOT_DIR, "data", "partite.json")

def clean_team_name(name):
    if not name:
        return ""
    # Rimuove emoji bandiere e tag
    name = re.sub(r'[\U0001F1E6-\U0001F1FF]', '', name)
    name = re.sub(r'\U0001F3F4', '', name)
    name = re.sub(r'[\U000E0000-\U000E007F]', '', name)
    name = re.sub(r'[⚽\u2600-\u27BF\U0001f300-\U0001f64f\U0001f680-\U0001f6ff]', '', name)
    return name.strip()

def clean_list(text):
    if not text:
        return []
    return [clean_team_name(t) for t in text.split(",") if t.strip()]

def main():
    print("=" * 60)
    print("VALIDAZIONE PREVENTIVA CSV TABELLONI GIOCATORI")
    print("=" * 60)

    if not os.path.exists(CSV_FILE):
        print(f"Errore: File '{CSV_FILE}' non trovato.")
        print("Posiziona il file 'risposte_tabellone.csv' nella cartella principale per validarlo.")
        sys.exit(1)
        
    if not os.path.exists(PARTITE_FILE):
        print(f"Errore: File '{PARTITE_FILE}' non trovato.")
        sys.exit(1)

    with open(PARTITE_FILE, "r", encoding="utf-8") as f:
        partite_data = json.load(f)

    # Crea mappa delle partite reali
    partite_map = {p["id"]: p for p in partite_data["partite"]}

    # Relazioni genitori/figli nel tabellone reale
    parent_matches = {
        89: { "home": 74, "away": 77 },
        90: { "home": 73, "away": 75 },
        91: { "home": 76, "away": 78 },
        92: { "home": 79, "away": 80 },
        93: { "home": 83, "away": 84 },
        94: { "home": 81, "away": 82 },
        95: { "home": 86, "away": 88 },
        96: { "home": 85, "away": 87 },
        97: { "home": 89, "away": 90 },
        98: { "home": 93, "away": 94 },
        99: { "home": 91, "away": 92 },
        100: { "home": 95, "away": 96 },
        101: { "home": 97, "away": 98 },
        102: { "home": 99, "away": 100 },
        103: { "home": 102, "away": 101 }, # perdenti semifinali
        104: { "home": 102, "away": 101 }  # vincenti semifinali
    }

    count_totale_errori = 0

    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)

        # Mappa indici colonne
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
            # Fallbacks
            elif idx_ottavi == -1 and "ottavi" in col_lower:
                idx_ottavi = idx
            elif idx_quarti == -1 and "quarti" in col_lower:
                idx_quarti = idx
            elif idx_semi == -1 and ("semifinali" in col_lower or "semi" in col_lower):
                idx_semi = idx
            elif idx_finale == -1 and ("finale" in col_lower or "finalista" in col_lower):
                idx_finale = idx
            elif idx_vincitore == -1 and ("vincitrice" in col_lower or "vincitore" in col_lower or "campione" in col_lower or "vincerà" in col_lower):
                idx_vincitore = idx
            elif idx_terzo == -1 and ("terzo" in col_lower or "3°" in col_lower or "3" in col_lower) and "posto" in col_lower:
                idx_terzo = idx

        # Validazione colonne esistenti
        if idx_nome == -1 or idx_ottavi == -1 or idx_quarti == -1 or idx_semi == -1 or idx_finale == -1 or idx_vincitore == -1:
            print("Errore: Impossibile associare automaticamente le colonne del CSV.")
            print("Intestazioni del CSV trovate:", header)
            sys.exit(1)

        for row in reader:
            max_idx = max(idx_nome, idx_ottavi, idx_quarti, idx_semi, idx_finale, idx_vincitore, idx_terzo)
            if not row or len(row) <= max_idx:
                continue

            giocatore = row[idx_nome].strip()
            
            # Estrazione scelte
            ottavi_teams = clean_list(row[idx_ottavi])
            quarti_teams = clean_list(row[idx_quarti])
            semi_teams = clean_list(row[idx_semi])
            finale_teams = clean_list(row[idx_finale])
            vincitore_team = clean_team_name(row[idx_vincitore])
            terzo_posto_team = clean_team_name(row[idx_terzo]) if idx_terzo != -1 else ""

            passaggio = {
                "sedicesimi": ottavi_teams,
                "ottavi": quarti_teams,
                "quarti": semi_teams,
                "semifinali": finale_teams,
                "vincitore": vincitore_team,
                "terzo_posto": terzo_posto_team
            }

            errori = []

            # 1. Controllo numero di squadre per fase
            fasi_attese = {
                "sedicesimi": 16,
                "ottavi": 8,
                "quarti": 4,
                "semifinali": 2
            }

            for fase, num_atteso in fasi_attese.items():
                lista = passaggio.get(fase, [])
                if len(lista) != num_atteso:
                    errori.append(f"Fase '{fase}': Selezionate {len(lista)} squadre invece di {num_atteso}.")

            # 2. Controllo coerenza accoppiamenti
            user_winners = {}
            user_losers = {}

            # FASE 1: Sedicesimi -> Ottavi (Matches 73 a 88)
            sedicesimi_matches = range(73, 89)
            u_ottavi = {clean_team_name(t).lower() for t in passaggio.get("sedicesimi", []) if t}

            for mid in sedicesimi_matches:
                match = partite_map.get(mid)
                if not match:
                    continue
                home = clean_team_name(match.get("home", "")).lower()
                away = clean_team_name(match.get("away", "")).lower()

                has_home = home in u_ottavi
                has_away = away in u_ottavi

                if has_home and has_away:
                    errori.append(f"Partita {mid} ({match['home']} vs {match['away']}): Qualificate ENTRAMBE le squadre agli Ottavi.")
                elif not has_home and not has_away:
                    errori.append(f"Partita {mid} ({match['home']} vs {match['away']}): Qualificata NESSUNA squadra agli Ottavi.")
                elif has_home:
                    user_winners[mid] = match["home"]
                    user_losers[mid] = match["away"]
                else:
                    user_winners[mid] = match["away"]
                    user_losers[mid] = match["home"]

            # FASE 2: Ottavi -> Quarti (Matches 89 a 96)
            u_quarti = {clean_team_name(t).lower() for t in passaggio.get("ottavi", []) if t}
            for mid in range(89, 97):
                parents = parent_matches[mid]
                home_parent = user_winners.get(parents["home"])
                away_parent = user_winners.get(parents["away"])

                if not home_parent or not away_parent:
                    continue

                home_clean = clean_team_name(home_parent).lower()
                away_clean = clean_team_name(away_parent).lower()

                has_home = home_clean in u_quarti
                has_away = away_clean in u_quarti

                if has_home and has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificate ENTRAMBE le squadre ai Quarti.")
                elif not has_home and not has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificata NESSUNA squadra ai Quarti.")
                elif has_home:
                    user_winners[mid] = home_parent
                    user_losers[mid] = away_parent
                else:
                    user_winners[mid] = away_parent
                    user_losers[mid] = home_parent

            # FASE 3: Quarti -> Semifinali (Matches 97 a 100)
            u_semifinali = {clean_team_name(t).lower() for t in passaggio.get("quarti", []) if t}
            for mid in range(97, 101):
                parents = parent_matches[mid]
                home_parent = user_winners.get(parents["home"])
                away_parent = user_winners.get(parents["away"])

                if not home_parent or not away_parent:
                    continue

                home_clean = clean_team_name(home_parent).lower()
                away_clean = clean_team_name(away_parent).lower()

                has_home = home_clean in u_semifinali
                has_away = away_clean in u_semifinali

                if has_home and has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificate ENTRAMBE le squadre alle Semifinali.")
                elif not has_home and not has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificata NESSUNA squadra alle Semifinali.")
                elif has_home:
                    user_winners[mid] = home_parent
                    user_losers[mid] = away_parent
                else:
                    user_winners[mid] = away_parent
                    user_losers[mid] = home_parent

            # FASE 4: Semifinali -> Finale (Matches 101 e 102)
            u_finalisti = {clean_team_name(t).lower() for t in passaggio.get("semifinali", []) if t}
            for mid in [101, 102]:
                parents = parent_matches[mid]
                home_parent = user_winners.get(parents["home"])
                away_parent = user_winners.get(parents["away"])

                if not home_parent or not away_parent:
                    continue

                home_clean = clean_team_name(home_parent).lower()
                away_clean = clean_team_name(away_parent).lower()

                has_home = home_clean in u_finalisti
                has_away = away_clean in u_finalisti

                if has_home and has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificate ENTRAMBE le squadre in Finale.")
                elif not has_home and not has_away:
                    errori.append(f"Partita {mid} ({home_parent} vs {away_parent}): Qualificata NESSUNA squadra in Finale.")
                elif has_home:
                    user_winners[mid] = home_parent
                    user_losers[mid] = away_parent
                else:
                    user_winners[mid] = away_parent
                    user_losers[mid] = home_parent

            # FASE 5: Vincitore Mondiale (Match 104)
            u_campione = clean_team_name(passaggio.get("vincitore", "")).lower()
            finalista_home = user_winners.get(101)
            finalista_away = user_winners.get(102)

            if finalista_home and finalista_away:
                fh_clean = clean_team_name(finalista_home).lower()
                fa_clean = clean_team_name(finalista_away).lower()

                if u_campione not in [fh_clean, fa_clean]:
                    errori.append(f"Vincitore Mondiale: '{passaggio.get('vincitore')}' non è uno dei due finalisti pronosticati ({finalista_home} o {finalista_away}).")

            # FASE 6: 3° Posto (Match 103)
            u_terzo = clean_team_name(passaggio.get("terzo_posto", "")).lower()
            perdente_home = user_losers.get(101)
            perdente_away = user_losers.get(102)

            if perdente_home and perdente_away:
                ph_clean = clean_team_name(perdente_home).lower()
                pa_clean = clean_team_name(perdente_away).lower()

                if u_terzo not in [ph_clean, pa_clean]:
                    errori.append(f"3° Posto: '{passaggio.get('terzo_posto')}' non è uno dei due perdenti delle semifinali pronosticati ({perdente_home} o {perdente_away}).")

            # Visualizza errori per giocatore
            if errori:
                count_totale_errori += len(errori)
                print(f"\n⚠️  Giocatore: {giocatore} ({len(errori)} errori nel CSV)")
                for err in errori:
                    print(f"  - {err}")

    if count_totale_errori == 0:
        print("\n✅ Complimenti! Tutte le risposte presenti nel CSV sono coerenti al 100%.")
    else:
        print(f"\n❌ Trovati in totale {count_totale_errori} errori di coerenza nel file CSV.")
    print("=" * 60)

if __name__ == "__main__":
    main()
