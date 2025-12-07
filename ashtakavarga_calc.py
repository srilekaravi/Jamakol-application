# -*- coding: utf-8 -*-
"""
ashtakavarga_calc.py
Strict Bindu Calculation with Robust Error Handling.
"""

import traceback

# --- MAPPINGS ---
TAMIL_PLANET = {
    "சூரியன்": "Sun", "சந்திரன்": "Moon", "செவ்வாய்": "Mars",
    "புதன்": "Mercury", "குரு": "Jupiter", "சுக்கிரன்": "Venus",
    "சனி": "Saturn", "லக்னம்": "Lagna",
    "Lagna": "Lagna", "Sun": "Sun", "Moon": "Moon", "Mars": "Mars",
    "Mercury": "Mercury", "Jupiter": "Jupiter", "Venus": "Venus", "Saturn": "Saturn"
}

# Exhaustive Rasi Map (Tamil, English, Common Variants)
RASI_MAP = {
    "மேஷம்": 1, "Mesham": 1, "Aries": 1, "Mesha": 1,
    "ரிஷபம்": 2, "Rishabam": 2, "Taurus": 2, "Rishaba": 2,
    "மிதுனம்": 3, "Mithunam": 3, "Gemini": 3, "Mithuna": 3,
    "கடகம்": 4, "Kadagam": 4, "Cancer": 4, "Karkata": 4,
    "சிம்மம்": 5, "Simmam": 5, "Leo": 5, "Simha": 5,
    "கன்னி": 6, "Kanni": 6, "Virgo": 6, "Kanya": 6,
    "துலாம்": 7, "Thulaam": 7, "Libra": 7, "Tula": 7,
    "விருச்சிகம்": 8, "Vrischikam": 8, "Scorpio": 8, "Vrischika": 8,
    "தனுசு": 9, "Dhanusu": 9, "Sagittarius": 9, "Dhanus": 9,
    "மகரம்": 10, "Makaram": 10, "Capricorn": 10, "Makara": 10,
    "கும்பம்": 11, "Kumbam": 11, "Aquarius": 11, "Kumbha": 11,
    "மீனம்": 12, "Meenam": 12, "Pisces": 12, "Meena": 12
}

# --- RULES (Parashara) ---
RULES = {
    "Sun": {
        "Sun":[1,2,4,7,8,9,10,11], "Moon":[3,6,10,11], "Mars":[1,2,4,7,8,9,10,11],
        "Mercury":[3,5,6,9,10,11,12], "Jupiter":[5,6,9,11], "Venus":[6,7,12],
        "Saturn":[1,2,4,7,8,9,10,11], "Lagna":[3,4,6,10,11,12]
    },
    "Moon": {
        "Sun":[3,6,7,8,10,11], "Moon":[1,3,6,7,10,11], "Mars":[2,3,5,6,9,10,11],
        "Mercury":[1,3,4,5,7,8,10,11], "Jupiter":[1,4,7,8,10,11,12], "Venus":[3,4,5,7,9,10,11],
        "Saturn":[3,5,6,11], "Lagna":[3,6,10,11]
    },
    "Mars": {
        "Sun":[3,5,6,10,11], "Moon":[3,6,11], "Mars":[1,2,4,7,8,10,11],
        "Mercury":[3,5,6,11], "Jupiter":[6,10,11,12], "Venus":[6,8,11,12],
        "Saturn":[1,4,7,8,9,10,11], "Lagna":[1,3,6,10,11]
    },
    "Mercury": {
        "Sun":[5,6,9,11,12], "Moon":[2,4,6,8,10,11], "Mars":[1,2,4,7,8,9,10,11],
        "Mercury":[1,3,5,6,9,10,11,12], "Jupiter":[6,8,11,12], "Venus":[1,2,3,4,5,8,9,11],
        "Saturn":[1,2,4,7,8,9,10,11], "Lagna":[1,2,4,6,8,10,11]
    },
    "Jupiter": {
        "Sun":[1,2,3,4,7,8,9,10,11], "Moon":[2,5,7,9,11], "Mars":[1,2,4,7,8,10,11],
        "Mercury":[1,2,4,5,6,9,10,11], "Jupiter":[1,2,3,4,7,8,10,11], "Venus":[2,5,6,9,10,11],
        "Saturn":[3,5,6,12], "Lagna":[1,2,4,5,6,7,9,10,11]
    },
    "Venus": {
        "Sun":[8,11,12], "Moon":[1,2,3,4,5,8,9,11,12], "Mars":[3,5,6,9,11,12],
        "Mercury":[3,5,6,9,11], "Jupiter":[5,8,9,10,11], "Venus":[1,2,3,4,5,8,9,10,11],
        "Saturn":[3,4,5,8,9,10,11], "Lagna":[1,2,3,4,5,8,9,11]
    },
    "Saturn": {
        "Sun":[1,2,4,7,8,10,11], "Moon":[3,6,11], "Mars":[3,5,6,10,11,12],
        "Mercury":[6,8,9,10,11,12], "Jupiter":[5,6,11,12], "Venus":[6,11,12],
        "Saturn":[3,5,6,11], "Lagna":[1,3,4,6,10,11]
    },
    "Lagna": {
        "Sun":[3,4,6,10,11,12], "Moon":[3,6,10,11,12], "Mars":[1,3,6,10,11],
        "Mercury":[1,2,4,6,8,10,11], "Jupiter":[1,2,4,5,6,7,9,10,11],
        "Venus":[1,2,3,4,5,8,9], "Saturn":[1,3,4,6,10,11], "Lagna":[3,6,10,11]
    }
}

