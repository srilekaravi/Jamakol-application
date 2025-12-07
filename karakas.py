# -*- coding: utf-8 -*-
import swisseph as swe

# Standard 7 Karakas Scheme (Parasara)
KARAKA_NAMES = [
    {"code": "AK", "name": "Atmakaraka", "ta": "ஆத்மகாரகன்"},
    {"code": "AmK", "name": "Amatyakaraka", "ta": "அமாத்யமாகாரகன்"},
    {"code": "BK", "name": "Bhatrikaraka", "ta": "ப்ராத்ருகாரகன்"},
    {"code": "MK", "name": "Matrikaraka", "ta": "மாத்ருகாரகன்"},
    {"code": "PK", "name": "Putrakaraka", "ta": "புத்ரகாரகன்"},
    {"code": "GK", "name": "Gnatikaraka", "ta": "ஞாதிகாரகன்"},
    {"code": "DK", "name": "Darakaraka", "ta": "தாரகாரகன்"}
]

TAMIL_SIGNS = [
    "Mesham", "Rishabam", "Mithunam", "Kadagam", "Simmam", "Kanni",
    "Thulaam", "Vrischikam", "Dhanusu", "Makaram", "Kumbam", "Meenam"
]

def get_dms(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    s = int(((deg - d) * 60 - m) * 60)
    return f"{d}° {m}' {s}\""

def calculate_chara_karakas(jd):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    
    # Only 7 Planets for Standard Chara Karakas (Sun to Saturn)
    # Rahu/Ketu are excluded in the 7-Karaka scheme.
    p_map = {
        swe.SUN: "Sun", swe.MOON: "Moon", swe.MARS: "Mars",
        swe.MERCURY: "Mercury", swe.JUPITER: "Jupiter", 
        swe.VENUS: "Venus", swe.SATURN: "Saturn"
    }
    
    planet_list = []
    
    for pid, name in p_map.items():
        res = swe.calc_ut(jd, pid)
        abs_deg = (res[0][0] - ayanamsa) % 360
        
        # Degree within sign (0-30)
        deg_in_sign = abs_deg % 30
        sign_idx = int(abs_deg / 30)
        
        planet_list.append({
            "name": name,
            "deg_val": deg_in_sign,
            "deg_str": get_dms(deg_in_sign),
            "sign": TAMIL_SIGNS[sign_idx]
        })
        
    # Sort Descending by Degree (Highest Degree = AK)
    # If degrees are equal, minutes/seconds decide.
    planet_list.sort(key=lambda x: x["deg_val"], reverse=True)
    
    # Assign Karakas
    results = []
    for i in range(7):
        p = planet_list[i]
        k = KARAKA_NAMES[i]
        
        results.append({
            "karaka_code": k["code"],
            "karaka_name": k["name"],
            "karaka_tamil": k["ta"],
            "planet": p["name"],
            "sign": p["sign"],
            "degree": p["deg_str"]
        })
        
    return results