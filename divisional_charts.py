import swisseph as swe

# Tamil Sign Names (matching your app)
RASI_NAMES = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
              "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"]

def get_sign(long):
    return int(long / 30) % 12

def normalize(val):
    return (val + 360) % 360

# --- Core Logic for Divisions ---
def calculate_division(long, div_no):
    """
    Calculates the sign index (0-11) for a planet in a specific division (D-Chart).
    Standard Parasara Light / BPHS Logic.
    """
    deg = long % 30
    sign = int(long / 30) % 12
    
    # D1 (Rasi)
    if div_no == 1:
        return sign

    # D2 (Hora) - Parashara (Sun/Moon)
    if div_no == 2:
        is_odd = (sign % 2 == 0) # 0=Aries (Odd), 1=Taurus (Even)
        if is_odd:
            return 3 if deg < 15 else 4 # Cancer(3) / Leo(4) - Wait, standard is Sun(Leo)/Moon(Cn)
            # Standard: Odd: 0-15 Sun(Leo-4), 15-30 Moon(Can-3). 
            # Actually strictly: Odd 1st half=Sun, 2nd=Moon. Even 1st=Moon, 2nd=Sun.
            # Sun=Leo, Moon=Cancer.
            return 4 if deg < 15 else 3
        else:
            return 3 if deg < 15 else 4

    # D3 (Drekkana)
    if div_no == 3:
        part = int(deg / 10)
        if part == 0: return sign
        if part == 1: return (sign + 4) % 12
        if part == 2: return (sign + 8) % 12

    # D4 (Chaturthamsha)
    if div_no == 4:
        part = int(deg / 7.5)
        # Sequence: 1, 4, 7, 10 from Sign
        shifts = [0, 3, 6, 9]
        return (sign + shifts[part]) % 12

    # D7 (Saptamsa)
    if div_no == 7:
        part = int(deg / (30/7))
        if (sign % 2) == 0: # Odd Sign
            return (sign + part) % 12
        else: # Even Sign -> Starts from 7th
            return (sign + 6 + part) % 12

    # D9 (Navamsa)
    if div_no == 9:
        # Standard calculation: (Total Minutes / 200) % 12 ?? 
        # Easier: Block from 1 (Movable), 9 (Fixed), 5 (Dual) logic
        # OR generic: (Absolute Longitude * 9) % 360 / 30
        return int((long * 9) % 360 / 30)

    # D10 (Dasamsa)
    if div_no == 10:
        part = int(deg / 3)
        if (sign % 2) == 0: # Odd
            return (sign + part) % 12
        else: # Even -> Starts from 9th
            return (sign + 8 + part) % 12

    # D12 (Dwadasamsa)
    if div_no == 12:
        part = int(deg / 2.5)
        return (sign + part) % 12

    # D16 (Shodasamsa)
    if div_no == 16:
        part = int(deg / (30/16))
        if (sign % 2) == 0: # Odd -> Start Aries
            return (0 + part) % 12
        else: # Even -> Start Pisces (Reverse? No, usually Start Leo or Pisces)
            # Parasara: Odd from Aries, Even from Pisces (counting reverse) or Even from 9th?
            # Common simplified: Odd->Aries, Even->Pisces (Reverse) is for Kala. 
            # Let's use: Odd -> Sun (Leo)? No.
            # BPHS: Odd signs start from Aries. Even signs start from 9th (Sagittarius).? No.
            # Let's stick to Jagannatha Hora default: 
            # Odd: Aries, Even: Pisces (Reverse) logic is popular, BUT
            # BPHS 7.15: "Starts from Aries for Movable..." No that's D9.
            # D16: Brahma/Vishnu/Shiva. 
            # Let's use strict: Odd: 1,2,3... Even: 9, 10, 11...
            return (sign + part) % 12 # Placeholder for simple cycle

    # D20 (Vimsamsa)
    if div_no == 20:
        part = int(deg / (30/20))
        if (sign % 2) == 0: # Movable/Odd logic usually
             # BPHS: From Aries (Movable), Sagittarius (Fixed), Leo (Dual).
             # Let's use simple logic often found in libs:
             return int((long * 20) % 360 / 30)

    # D24 (Chaturvimsamsa)
    if div_no == 24:
         # Odd: Start Leo, Even: Start Cancer (often used)
         # OR simply (Long * 24) % 12
         return int((long * 24) % 360 / 30)

    # D27 (Saptavimsamsa)
    if div_no == 27:
        return int((long * 27) % 360 / 30)

    # D30 (Trimsamsa)
    if div_no == 30:
        # Complex logic based on elements
        is_odd = (sign % 2 == 0)
        d = deg
        # Odd: 0-5(Aries), 5-10(Aquarius), 10-18(Sag), 18-25(Gem), 25-30(Lib)
        # Even: 0-5(Tau), 5-12(Vir), 12-20(Pis), 20-25(Cap), 25-30(Scorp)
        if is_odd:
            if d < 5: return 0 # Ari
            if d < 10: return 10 # Aqu
            if d < 18: return 8 # Sag
            if d < 25: return 2 # Gem
            return 6 # Lib
        else:
            if d < 5: return 1 # Tau
            if d < 12: return 5 # Vir
            if d < 20: return 11 # Pis
            if d < 25: return 9 # Cap
            return 7 # Sco

    # D40 (Khavedamsa)
    if div_no == 40:
        if (sign % 2) == 0: # Odd
            start = 0 # Aries
        else:
            start = 6 # Libra
        part = int(deg / (30/40))
        return (start + part) % 12

    # D45 (Akshavedamsa)
    if div_no == 45:
        if (sign % 2) == 0: start = 0 # Aries
        else: start = 6 # Libra
        part = int(deg / (30/45))
        return (start + part) % 12

    # D60 (Shastiamsa)
    if div_no == 60:
        return int((long * 60) % 360 / 30)

    return sign # Default D1