def get_rasi_num(rasi_val):
    """Safely convert Rasi Name/ID to 1-12 integer."""
    if rasi_val is None: return 0
    if isinstance(rasi_val, int): return rasi_val
    
    s = str(rasi_val).strip()
    if s.isdigit(): return int(s)
    
    # Case-insensitive match
    for k, v in RASI_MAP.items():
        if k.lower() == s.lower(): return v
        
    return 0

def compute_ashtakavarga_dynamic(rows, debug=False):
    try:
        if not rows:
            print("❌ Ashtakavarga Error: No rows received.")
            return {"status": "error", "message": "No planetary data received."}

        # 1. Map Planet Positions
        positions = {}
        lagna_rasi_name = ""

        for r in rows:
            # Try multiple keys for name
            p_name = r.get("name") or r.get("planet") or r.get("graha")
            if not p_name: continue

            # Normalize name
            mapped_name = TAMIL_PLANET.get(p_name, p_name)
            
            # Try multiple keys for rasi
            rasi_raw = r.get("rasi") or r.get("sign") or r.get("sign_name")
            
            # If rasi is missing but we have 'rasi_no', use that
            if not rasi_raw and "rasi_no" in r:
                rasi_raw = r["rasi_no"]

            rasi_num = get_rasi_num(rasi_raw)
            
            # If mapping fails, log it but don't crash
            if rasi_num == 0:
                print(f"⚠️ Warning: Could not map Rasi '{rasi_raw}' for planet '{p_name}'")
                continue

            if mapped_name:
                positions[mapped_name] = rasi_num
                if mapped_name == "Lagna":
                    lagna_rasi_name = str(rasi_raw)

        # Validation
        required = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Lagna"]
        missing = [p for p in required if p not in positions]
        
        if missing:
            print(f"⚠️ Warning: Missing planets for Ashtakavarga: {missing}")

        # 2. Initialize Counters
        bhinna = {p: [0]*12 for p in RULES.keys()}

        # 3. Apply Rules
        for chart_owner, donors in RULES.items():
            for donor, houses in donors.items():
                if donor not in positions: continue
                
                donor_idx = positions[donor] - 1 # 0-11 index
                
                for h in houses:
                    # (DonorPos + House - 1) % 12
                    target_idx = (donor_idx + (h - 1)) % 12
                    bhinna[chart_owner][target_idx] += 1

        # 4. Calculate Sarva
        sarva_ex = [0] * 12
        sarva_in = [0] * 12

        for p_name, points in bhinna.items():
            for i in range(12):
                sarva_in[i] += points[i]
                if p_name != "Lagna":
                    sarva_ex[i] += points[i]

        return {
            "status": "ok",
            "lagna_highlight": lagna_rasi_name,
            "ashtakavarga": {
                "bhinna": bhinna,
                "sarva_points": sarva_ex,
                "sarva_including_lagna": sarva_in
            }
        }

    except Exception as e:
        error_msg = f"Calc Error: {str(e)}"
        print("❌ ASHTAKAVARGA CRASH:")
        traceback.print_exc() # Prints full error to terminal
        return {"status": "error", "message": error_msg}