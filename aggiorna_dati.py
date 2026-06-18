#!/usr/bin/env python3
import json
import os
import sys

# File paths
PARTITE_FILE = "partite.json"
PRONOSTICI_FILE = "pronostici.json"
CLASSIFICA_FILE = "classifica.json"

def get_match_sign(home_score, away_score):
    """Returns the sign of the match: '1' for home win, '2' for away win, 'X' for draw."""
    if home_score is None or away_score is None:
        return None
    if home_score > away_score:
        return "1"
    elif home_score < away_score:
        return "2"
    else:
        return "X"

# Translation dictionary to map API-Football English team names to Italian names in our DB
# Covers all 48 teams in the FIFA World Cup 2026
TEAM_TRANSLATIONS = {
    "mexico": "Messico", "south africa": "Sudafrica",
    "korea republic": "Corea del Sud", "south korea": "Corea del Sud",
    "czech republic": "Repubblica Ceca", "czechia": "Repubblica Ceca",
    "canada": "Canada", "bosnia & herzegovina": "Bosnia ed Erzegovina",
    "bosnia and herzegovina": "Bosnia ed Erzegovina",
    "usa": "Stati Uniti", "united states": "Stati Uniti",
    "paraguay": "Paraguay", "qatar": "Qatar", "switzerland": "Svizzera",
    "brazil": "Brasile", "morocco": "Marocco", "haiti": "Haiti",
    "scotland": "Scozia", "australia": "Australia", "turkey": "Turchia",
    "turkiye": "Turchia",
    "germany": "Germania", "curacao": "Curaçao", "curaçao": "Curaçao",
    "netherlands": "Olanda", "japan": "Giappone",
    "ivory coast": "Costa d'Avorio", "cote d'ivoire": "Costa d'Avorio",
    "côte d'ivoire": "Costa d'Avorio",
    "ecuador": "Ecuador", "sweden": "Svezia", "tunisia": "Tunisia",
    "spain": "Spagna", "cape verde": "Capo Verde", "cabo verde": "Capo Verde",
    "belgium": "Belgio", "egypt": "Egitto",
    "saudi arabia": "Arabia Saudita", "uruguay": "Uruguay",
    "iran": "Iran", "new zealand": "Nuova Zelanda",
    "france": "Francia", "senegal": "Senegal", "iraq": "Iraq",
    "norway": "Norvegia", "argentina": "Argentina", "algeria": "Algeria",
    "austria": "Austria", "jordan": "Giordania",
    "portugal": "Portogallo", "dr congo": "RD Congo",
    "congo dr": "RD Congo", "democratic republic of congo": "RD Congo",
    "england": "Inghilterra", "croatia": "Croazia",
    "ghana": "Ghana", "panama": "Panama", "uzbekistan": "Uzbekistan",
    "colombia": "Colombia", "italy": "Italia",
}

def normalize_team_name(name):
    """Normalizes team names using the translation map to ensure correct alignment with DB."""
    if not name:
        return ""
    name_clean = name.strip().lower()
    return TEAM_TRANSLATIONS.get(name_clean, name.strip())

def fetch_risultati_real_api():
    """
    Fetches real matches status from openfootball's public World Cup 2026 JSON.
    Does not require any API Key.
    """
    import urllib.request
    import urllib.error
    
    print("Connessione a openfootball/worldcup.json in corso...")
    url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
    
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0")
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("matches", [])
    except urllib.error.URLError as e:
        print(f"Impossibile contattare l'API di openfootball: {e}")
        return None

def is_placeholder_team(name):
    """Checks if a team name in openfootball is a placeholder (e.g. 1A, 2B, W73, L101, etc.)."""
    if not name:
        return True
    name_clean = name.strip()
    import re
    # Match strings starting with digits followed by letters (e.g., 1A, 2B, 3A/B)
    if re.match(r'^\d+[A-L]', name_clean):
        return True
    if '/' in name_clean:
        return True
    if name_clean.startswith('W') and name_clean[1:].isdigit():
        return True
    if name_clean.startswith('L') and name_clean[1:].isdigit():
        return True
    return False

