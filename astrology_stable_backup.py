# -*- coding: utf-8 -*-
# astrology.py — Accurate Lahiri Ayanamsa Sidereal Chart with Nakshatra, Pada & Mandi

import swisseph as swe
from datetime import datetime, timedelta
import math, os

# ----------------------------------------------------------
# 🌍 Configuration
# ----------------------------------------------------------
EPHE_PATH = r"D:\Jamakkol application\ephemeris"   # update this path
DEFAULT_LAT = 13.0827
DEFAULT_LON = 80.2707
DEFAULT_TZ = 5.5
AYANAMSA = "lahiri"
NODE_TYPE = "true"

# ----------------------------------------------------------
# 🧭 Initialize Swiss Ephemeris
# ----------------------------------------------------------
if not os.path.exists(EPHE_PATH):
    raise FileNotFoundError(f"Ephemeris folder not found: {EPHE_PATH}")

swe.set_ephe_path(EPHE_PATH)
AYAN_MAP = {
    "lahiri": getattr(swe, "SIDM_LAHIRI", 1),
    "krishnamurti": getattr(swe, "SIDM_KRISHNAMURTI", 2),
    "raman": getattr(swe, "SIDM_RAMAN", 3),
    "yukteshwar": getattr(swe, "SIDM_YUKTESWAR", 7),
}
swe.set_sid_mode(AYAN_MAP.get(AYANAMSA, 1))

# ----------------------------------------------------------
# 🔧 Utility Functions
# ----------------------------------------------------------
def normalize(deg):
    return deg % 360.0

