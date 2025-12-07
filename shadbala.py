import swisseph as swe

# --- CONSTANTS ---
NAISARGIKA_VALUES = {
    swe.SUN: 60.0, swe.MOON: 51.43, swe.MARS: 17.14,
    swe.MERCURY: 25.71, swe.JUPITER: 34.28, swe.VENUS: 42.85, swe.SATURN: 8.57
}

def normalize(val):
    return (val + 360) % 360

def get_uchcha_bala(planet, lon):
    exalt_points = {
        swe.SUN: 10, swe.MOON: 33, swe.MARS: 298, swe.MERCURY: 165,
        swe.JUPITER: 95, swe.VENUS: 357, swe.SATURN: 200
    }
    debil = (exalt_points.get(planet, 0) + 180) % 360
    diff = abs(lon - debil)
    if diff > 180: diff = 360 - diff
    return (diff / 180.0) * 60.0

def get_dig_bala(planet, lon, asc_lon):
    targets = {
        swe.SUN: (asc_lon + 270) % 360, swe.MARS: (asc_lon + 270) % 360,
        swe.MOON: (asc_lon + 90) % 360, swe.VENUS: (asc_lon + 90) % 360,
        swe.MERCURY: asc_lon, swe.JUPITER: asc_lon,
        swe.SATURN: (asc_lon + 180) % 360
    }
    target = targets.get(planet, 0)
    diff = abs(lon - target)
    if diff > 180: diff = 360 - diff
    return ((180 - diff) / 180.0) * 60.0

def get_drik_bala(planet, lon, all_planets_pos):
    """
    Calculates aspect strength (Drishti).
    Benefic aspects ADD strength. Malefic aspects SUBTRACT strength.
    """
    total_aspect = 0.0
    
    # Define Benefics (Simplified) / Malefics
    benefics = [swe.JUPITER, swe.VENUS, swe.MERCURY, swe.MOON]
    malefics = [swe.SUN, swe.MARS, swe.SATURN]

    for other_p, other_lon in all_planets_pos.items():
        if other_p == planet: continue
        
        # Angle from Aspecting Planet (Other) TO Target (Planet)
        # If Sun(0) aspects Mars(180), Angle = 180 - 0 = 180.
        angle = normalize(lon - other_lon)
        
        val = 0.0
        
        # Special Aspects (Full = 60)
        if other_p == swe.MARS and (90 <= angle <= 100 or 210 <= angle <= 220): # 4th & 8th
            val = 60
        elif other_p == swe.JUPITER and (120 <= angle <= 130 or 240 <= angle <= 250): # 5th & 9th
            val = 60
        elif other_p == swe.SATURN and (60 <= angle <= 70 or 270 <= angle <= 280): # 3rd & 10th
            val = 60
        # General 7th Aspect (All planets)
        elif 170 <= angle <= 190:
            val = 60
        # Partial Aspects (Simplified Parasara ranges)
        elif 30 <= angle <= 60: val = 15
        elif 60 < angle <= 90: val = 30
        elif 90 < angle <= 120: val = 45
        elif 120 < angle <= 150: val = 30
        
        # Apply value
        if other_p in benefics:
            total_aspect += val
        elif other_p in malefics:
            total_aspect -= val # Malefic aspect reduces strength
            
    # Divide by 4 as per Shadbala rules and add baseline to avoid negatives in UI
    return (total_aspect / 4.0) + 20.0

def calculate_shadbala(jd, lat, lon, tz):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    asc = ascmc[0]
    
    # Day/Night check
    sun_res = swe.calc_ut(jd, swe.SUN)[0][0]
    sun_sid = (sun_res - ayanamsa) % 360
    dist = (sun_sid - asc + 360) % 360
    is_day = (180 <= dist < 360)

    planets = [swe.SUN, swe.MOON, swe.MARS, swe.MERCURY, swe.JUPITER, swe.VENUS, swe.SATURN]
    names = {0:"Sun", 1:"Moon", 4:"Mars", 2:"Merc", 5:"Jup", 3:"Ven", 6:"Sat"}
    
    # 1. Pre-calculate positions for Aspect (Drik) logic
    pos_cache = {}
    speed_cache = {}
    for p in planets:
        res = swe.calc_ut(jd, p)
        pos_cache[p] = normalize(res[0][0] - ayanamsa)
        speed_cache[p] = res[0][3]

    results = []
    
    for p in planets:
        curr_lon = pos_cache[p]
        speed = speed_cache[p]
        
        # 1. Sthana (Positional)
        sthana = get_uchcha_bala(p, curr_lon) + 30.0 
        
        # 2. Dig (Directional)
        dig = get_dig_bala(p, curr_lon, asc)
        
        # 3. Kala (Time)
        kala = 20.0
        if p == swe.MERCURY: kala += 60
        elif is_day and p in [swe.SUN, swe.JUPITER, swe.VENUS]: kala += 60
        elif not is_day and p in [swe.MOON, swe.MARS, swe.SATURN]: kala += 60
        
        # 4. Chesta (Motion)
        chesta = 15.0
        if p not in [swe.SUN, swe.MOON]:
            if speed < 0: chesta = 60.0 # Retrograde
            elif speed < 0.5: chesta = 30.0 # Slow
        else:
            chesta = 30.0 
            
        # 5. Naisargika (Natural)
        nais = NAISARGIKA_VALUES.get(p, 15.0)
        
        # 6. Drik (Aspect) - NOW CALCULATED
        drik = get_drik_bala(p, curr_lon, pos_cache)
        
        total = sthana + dig + kala + chesta + nais + drik
        rupa = total / 60.0
        
        req = {0:6.5, 1:6.0, 4:5.0, 2:7.0, 5:6.5, 3:5.5, 6:5.0}[p]
        
        results.append({
            "planet": names[p],
            "sthana": round(sthana, 1),
            "dig": round(dig, 1),
            "kala": round(kala, 1),
            "chesta": round(chesta, 1),
            "naisargika": round(nais, 1),
            "drik": round(drik, 1),
            "total": round(total, 1),
            "rupa": round(rupa, 2),
            "ratio": round(rupa/req, 2)
        })
        
    return results