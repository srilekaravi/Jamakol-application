# -*- coding: utf-8 -*-
import swisseph as swe

# Standard Rulership (Parashara)
RULERS = {
    0: swe.MARS, 1: swe.VENUS, 2: swe.MERCURY, 3: swe.MOON,
    4: swe.SUN, 5: swe.MERCURY, 6: swe.VENUS, 7: swe.MARS,
    8: swe.JUPITER, 9: swe.SATURN, 10: swe.SATURN, 11: swe.JUPITER
}

TAMIL_SIGNS = [
    "Mesham", "Rishabam", "Mithunam", "Kadagam", "Simmam", "Kanni",
    "Thulaam", "Vrischikam", "Dhanusu", "Makaram", "Kumbam", "Meenam"
]

def get_sign(lon):
    return int(lon / 30)

def normalize_sign(s):
    return (s + 12) % 12

def get_dms(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    return f"{d}° {m}'"

def calculate_padas(jd, lat, lon, tz):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    
    # 1. Get Ascendant Sign (Lagna)
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    asc_deg = (ascmc[0] - ayanamsa) % 360
    lagna_sign = get_sign(asc_deg)
    
    # 2. Get Planet Positions & Degrees
    planet_data = {}
    p_map = {
        swe.SUN: "Sun", swe.MOON: "Moon", swe.MARS: "Mars",
        swe.MERCURY: "Mercury", swe.JUPITER: "Jupiter", 
        swe.VENUS: "Venus", swe.SATURN: "Saturn"
    }
    
    for pid in p_map:
        res = swe.calc_ut(jd, pid)
        pos = (res[0][0] - ayanamsa) % 360
        planet_data[pid] = {
            "sign": get_sign(pos),
            "deg_in_sign": pos % 30,
            "name": p_map[pid]
        }

    # 3. Calculate 12 Padas
    padas = []
    
    for i in range(12):
        # House of interest relative to Lagna
        house_sign = normalize_sign(lagna_sign + i)
        
        # Find Lord
        lord_id = RULERS[house_sign]
        lord_info = planet_data[lord_id]
        lord_sign = lord_info["sign"]
        lord_deg = lord_info["deg_in_sign"]
        
        # Jaimini Distance Calculation
        # Count from House to Lord
        dist = (lord_sign - house_sign + 12) % 12 + 1
        
        # Count same distance from Lord to get Arudha
        pada_sign = (lord_sign + (dist - 1)) % 12
        
        # Exceptions (Swastheetha)
        if pada_sign == house_sign:
            pada_sign = (pada_sign + 9) % 12 # 10th from position
        elif pada_sign == (house_sign + 6) % 12:
            pada_sign = (pada_sign + 9) % 12 # 10th from position
            
        # Label
        label = f"A{i+1}"
        if i == 0: label = "AL"
        if i == 11: label = "UL"
        
        padas.append({
            "house_num": i + 1,
            "label": label,
            "sign_id": pada_sign,
            "sign_name": TAMIL_SIGNS[pada_sign],
            "lord": lord_info["name"],
            "degree": get_dms(lord_deg), # Arudha Degree = Lord's Degree
            "full_degree": (pada_sign * 30) + lord_deg # Absolute longitude
        })
        
    return padas