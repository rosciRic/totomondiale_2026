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

def fetch_risultati_real_api(api_key):
    """
    Fetches real matches status from API-Football.
    League 1 is typically the FIFA World Cup, season 2026.
    """
    import urllib.request
    import urllib.error
    
    print("Connessione all'API-Football in corso...")
    # API-Sports direct host or RapidAPI can be used. This uses the direct API-Sports endpoint.
    url = "https://v3.football.api-sports.io/fixtures?league=1&season=2026"
    
    req = urllib.request.Request(url)
    req.add_header("x-apisports-key", api_key)
    req.add_header("User-Agent", "Mozilla/5.0")
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if "errors" in res_data and res_data["errors"]:
                print(f"Errore API-Sports: {res_data['errors']}")
                return None
            return res_data.get("response", [])
    except urllib.error.URLError as e:
        print(f"Impossibile contattare l'API: {e}")
        return None

def simula_fetch_risultati():
    """Fallback simulation function if no API key is provided."""
    print("[MOCK] Nessuna API Key impostata. Avvio simulazione locale...")
    if not os.path.exists(PARTITE_FILE):
        return None
        
    with open(PARTITE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    updated = False
    for match in data.get("partite", []):
        if match.get("id") == 4 and not match.get("conclusa"):
            match["home_score"] = 2
            match["away_score"] = 0
            match["conclusa"] = True
            updated = True
            print("Aggiornato Risultato Partita 4 (Simulato): Stati Uniti 2 - 0 Paraguay")
        elif match.get("id") == 5 and not match.get("conclusa"):
            match["home_score"] = 1
            match["away_score"] = 2
            match["conclusa"] = True
            updated = True
            print("Aggiornato Risultato Partita 5 (Simulato): Qatar 1 - 2 Svizzera")
            
    return data if updated else None

def aggiorna_risultati_partite():
    """
    Orchestrates the update of matches. Checks for the API key in the environment.
    If found, fetches live scores; otherwise falls back to local mock simulation.
    """
    api_key = os.environ.get("API_FOOTBALL_KEY")
    
    if api_key:
        print(f"Rilevata chiave API_FOOTBALL_KEY. Download dei risultati live...")
        api_fixtures = fetch_risultati_real_api(api_key)
        
        if not api_fixtures:
            print("Download fallito o nessun dato ricevuto. Mantengo i dati correnti.")
            return
            
        if not os.path.exists(PARTITE_FILE):
            print("Errore: file partite.json non trovato.")
            return

        with open(PARTITE_FILE, "r", encoding="utf-8") as f:
            local_data = json.load(f)

        updated = False
        # Match API fixtures with local DB matches
        for fixture in api_fixtures:
            status = fixture.get("fixture", {}).get("status", {}).get("short")
            # If match is finished
            if status in ["FT", "AET", "PEN"]:
                api_home = fixture.get("teams", {}).get("home", {}).get("name")
                api_away = fixture.get("teams", {}).get("away", {}).get("name")
                
                norm_home = normalize_team_name(api_home)
                norm_away = normalize_team_name(api_away)
                
                goals_home = fixture.get("goals", {}).get("home")
                goals_away = fixture.get("goals", {}).get("away")
                
                # Search matching local match
                for local_match in local_data.get("partite", []):
                    if (normalize_team_name(local_match.get("home")) == norm_home and 
                        normalize_team_name(local_match.get("away")) == norm_away):
                        
                        # Update if not already concluded or if scores differ
                        if (not local_match.get("conclusa") or 
                            local_match.get("home_score") != goals_home or 
                            local_match.get("away_score") != goals_away):
                            
                            local_match["home_score"] = goals_home
                            local_match["away_score"] = goals_away
                            local_match["conclusa"] = True
                            updated = True
                            print(f"API Update - Partita {local_match['id']}: {local_match['home']} {goals_home} - {goals_away} {local_match['away']}")
        
        if updated:
            with open(PARTITE_FILE, "w", encoding="utf-8") as f:
                json.dump(local_data, f, indent=2, ensure_ascii=False)
            print("File partite.json aggiornato con i dati dell'API.")
        else:
            print("Nessun nuovo aggiornamento necessario dai dati API.")
            
    else:
        # Fallback to local simulation
        mock_data = simula_fetch_risultati()
        if mock_data:
            with open(PARTITE_FILE, "w", encoding="utf-8") as f:
                json.dump(mock_data, f, indent=2, ensure_ascii=False)
            print("File partite.json aggiornato con i dati simulati.")
        else:
            print("Nessun aggiornamento necessario (nessun nuovo dato simulato).")

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