def dms_str(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    s = int(((deg - d) * 60 - m) * 60)
    return f"{d:02d}:{m:02d}:{s:02d}"

def sign_from_lon(lon):
    rasis = [
        "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்",
        "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்",
        "தனுசு", "மகரம்", "கும்பம்", "மீனம்"
    ]
    sign_no = int(lon // 30)
    return rasis[sign_no], sign_no + 1, lon - (sign_no * 30)

def get_nakshatra_pada(lon):
    nakshatras = [
        "அசுவினி", "பரணி", "கார்த்திகை", "ரோகிணி", "மிருகசீருஷம்", "திருவாதிரை",
        "புனர்பூசம்", "பூசம்", "ஆயில்யம்", "மகம்", "பூரம்", "உத்திரம்",
        "ஹஸ்தம்", "சித்திரை", "சுவாதி", "விசாகம்", "அனுஷம்", "கேட்டை",
        "மூலம்", "பூராடம்", "உத்திராடம்", "திருவோணம்", "அவிட்டம்", "சதயம்",
        "பூரட்டாதி", "உத்திரட்டாதி", "ரேவதி"
    ]
    nak_deg = 13 + 1/3
    pada_deg = nak_deg / 4
    idx = int(lon // nak_deg)
    nak = nakshatras[idx % 27]
    pada = int((lon % nak_deg) // pada_deg) + 1
    return nak, pada

def julian_day(year, month, day, hour, minute, second, tz):
    local = datetime(year, month, day, hour, minute, second)
    utc = local - timedelta(hours=tz)
    jd = swe.julday(utc.year, utc.month, utc.day,
                    utc.hour + utc.minute / 60 + utc.second / 3600)
    return jd, utc

# ----------------------------------------------------------
# 🪐 Planetary Positions
# ----------------------------------------------------------
def calc_planetary_positions(year, month, day, hour, minute, second,
                             tz_offset=DEFAULT_TZ, lat=DEFAULT_LAT, lon=DEFAULT_LON):
    jd_ut, utc = julian_day(year, month, day, hour, minute, second, tz_offset)
    ayan = swe.get_ayanamsa_ut(jd_ut)
    planets = {}
    planet_list = [
        ("சூரியன்", swe.SUN),
        ("சந்திரன்", swe.MOON),
        ("புதன்", swe.MERCURY),
        ("சுக்கிரன்", swe.VENUS),
        ("செவ்வாய்", swe.MARS),
        ("குரு", swe.JUPITER),
        ("சனி", swe.SATURN),
        ("ராகு", swe.TRUE_NODE if NODE_TYPE == "true" else swe.MEAN_NODE)
    ]

    for name, pid in planet_list:
        pos, _ = swe.calc_ut(jd_ut, pid)
        lon_trop = normalize(pos[0])
        lon_sid = normalize(lon_trop - ayan)
        speed = pos[3]
        retro = speed < 0
        sign, sign_no, deg_in_sign = sign_from_lon(lon_sid)
        nak, pada = get_nakshatra_pada(lon_sid)
        planets[name] = {
            "lon": lon_sid,
            "rasi": sign,
            "rasi_no": sign_no,
            "deg_in_sign": deg_in_sign,
            "deg_str": dms_str(deg_in_sign),
            "nak": nak,
            "pada": pada,
            "retro": retro
        }

    # Add Ketu
    ketu_lon = normalize(planets["ராகு"]["lon"] + 180)
    sign, sign_no, deg_in_sign = sign_from_lon(ketu_lon)
    nak, pada = get_nakshatra_pada(ketu_lon)
    planets["கேது"] = {
        "lon": ketu_lon,
        "rasi": sign,
        "rasi_no": sign_no,
        "deg_in_sign": deg_in_sign,
        "deg_str": dms_str(deg_in_sign),
        "nak": nak,
        "pada": pada,
        "retro": planets["ராகு"]["retro"]
    }

    # ✅ Calculate Lagna (Equal House System for India)
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'E')
    asc_trop = normalize(ascmc[0])
    asc_sid = normalize(asc_trop - ayan)
    rasi, rasi_no, deg_in_sign = sign_from_lon(asc_sid)
    nak, pada = get_nakshatra_pada(asc_sid)
    lagna = {
        "lon": asc_sid,
        "rasi": rasi,
        "rasi_no": rasi_no,
        "deg_in_sign": deg_in_sign,
        "deg_str": dms_str(deg_in_sign),
        "nak": nak,
        "pada": pada
    }

    # ✅ Add Mandi (Gulika)
    mandi = calc_mandi(jd_ut, lat, lon, tz_offset)
    planets["மாந்தி"] = mandi

    return planets, lagna, ayan, utc


# ----------------------------------------------------------
# 🌑 Mandi (Gulika) Calculation
# ----------------------------------------------------------
def calc_mandi(jd_ut, lat, lon, tz_offset):
    # Find local sunrise and sunset
    jd = jd_ut
    sunrise, _ = swe.rise_trans(jd, swe.SUN, lon, lat, rsmi=swe.CALC_RISE)
    sunset, _ = swe.rise_trans(jd, swe.SUN, lon, lat, rsmi=swe.CALC_SET)

    day_dur = (sunset[1] - sunrise[1]) * 24  # hours
    mandi_hour = sunrise[1] + (day_dur / 8)  # Gulika after 1/8th day

    # Gulika longitude
    gulika_jd = sunrise[0] + (mandi_hour / 24)
    pos, _ = swe.calc_ut(gulika_jd, swe.MEAN_APOG)
    lon = normalize(pos[0])
    ayan = swe.get_ayanamsa_ut(jd)
    lon_sid = normalize(lon - ayan)
    sign, sign_no, deg_in_sign = sign_from_lon(lon_sid)
    nak, pada = get_nakshatra_pada(lon_sid)
    return {
        "lon": lon_sid,
        "rasi": sign,
        "rasi_no": sign_no,
        "deg_in_sign": deg_in_sign,
        "deg_str": dms_str(deg_in_sign),
        "nak": nak,
        "pada": pada
    }


# ----------------------------------------------------------
# ✅ Test Run
# ----------------------------------------------------------
if __name__ == "__main__":
    planets, lagna, ayan, utc = calc_planetary_positions(2025, 10, 11, 22, 14, 55, tz_offset=5.5)
    print("UTC:", utc, "Ayanamsa:", ayan)
    print(f"லக்னம் {lagna['deg_str']} {lagna['rasi']} {lagna['nak']} {lagna['pada']}")
    for k, v in planets.items():
        print(f"{k}\t{v['deg_str']}\t{v['rasi']}\t{v['nak']}\t{v['pada']}")