def aggiorna_risultati_partite():
    """
    Fetches match results from the openfootball API, updates group stage matches in
    partite.json, and automatically extracts qualified teams for knockout rounds.
    """
    openfootball_matches = fetch_risultati_real_api()
    
    if not openfootball_matches:
        print("Download fallito o nessun dato ricevuto. Mantengo i dati correnti.")
        return
        
    if not os.path.exists(PARTITE_FILE):
        print(f"Errore: {PARTITE_FILE} non trovato.")
        return

    with open(PARTITE_FILE, "r", encoding="utf-8") as f:
        local_data = json.load(f)

    updated = False
    
    # 1. Update Group Stage matches (ID 1-72) in local database
    for match in openfootball_matches:
        team1 = match.get("team1")
        team2 = match.get("team2")
        score = match.get("score")
        
        if not team1 or not team2 or not score:
            continue
            
        ft_score = score.get("ft")
        if not isinstance(ft_score, list) or len(ft_score) < 2:
            continue
            
        norm_home = normalize_team_name(team1)
        norm_away = normalize_team_name(team2)
        goals_home = ft_score[0]
        goals_away = ft_score[1]
        
        # Look for the matching local match in our 72 group stage matches
        for local_match in local_data.get("partite", []):
            loc_home = normalize_team_name(local_match.get("home"))
            loc_away = normalize_team_name(local_match.get("away"))
            
            if (loc_home == norm_home and loc_away == norm_away) or (loc_home == norm_away and loc_away == norm_home):
                # Align scores according to home/away orientation of the local DB
                if loc_home == norm_home:
                    local_goals_home = goals_home
                    local_goals_away = goals_away
                else:
                    local_goals_home = goals_away
                    local_goals_away = goals_home
                
                if (not local_match.get("conclusa") or 
                    local_match.get("home_score") != local_goals_home or 
                    local_match.get("away_score") != local_goals_away):
                    
                    local_match["home_score"] = local_goals_home
                    local_match["away_score"] = local_goals_away
                    local_match["conclusa"] = True
                    updated = True
                    print(f"Update Partita {local_match['id']}: {local_match['home']} {local_goals_home} - {local_goals_away} {local_match['away']}")

    # 2. Extract qualified teams dynamically from bracket match schedules
    # Initialize passaggio_turno fields if not present
    if "passaggio_turno" not in local_data:
        local_data["passaggio_turno"] = {}
        
    passaggio = local_data["passaggio_turno"]
    for k in ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"]:
        if k not in passaggio:
            passaggio[k] = []
            
    round_mapping = {
        "Round of 32": "sedicesimi",
        "Round of 16": "ottavi",
        "Quarter-final": "quarti",
        "Semi-final": "semifinali",
        "Final": "finale"
    }
    
    # Track qualifications found in the API data
    qualificazioni_rilevate = {k: set() for k in round_mapping.values()}
    winner_team = None
    
    for match in openfootball_matches:
        round_name = match.get("round")
        fase_key = round_mapping.get(round_name)
        
        if not fase_key:
            continue
            
        team1 = match.get("team1")
        team2 = match.get("team2")
        
        # If team names are real and not placeholder indicators, they qualified
        if team1 and not is_placeholder_team(team1):
            qualificazioni_rilevate[fase_key].add(normalize_team_name(team1))
        if team2 and not is_placeholder_team(team2):
            qualificazioni_rilevate[fase_key].add(normalize_team_name(team2))
            
        # Determine winner if it's the Final match
        if round_name == "Final":
            score = match.get("score")
            if score:
                home_g, away_g = 0, 0
                for score_key in ["pen", "aet", "ft"]:
                    if score_key in score:
                        parts = score[score_key]
                        if isinstance(parts, list) and len(parts) >= 2:
                            home_g, away_g = parts[0], parts[1]
                            break
                if home_g != away_g:
                    raw_winner = team1 if home_g > away_g else team2
                    if raw_winner and not is_placeholder_team(raw_winner):
                        winner_team = normalize_team_name(raw_winner)

    # Apply qualifications to the local database if we found any new ones
    for fase_key, teams_set in qualificazioni_rilevate.items():
        current_list = passaggio.get(fase_key, [])
        # Only overwrite if we found more qualified teams than currently saved, 
        # or if they are different (safeguard against incomplete datasets)
        if len(teams_set) > 0:
            # We want to preserve team list but represent as unique sorted values
            new_list = sorted(list(teams_set))
            if sorted(current_list) != new_list:
                passaggio[fase_key] = new_list
                updated = True
                print(f"Aggiornato Qualificate {fase_key}: {new_list}")
                
    if winner_team:
        # Save to passaggio_turno and premi_finali
        if passaggio.get("vincitore") != winner_team:
            passaggio["vincitore"] = winner_team
            updated = True
            print(f"Aggiornato Vincitore Bracket: {winner_team}")
        if "premi_finali" in local_data:
            if local_data["premi_finali"].get("vincitore") != winner_team:
                local_data["premi_finali"]["vincitore"] = winner_team
                updated = True
                print(f"Aggiornato Vincitore Premi Finali: {winner_team}")

    if updated:
        with open(PARTITE_FILE, "w", encoding="utf-8") as f:
            json.dump(local_data, f, indent=2, ensure_ascii=False)
        print("File partite.json aggiornato con successo.")
    else:
        print("Nessun nuovo aggiornamento necessario dai dati di openfootball.")

