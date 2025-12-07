# -*- coding: utf-8 -*-
"""
maandhi.py — STRICT VEDIC GULIKA/MAANDHI CALCULATION
----------------------------------------------------
Logic:
1. Find Sunrise and Sunset.
2. Determine Vedic Day (Starts at Sunrise).
3. Use fixed Ghatis based on Weekday and Day/Night.
4. Proportinate the Ghati based on actual Day/Night duration.
5. Calculate Ascendant (Lagna) at that specific Maandhi Time.
"""

from datetime import datetime, timedelta
import swisseph as swe

# Set Ayanamsa (Lahiri)
swe.set_sid_mode(swe.SIDM_LAHIRI)

# --- CONSTANTS ---
RASI = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
        "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"]

NAK = ['அசுவினி', 'பரணி', 'கிருத்திகை', 'ரோஹிணி', 'மிருகசீருஷம்', 'திருவாதிரை',
       'புனர்பூசம்', 'பூசம்', 'ஆயில்யம்', 'மகம்', 'பூரம்', 'உத்திரம்', 'ஹஸ்தம்',
       'சித்திரை', 'சுவாதி', 'விசாகம்', 'அனுராதா', 'ஜேஷ்டா', 'மூலம்', 'பூராடம்',
       'உத்தியாடம்', 'திருவோணம்', 'அவிட்டம்', 'சதயம்', 'பூரட்டாதி', 'உத்திரட்டாதி', 'ரேவதி']

LORD = {"மேஷம்": "செவ்", "ரிஷபம்": "சுக்", "மிதுனம்": "பு", "கடகம்": "சந்",
        "சிம்மம்": "சூரி", "கன்னி": "பு", "துலாம்": "சுக்", "விருச்சிகம்": "செவ்",
        "தனுசு": "கு", "மகரம்": "சனி", "கும்பம்": "சனி", "மீனம்": "சனி"}

# Maandhi Rising Time in Ghatis (out of 30 for Day/Night)
# Key: Weekday (0=Mon, 1=Tue ... 6=Sun) -> Matches Python datetime.weekday()
GHATI_DAY = {
    6: 26, # Sunday
    0: 22, # Monday
    1: 18, # Tuesday
    2: 14, # Wednesday
    3: 10, # Thursday
    4: 6,  # Friday
    5: 2   # Saturday
}

GHATI_NIGHT = {
    6: 10, # Sunday
    0: 6,  # Monday
    1: 2,  # Tuesday
    2: 26, # Wednesday
    3: 22, # Thursday
    4: 18, # Friday
    5: 14  # Saturday
}

# -------------------------------------------------------------
# HELPER FUNCTIONS
# -------------------------------------------------------------

