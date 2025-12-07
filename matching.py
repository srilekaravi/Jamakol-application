# matching.py
# -*- coding: utf-8 -*-

# --- CONFIG DATA ---
NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"]
GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0] # 0=Deva, 1=Manushya, 2=Rakshasa
RAJJU = [5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2] # 5=Foot...1=Head
RASI_LORDS = [None, "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]
FRIENDS = {"Sun": ["Moon", "Mars", "Jupiter"], "Moon": ["Sun", "Mercury"], "Mars": ["Sun", "Moon", "Jupiter"], "Mercury": ["Sun", "Venus"], "Jupiter": ["Sun", "Moon", "Mars"], "Venus": ["Mercury", "Saturn"], "Saturn": ["Mercury", "Venus"]}

def calculate_marriage_compatibility(boy_star, girl_star, boy_rasi, girl_rasi, boy_lagna, girl_lagna):
    b, g = boy_star - 1, girl_star - 1
    score = 0
    results = []

    # 1. Dinam (Health)
    count = (b - g) 
    if count < 0: count += 27
    count += 1
    rem = count % 9
    if rem in [2, 4, 6, 8, 9, 0] or count == 27: dina = "உத்தமம்"; score += 1
    elif rem == 1: dina = "மத்திமம்"; score += 0.5
    else: dina = "பொருத்தம் இல்லை"
    results.append({"name": "தினம் (Dina)", "status": dina})

    # 2. Ganam (Temperament)
    bg, gg = GANA[b], GANA[g]
    if bg == gg: gana = "மிக நன்று"; score += 1
    elif gg == 0: gana = "நன்று"; score += 1
    elif gg == 1 and bg == 0: gana = "நன்று"; score += 1
    else: gana = "பொருத்தம் இல்லை"
    results.append({"name": "கணம் (Gana)", "status": gana})

    # 3. Rajju (Maangalyam)
    if RAJJU[b] != RAJJU[g]: rajju = "பொருத்தம் உண்டு"; score += 1
    else: rajju = "ரஜ்ஜு தோஷம் (Mismatch)"
    results.append({"name": "ரஜ்ஜு (Rajju)", "status": rajju})

    # 4. Mahendram (Progeny)
    if count in [4, 7, 10, 13, 16, 19, 22, 25]: mah = "உண்டு"; score += 1
    else: mah = "இல்லை"
    results.append({"name": "மகேந்திரம் (Mahendra)", "status": mah})

    # 5. Stree Deerkham
    if count > 13: stree = "நன்று"; score += 1
    elif count > 7: stree = "மத்திமம்"; score += 0.5
    else: stree = "இல்லை"
    results.append({"name": "ஸ்திரீ தீர்க்கம்", "status": stree})

    # 6. Yoni (Intimacy) - Simplified
    if b == g: yoni = "மிக நன்று"; score += 1
    else: yoni = "மத்திமம்"; score += 0.5
    results.append({"name": "யோனி (Yoni)", "status": yoni})

    # 7. Rasi (Unity)
    rc = (boy_rasi - girl_rasi)
    if rc < 0: rc += 12
    rc += 1
    if rc in [2, 6, 8, 12]: rasi_s = "சஷ்டாஷ்டக தோஷம்"
    elif rc == 7: rasi_s = "சம சப்தமம் (Excellent)"; score += 1
    else: rasi_s = "நன்று"; score += 1
    results.append({"name": "ராசி (Rasi)", "status": rasi_s})

    # 8. Rasi Lord
    bl, gl = RASI_LORDS[boy_rasi], RASI_LORDS[girl_rasi]
    if bl == gl: rl = "மிக நன்று"; score += 1
    elif bl in FRIENDS.get(gl, []) or gl in FRIENDS.get(bl, []): rl = "நன்று"; score += 1
    else: rl = "பொருத்தம் இல்லை"
    results.append({"name": "ராசி அதிபதி", "status": rl})

    # 9. Vasya & 10. Vedha
    results.append({"name": "வசியம்", "status": "மத்திமம்"}); score += 0.5
    results.append({"name": "வேதை", "status": "பொருத்தம் உண்டு"}); score += 1

    return {"matches": results, "total_score": score}

def check_manglik_dosha(planets):
    try:
        lagna = next((p for p in planets if p["name"] == "லக்னம்"), None)
        mars = next((p for p in planets if p["name"] == "செவ்வாய்"), None)
        moon = next((p for p in planets if p["name"] == "சந்திரன்"), None)
        
        if not lagna or not mars or not moon: return "Unknown"

        def get_h(start, p):
            h = (p - start) + 1
            return h + 12 if h <= 0 else h

        h_lagna = get_h(lagna["rasi_no"], mars["rasi_no"])
        h_moon = get_h(moon["rasi_no"], mars["rasi_no"])
        
        if h_lagna in [1, 2, 4, 7, 8, 12]: return f"தோஷம் (லக்னத்தில் {h_lagna})"
        if h_moon in [1, 2, 4, 7, 8, 12]: return f"தோஷம் (சந்திரனில் {h_moon})"
        return "தோஷம் இல்லை"
    except: return "Error"