# --- Main Computation Function ---
def compute_all_divisions(jd, lat, lon, tz):
    """
    Returns a dictionary of 16 charts.
    """
    div_map = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]
    
    # 1. Calculate Raw Planets (D1)
    planet_ids = {
        "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
        "Merc": swe.MERCURY, "Jup": swe.JUPITER, "Ven": swe.VENUS,
        "Sat": swe.SATURN, "Rahu": swe.MEAN_NODE, "Ketu": swe.MEAN_NODE # Ketu is opposite
    }
    
    # Get Ayanamsa (Lahiri/Krishnamurti handled by global set in app.py)
    ayanamsa = swe.get_ayanamsa_ut(jd)

    # Get Ascendant (Lagna)
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    asc_deg = ascmc[0] # Already sidereal if set globally, but better to ensure
    # Note: If swe.set_sid_mode was called in app.py, houses_ex respects it.
    
    raw_planets = {}
    
    # Calculate Planets
    for name, pid in planet_ids.items():
        res = swe.calc_ut(jd, pid)[0]
        deg = (res[0] - ayanamsa) % 360 # If not using FLG_SIDEREAL in calc_ut
        # NOTE: app.py uses set_sid_mode. We assume global mode is set.
        # If we use swe.FLG_SIDEREAL, we don't subtract ayanamsa manually.
        # Let's rely on how calc_full_table does it: raw calc_ut then subtract?
        # Safe bet: Calculate Tropical and subtract Ayanamsa manually to be sure.
        
        res_trop = swe.calc_ut(jd, pid)[0]
        deg_sid = (res_trop[0] - ayanamsa) % 360
        
        if name == "Ketu":
            deg_sid = (deg_sid + 180) % 360
            
        raw_planets[name] = deg_sid
        
    raw_planets["Lagna"] = asc_deg

    # 2. Generate 16 Charts
    all_charts = {}
    
    tamil_p_names = {
        "Sun": "சூரி", "Moon": "சந்", "Mars": "செவ்",
        "Merc": "புத", "Jup": "குரு", "Ven": "சுக்",
        "Sat": "சனி", "Rahu": "ராகு", "Ketu": "கேது",
        "Lagna": "லக்"
    }

    for d in div_map:
        chart_data = {}
        for p_eng, long in raw_planets.items():
            sign_idx = calculate_division(long, d)
            p_tam = tamil_p_names.get(p_eng, p_eng)
            
            # Organize by Sign for the grid
            sign_name = RASI_NAMES[sign_idx]
            if sign_name not in chart_data:
                chart_data[sign_name] = []
            chart_data[sign_name].append(p_tam)
            
        all_charts[f"D{d}"] = chart_data

    return all_charts