def _to_dms(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    s = int(round(((deg - d) * 60 - m) * 60))
    return f"{d:02d}°{m:02d}′{s:02d}″"

def _get_sun_times(y, m, d, lat, lon, tz):
    """Calculates Sunrise and Sunset JDs."""
    jd_start = swe.julday(y, m, d, 12 - tz) # Start search at noon UTC
    
    # Calculate Sunrise
    res_rise = swe.rise_trans(
        jd_start - 1, swe.SUN, swe.CALC_RISE | swe.BIT_DISC_CENTER, [lon, lat, 0]
    )
    rise_jd = res_rise[1][0]

    # Calculate Sunset
    res_set = swe.rise_trans(
        rise_jd, swe.SUN, swe.CALC_SET | swe.BIT_DISC_CENTER, [lon, lat, 0]
    )
    set_jd = res_set[1][0]
    
    # Calculate Next Sunrise (for night duration)
    res_next_rise = swe.rise_trans(
        set_jd + 0.2, swe.SUN, swe.CALC_RISE | swe.BIT_DISC_CENTER, [lon, lat, 0]
    )
    next_rise_jd = res_next_rise[1][0]

    return rise_jd, set_jd, next_rise_jd

def _calculate_lagna(jd, lat, lon):
    """Calculates Ascendant (Lagna) for a specific JD."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    asc_deg = ascmc[0]
    
    # Convert Tropical to Sidereal
    ayanamsa = swe.get_ayanamsa_ut(jd)
    sidereal_asc = (asc_deg - ayanamsa) % 360
    return sidereal_asc

# -------------------------------------------------------------
# MAIN COMPUTATION
# -------------------------------------------------------------

def compute_maandhi(year, month, day, hour, minute, second, lat, lon, tz):
    try:
        # 1. Input Time as JD
        birth_dt = datetime(year, month, day, hour, minute, second)
        birth_jd = swe.julday(year, month, day, hour + minute/60.0 + second/3600.0 - tz)

        # 2. Get Sun Times
        rise_jd, set_jd, next_rise_jd = _get_sun_times(year, month, day, lat, lon, tz)

        # 3. Determine Vedic Weekday
        # If birth is before sunrise, it belongs to the previous day
        is_daytime = (rise_jd <= birth_jd < set_jd)
        
        # Python weekday: 0=Mon, 6=Sun.
        # We use the date provided. If birth < sunrise, strictly speaking it's prev day
        # But for Ghati lookup, we need the Day Lord of the Sunrise relative to the event.
        
        if birth_jd < rise_jd:
            # Born after midnight but before sunrise -> belongs to previous day
            prev_dt = birth_dt - timedelta(days=1)
            weekday = prev_dt.weekday()
            # Re-calculate sun times for previous day to get correct duration?
            # For simplicity in standard apps, we usually check relation to current sunrise.
            # Let's stick to the sunrise OF THE DAY found in step 2.
            # Actually, if birth < rise_jd calculated for that date, we should shift back.
            
            # RE-CALCULATE for previous day
            prev_y, prev_m, prev_d = prev_dt.year, prev_dt.month, prev_dt.day
            rise_jd, set_jd, next_rise_jd = _get_sun_times(prev_y, prev_m, prev_d, lat, lon, tz)
            weekday = prev_dt.weekday()
            is_daytime = False # It is night of previous day
        else:
            weekday = birth_dt.weekday()

        # 4. Calculate Duration and Maandhi Time
        if is_daytime:
            duration = set_jd - rise_jd
            ghati_val = GHATI_DAY[weekday]
            # Formula: Rise + (Duration * Ghati / 30)
            maandhi_jd = rise_jd + (duration * (ghati_val / 30.0))
        else:
            # Night time
            # Duration is Sunset to Next Sunrise
            duration = next_rise_jd - set_jd
            ghati_val = GHATI_NIGHT[weekday]
            # Formula: Set + (Duration * Ghati / 30)
            maandhi_jd = set_jd + (duration * (ghati_val / 30.0))

        # 5. Calculate Ascendant at Maandhi Time
        maandhi_deg = _calculate_lagna(maandhi_jd, lat, lon)

        # 6. Format Output
        rasi_i = int(maandhi_deg // 30)
        rasi_name = RASI[rasi_i]
        degree_in_sign = maandhi_deg - (rasi_i * 30)
        
        # Nakshatra
        nak_deg = 360 / 27
        nak_total_i = int(maandhi_deg // nak_deg)
        nak_name = NAK[nak_total_i % 27]
        
        # Pada
        rem_deg = maandhi_deg - (nak_total_i * nak_deg)
        pada = int(rem_deg // (nak_deg / 4)) + 1
        
        lord = LORD[rasi_name]
        dms_str = _to_dms(degree_in_sign)

        dbg_info = f"Day:{weekday}, DayTime:{is_daytime}, Ghati:{ghati_val}, Deg:{maandhi_deg:.2f}"

        return [{
            "name": "மாந்தி",
            "short": "மா",
            "rasi": rasi_name,
            "dms": dms_str,
            "nak": nak_name,
            "pada": pada,
            "rasi_lord": lord,
            "maandhi_jd": maandhi_jd,
            "dbg_line": dbg_info # Useful for verifying calculation
        }]

    except Exception as e:
        return [{
            "name": "மாந்தி",
            "short": "மா",
            "rasi": "", "dms": "", "nak": "", "pada": "", "rasi_lord": "",
            "dbg_line": str(e)
        }]

if __name__ == "__main__":
    # Test Case
    res = compute_maandhi(2025, 10, 19, 9, 30, 0, 13.0827, 80.2707, 5.5)
    print(res)