def calcola_classifica():
    """
    Loads matches and predictions, calculates scores for each participant
    following the Totomondiale 2026 rules, and generates classifica.json.
    Handles missing keys (like passagem_turno or premi_finali) safely.
    """
    print("Calcolo classifica in corso...")

    # Load matches
    if not os.path.exists(PARTITE_FILE):
        print(f"Errore: {PARTITE_FILE} non trovato.")
        sys.exit(1)
    with open(PARTITE_FILE, "r", encoding="utf-8") as f:
        partite_data = json.load(f)

    # Map matches by ID for quick lookup
    partite_map = {m["id"]: m for m in partite_data.get("partite", [])}
    real_passaggio = partite_data.get("passaggio_turno", {})
    real_premi = partite_data.get("premi_finali", {})

    # Load predictions
    if not os.path.exists(PRONOSTICI_FILE):
        print(f"Errore: {PRONOSTICI_FILE} non trovato.")
        sys.exit(1)
    with open(PRONOSTICI_FILE, "r", encoding="utf-8") as f:
        pronostici_data = json.load(f)

    classifica = []

    # Iterate over each participant
    partecipanti = pronostici_data.get("partecipanti", {})
    for nome, dati in partecipanti.items():
        punti = 0
        risultati_esatti = 0
        prono_esatti = 0
        errori = 0

        # --- 1. Calcolo Punteggio Partite (Fase a gironi ed eliminazione diretta) ---
        user_partite = dati.get("partite", {})
        for match_id_str, pred in user_partite.items():
            try:
                match_id = int(match_id_str)
            except ValueError:
                continue

            match = partite_map.get(match_id)
            if not match or not match.get("conclusa"):
                continue  # Skip matches not played or missing

            # Real and predicted scores
            real_h = match.get("home_score")
            real_a = match.get("away_score")
            pred_h = pred.get("home_score")
            pred_a = pred.get("away_score")

            if real_h is None or real_a is None or pred_h is None or pred_a is None:
                continue

            # Exact score check
            if real_h == pred_h and real_a == pred_a:
                punti += 3
                risultati_esatti += 1
            else:
                # Correct sign check
                real_sign = get_match_sign(real_h, real_a)
                pred_sign = get_match_sign(pred_h, pred_a)
                if real_sign == pred_sign:
                    punti += 1
                    prono_esatti += 1
                else:
                    errori += 1

        # --- 2. Calcolo Punteggio Passaggio Turno ---
        user_passaggio = dati.get("passaggio_turno")
        if user_passaggio and real_passaggio:
            # We check the single phases: sedicesimi, ottavi, quarti, semifinali, finale, vincitore
            # For lists (sedicesimi, ottavi, quarti, semifinali, finale), we add +1 point for each correct team
            for fase in ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"]:
                user_teams = user_passaggio.get(fase, [])
                real_teams = real_passaggio.get(fase, [])
                if user_teams and real_teams:
                    # Clean strings for match robustness
                    user_teams_clean = {t.strip().lower() for t in user_teams if t}
                    real_teams_clean = {t.strip().lower() for t in real_teams if t}
                    # Intersection gives qualified teams predicted correctly
                    correct_picks = user_teams_clean.intersection(real_teams_clean)
                    punti += len(correct_picks)

            # Check predicted bracket winner (vincitore in passaggio_turno)
            user_bracket_winner = user_passaggio.get("vincitore")
            real_bracket_winner = real_passaggio.get("vincitore")
            if user_bracket_winner and real_bracket_winner:
                if user_bracket_winner.strip().lower() == real_bracket_winner.strip().lower():
                    punti += 1

        # --- 3. Calcolo Pronostici Finali (Premi Speciali) ---
        user_premi = dati.get("premi_finali")
        if user_premi and real_premi:
            # Helper to check matching with support for list/strings
            def check_award(key, reward_points):
                val_user = user_premi.get(key)
                val_real = real_premi.get(key)
                if not val_user or not val_real:
                    return 0
                
                # Clean up values
                u_str = val_user.strip().lower()
                
                # Real value could be a list (e.g. tie for top scorer) or a string
                if isinstance(val_real, list):
                    real_list_clean = [t.strip().lower() for t in val_real if t]
                    if u_str in real_list_clean:
                        return reward_points
                elif isinstance(val_real, str):
                    if u_str == val_real.strip().lower():
                        return reward_points
                return 0

            # Vincitrice: +10 punti
            punti += check_award("vincitore", 10)
            # Altra finalista: +5 punti
            punti += check_award("finalista", 5)
            # Capocannoniere: +5 punti
            punti += check_award("capocannoniere", 5)
            # MVP: +5 punti
            punti += check_award("mvp", 5)
            # Miglior Portiere: +5 punti
            punti += check_award("portiere", 5)
            # Miglior Giovane: +5 punti
            punti += check_award("giovane", 5)

        # Append to classification
        classifica.append({
            "nome": nome,
            "punti": punti,
            "risultati_esatti": risultati_esatti,
            "prono_esatti": prono_esatti,
            "errori": errori
        })

    # Sort classification:
    # 1. Punti (descending)
    # 2. Risultati esatti (descending)
    # 3. Prono esatti (descending)
    # 4. Nome (ascending)
    classifica.sort(key=lambda x: (-x["punti"], -x["risultati_esatti"], -x["prono_esatti"], x["nome"]))

    # Write out classification
    with open(CLASSIFICA_FILE, "w", encoding="utf-8") as f:
        json.dump(classifica, f, indent=2, ensure_ascii=False)

    print(f"File {CLASSIFICA_FILE} aggiornato con successo.")
    print("--- CLASSIFICA ---")
    for idx, row in enumerate(classifica, 1):
        print(f"{idx}. {row['nome']} - Punti: {row['punti']} (Esatti: {row['risultati_esatti']}, Segni: {row['prono_esatti']}, Errori: {row['errori']})")

if __name__ == "__main__":
    # Orchestrate match results update (via live API or local fallback simulation)
    aggiorna_risultati_partite()
    # Compute the new leaderboard
    calcola_classifica()
