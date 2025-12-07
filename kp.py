# -*- coding: utf-8 -*-
import swisseph as swe
from datetime import datetime

# --- CONSTANTS ---
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}
LORD_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

RASI_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", 
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

# Map weekday index (0=Mon) to Planet Name
DAY_LORDS = {
    0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter", 4: "Venus", 5: "Saturn", 6: "Sun"
}

def get_dms(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    return f"{d}° {m}'"

def normalize(val):
    return (val + 360) % 360

def get_kp_lords(lon):
    lon = normalize(lon)
    nak_span = 40.0 / 3.0
    nak_index = int(lon / nak_span)
    star_lord = LORD_ORDER[nak_index % 9]
    
    deg_in_nak = lon - (nak_index * nak_span)
    mins_in_nak = deg_in_nak * 60
    curr_sub_idx = nak_index % 9
    sub_lord = None
    
    for _ in range(9):
        lord = LORD_ORDER[curr_sub_idx % 9]
        years = DASHA_YEARS[lord]
        span = (years / 120.0) * 800.0
        if mins_in_nak < span:
            sub_lord = lord
            break
        mins_in_nak -= span
        curr_sub_idx += 1
        
    return {"star": star_lord, "sub": sub_lord}

def calculate_kp_data(jd, lat, lon, tz):
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    
    tamil_signs = ["Mesham", "Rishabam", "Mithunam", "Kadagam", "Simmam", "Kanni",
                   "Thulaam", "Vrischikam", "Dhanusu", "Makaram", "Kumbam", "Meenam"]
    
    # 1. Planets
    p_map = {
        swe.SUN: "Sun", swe.MOON: "Moon", swe.MARS: "Mars",
        swe.MERCURY: "Mercury", swe.JUPITER: "Jupiter", 
        swe.VENUS: "Venus", swe.SATURN: "Saturn", 
        swe.MEAN_NODE: "Rahu"
    }
    
    planets_data = []
    rahu_res = swe.calc_ut(jd, swe.MEAN_NODE)[0][0]
    rahu_pos = normalize(rahu_res - ayanamsa)
    
    for pid, name in p_map.items():
        if name == "Rahu":
            raw = swe.calc_ut(jd, swe.MEAN_NODE)[0]
        else:
            raw = swe.calc_ut(jd, pid)[0]

        raw_lon = raw[0]
        speed = raw[3]  # Retro info

        pos = normalize(raw_lon - ayanamsa)
        lords = get_kp_lords(pos)

        planets_data.append({
            "name": name,
            "full_deg": pos,
            "rasi": tamil_signs[int(pos/30)],
            "lon": get_dms(pos % 30),
            "star": lords["star"],
            "sub": lords["sub"],
            "speed": speed,
            "retro": speed < 0
        })
        
    # Ketu (Opposite Rahu)
    ketu_pos = normalize(rahu_pos + 180)
    k_lords = get_kp_lords(ketu_pos)
    planets_data.append({
        "name": "Ketu", 
        "full_deg": ketu_pos, 
        "rasi": tamil_signs[int(ketu_pos/30)],
        "lon": get_dms(ketu_pos % 30), 
        "star": k_lords["star"], 
        "sub": k_lords["sub"],
        "speed": -1, 
        "retro": True
    })

    # 2. Cusps
    cusps_tropical, ascmc = swe.houses(jd, lat, lon, b'P')
    asc_deg = normalize(ascmc[0] - ayanamsa)
    
    cusps_data = []
    cusp_degrees = []
    
    for i, c_deg in enumerate(cusps_tropical):
        sid_deg = normalize(c_deg - ayanamsa)
        cusp_degrees.append(sid_deg)
        lords = get_kp_lords(sid_deg)
        cusps_data.append({
            "house": i + 1, 
            "full_deg": sid_deg, 
            "rasi": tamil_signs[int(sid_deg/30)],
            "lon": get_dms(sid_deg % 30), 
            "star": lords["star"], 
            "sub": lords["sub"]
        })

    # 3. Bhava Significators
    bhava_sigs = []
    planet_occupancy = {} 
    
    for p in planets_data:
        p_deg = p["full_deg"]
        found_house = 1
        for i in range(12):
            start = cusp_degrees[i]
            end = cusp_degrees[(i + 1) % 12]
            if start < end:
                if start <= p_deg < end: found_house = i + 1
            else: 
                if p_deg >= start or p_deg < end: found_house = i + 1
        planet_occupancy[p["name"]] = found_house

    planet_ownership = {name: [] for name in p_map.values()}
    planet_ownership["Ketu"] = []
    planet_ownership["Rahu"] = []
    
    for i in range(12):
        cusp_deg = cusp_degrees[i]
        sign_idx = int(cusp_deg / 30)
        lord = RASI_LORDS[sign_idx]
        if lord in planet_ownership:
            planet_ownership[lord].append(i + 1)

    # Build Planet Significators
    for p in planets_data:
        star_lord = p["star"]
        p_name = p["name"]
        sigs = []
        if star_lord in planet_occupancy: sigs.append(planet_occupancy[star_lord])
        if p_name in planet_occupancy: sigs.append(planet_occupancy[p_name])
        if star_lord in planet_ownership: sigs.extend(planet_ownership[star_lord])
        if p_name in planet_ownership: sigs.extend(planet_ownership[p_name])
        p["signifies"] = sorted(list(set(sigs)))

    # Build Bhava Significators
    for i in range(12):
        h_num = i + 1
        start = cusp_degrees[i]
        lord = RASI_LORDS[int(start / 30)]
        occupants = [p["name"] for p in planets_data if planet_occupancy[p["name"]] == h_num]
        in_star_of_lord = [p["name"] for p in planets_data if p["star"] == lord]
        in_star_of_occupant = []
        if occupants:
            in_star_of_occupant = [p["name"] for p in planets_data if p["star"] in occupants]
            
        bhava_sigs.append({
            "house": h_num, "L1": in_star_of_occupant, "L2": occupants,
            "L3": in_star_of_lord, "L4": [lord]
        })

    # 4. RULING PLANETS (Safe Datetime Fix)
    utc_tuple = swe.revjul(jd)
    y = int(utc_tuple[0])
    m = int(utc_tuple[1])
    d = int(utc_tuple[2])
    
    # Safe Time Extraction
    h_decimal = utc_tuple[3]
    h = int(h_decimal)
    min_decimal = (h_decimal - h) * 60
    minute = int(min_decimal)
    sec_decimal = (min_decimal - minute) * 60
    second = int(sec_decimal)
    
    # ✅ FORCE valid range
    if second >= 60: second = 59
    if minute >= 60: minute = 59
    if h >= 24: h = 23

    try:
        dt = datetime(y, m, d, h, minute, second)
        weekday = dt.weekday() # 0=Mon
    except ValueError:
        weekday = 0 
        
    day_lord = DAY_LORDS[weekday]

    lagna_lords = get_kp_lords(asc_deg)
    lagna_sign_lord = RASI_LORDS[int(asc_deg/30)]
    
    moon_data = next(p for p in planets_data if p["name"] == "Moon")
    moon_sign_lord = RASI_LORDS[int(moon_data["full_deg"]/30)]
    
    ruling_planets = {
        "Lagna_Sign": lagna_sign_lord,
        "Lagna_Star": lagna_lords["star"],
        "Lagna_Sub": lagna_lords["sub"],
        "Moon_Sign": moon_sign_lord,
        "Moon_Star": moon_data["star"],
        "Moon_Sub": moon_data["sub"],
        "Day_Lord": day_lord
    }

    return {
        "planets": planets_data,
        "cusps": cusps_data,
        "significators": bhava_sigs,
        "ruling_planets": ruling_planets
    }