# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import swisseph as swe
from datetime import datetime, timedelta
import math, os
from maandhi import compute_maandhi


# ---------------- CONFIG ----------------
app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EPHE_PATH = os.path.join(BASE_DIR, "ephemeris")

if not os.path.exists(EPHE_PATH):
    raise FileNotFoundError("Ephemeris folder not found: " + EPHE_PATH)

swe.set_ephe_path(EPHE_PATH)
swe.set_ephe_path(EPHE_PATH)
swe.set_sid_mode(swe.SIDM_LAHIRI)

# ---------------- HELPERS ----------------
def to_jd_ut(year, month, day, hour, minute, second, tz):
    local = datetime(year, month, day, hour, minute, second)
    utc = local - timedelta(hours=tz)
    return swe.julday(
        utc.year, utc.month, utc.day,
        utc.hour + utc.minute/60.0 + utc.second/3600.0
    )

def _extract_calc(calc_res):
    """
    Normalize different swisseph return shapes into (lon, lat, dist, speed).
    calc_res may be: tuple(list), list, etc.
    """
    # Some builds return ( [lon, lat, dist, speed], 'errmsg' )
    if isinstance(calc_res, (tuple, list)) and len(calc_res) == 2 and isinstance(calc_res[0], (list, tuple)):
        arr = calc_res[0]
    else:
        arr = calc_res
    # ensure list-like
    arr = list(arr)
    lon = float(arr[0]) if len(arr) > 0 else 0.0
    lat = float(arr[1]) if len(arr) > 1 else 0.0
    dist = float(arr[2]) if len(arr) > 2 else 0.0
    speed = float(arr[3]) if len(arr) > 3 else 0.0
    return lon, lat, dist, speed

def deg_to_dms_in_sign(lon_sid):
    """
    lon_sid: full 0..360 sidereal longitude
    returns (dms_string, sign_index (1..12), sign_name, deg_in_sign float)
    """
    tamil_signs = [
        "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்",
        "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்",
        "தனுசு", "மகரம்", "கும்பம்", "மீனம்"
    ]
    lon_sid = lon_sid % 360.0
    idx = int(lon_sid // 30)            # 0..11
    deg_in_sign = lon_sid - idx*30
    d = int(math.floor(deg_in_sign))
    m = int(math.floor((deg_in_sign - d) * 60))
    s = int(round((((deg_in_sign - d) * 60) - m) * 60))
    dms = f"{d:02d}:{m:02d}:{s:02d}"
    return dms, idx+1, tamil_signs[idx], deg_in_sign

# Nakshatra names & lord mapping helpers
NAK_NAMES = [
    'அசுவினி','பரணி','கிருத்திகை','ரோஹிணி','மிருகசீருஷம்','திருவாதிரை',
    'புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்',
    'ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுராதா','ஜேஷ்டா',
    'மூலம்','பூராடம்','உத்தியாடம்','திருவோணம்','அவிட்டம்','சதயம்',
    'பூரட்டாதி','உத்திரட்டாதி','ரேவதி'
]
# Nakshatra lords sequence (classical): Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury ? 
# But common mapping by nakshatra lord (Vimshottari sequence of planetary lords per nakshatra):
NAK_LORDS = [
    "கேது","சுக்ர","சூரி","சந்திரன்","செவ்","ராகு","குரு","சனி","புத்தன்",
    "கேது","சுக்ர","சூரி","சந்திரன்","செவ்","ராகு","குரு","சனி","புத்தன்",
    "கேது","சுக்ர","சூரி","சந்திரன்","செவ்","ராகு","குரு","சனி","புத்தன்"
]

RASI_LORDS = {
    "மேஷம்":"செவ்","ரிஷபம்":"சுக்","மிதுனம்":"பு","கடகம்":"சந்",
    "சிம்மம்":"சூரி","கன்னி":"பு","துலாம்":"சுக்","விருச்சிகம்":"செவ்",
    "தனுசு":"கு","மகரம்":"சனி","கும்பம்":"சனி","மீனம்":"கு"
}

def nakshatra_pada_from_lon(lon_sid):
    """Return nakshatra_name, pada (1..4), nakshatra_lord"""
    nak_deg = 360.0 / 27.0
    idx = int(lon_sid // nak_deg) % 27
    start = idx * nak_deg
    offset = lon_sid - start
    pada = int(offset // (nak_deg/4.0)) + 1
    return NAK_NAMES[idx], pada, NAK_LORDS[idx]

# ---------------- CORE CALC FUNCTION ----------------
def calc_full_table(year, month, day, hour, minute, second, lat, lon, tz, ayanamsa_code=swe.SIDM_LAHIRI):
    """
    Compute full Tamil planetary table with dynamic ayanamsa selection.
    ayanamsa_code should be one of swe.SIDM_LAHIRI, swe.SIDM_KRISHNAMURTI, etc.
    Default: Lahiri (unchanged behavior).
    """
    jd_ut = to_jd_ut(year, month, day, hour, minute, second, tz)
    
    # ✅ Set dynamic ayanamsa
    swe.set_sid_mode(ayanamsa_code)
    
    ayan = float(swe.get_ayanamsa_ut(jd_ut))
    print(f"[DBG] JD UT: {jd_ut:.9f} | Ayanamsa (deg): {ayan:.9f}")

    tamil_signs = [
        "மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி",
        "துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"
    ]

    planets = [
        ("சூரியன்", swe.SUN),
        ("சந்திரன்", swe.MOON),
        ("செவ்வாய்", swe.MARS),
        ("புதன்", swe.MERCURY),
        ("குரு", swe.JUPITER),
        ("சுக்கிரன்", swe.VENUS),
        ("சனி", swe.SATURN)
    ]

    rows = []

    for name, pid in planets:
        calc_res = swe.calc_ut(jd_ut, pid)
        lon_trop, latp, dist, speed = _extract_calc(calc_res)
        lon_sid = (lon_trop - ayan) % 360.0
        dms, rasi_no, rasi_name, deg_in_sign = deg_to_dms_in_sign(lon_sid)
        nak_name, pada, nak_lord = nakshatra_pada_from_lon(lon_sid)
        rasi_lord = RASI_LORDS.get(rasi_name, "")
        rows.append({
            "name": name,
            "dms": dms,
            "rasi": rasi_name,
            "rasi_no": rasi_no,
            "deg_in_sign": round(deg_in_sign,6),
            "nak": nak_name,
            "pada": pada,
            "nak_lord": nak_lord,
            "rasi_lord": rasi_lord
        })
        print(f"[DBG] {name:8s} {dms} {rasi_name} {nak_name} {pada} {rasi_lord}")

    # Rahu / Ketu
    node_res = swe.calc_ut(jd_ut, swe.MEAN_NODE)
    node_lon_trop, _, _, _ = _extract_calc(node_res)
    rahu_sid = (node_lon_trop - ayan) % 360.0
    ketu_sid = (rahu_sid + 180.0) % 360.0
    for nodename, lon_sid in [("ராகு", rahu_sid), ("கேது", ketu_sid)]:
        dms, rasi_no, rasi_name, deg_in_sign = deg_to_dms_in_sign(lon_sid)
        nak_name, pada, nak_lord = nakshatra_pada_from_lon(lon_sid)
        rasi_lord = RASI_LORDS.get(rasi_name, "")
        rows.append({
            "name": nodename,
            "dms": dms,
            "rasi": rasi_name,
            "rasi_no": rasi_no,
            "deg_in_sign": round(deg_in_sign,6),
            "nak": nak_name,
            "pada": pada,
            "nak_lord": nak_lord,
            "rasi_lord": rasi_lord
        })
        print(f"[DBG] {nodename:6s} {dms} {rasi_name} {nak_name} {pada} {rasi_lord}")

    # Lagna
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'P')
    asc_trop = ascmc[0]
    asc_sid = (asc_trop - ayan) % 360.0
    dms, rasi_no, rasi_name, deg_in_sign = deg_to_dms_in_sign(asc_sid)
    nak_name, pada, nak_lord = nakshatra_pada_from_lon(asc_sid)
    rasi_lord = RASI_LORDS.get(rasi_name, "")
    rows.insert(0, {
        "name": "லக்னம்",
        "dms": dms,
        "rasi": rasi_name,
        "rasi_no": rasi_no,
        "deg_in_sign": round(deg_in_sign,6),
        "nak": nak_name,
        "pada": pada,
        "nak_lord": nak_lord,
        "rasi_lord": rasi_lord
    })
    print(f"[DBG] லக்னம் {dms} {rasi_name} {nak_name} {pada} {rasi_lord}")

           # Māndhi (Gulika) — imported from maandhi.py
    try:
        from maandhi import compute_maandhi
        
        maandhi_rows = compute_maandhi(
        year, month, day, hour, minute, second, lat, lon, tz
        )

        if maandhi_rows:
            rows.extend(maandhi_rows)
            print(maandhi_rows[0].get("dbg_line", "[DBG] மாந்தி calculated."))

    except Exception as e:
        print("⚠️ மாந்தி calculation failed:", e)

        return jsonify({"rows": rows})



    print("[DBG] ✅ Computation complete.")
    return rows


# ---------------- FLASK ROUTES ----------------
@app.route("/generate_chart", methods=["POST"])
def generate_chart():
    data = request.get_json()
    year, month, day = data["year"], data["month"], data["day"]
    hour, minute, second = data["hour"], data["minute"], data.get("second", 0)
    lat, lon, tz = data.get("lat", 13.0827), data.get("lon", 80.2707), data.get("tz", 5.5)

    rows = calc_full_table(year, month, day, hour, minute, second, lat, lon, tz)

    # 1️⃣ Table HTML
    table_html = "<table><tr><th>கிரகம்</th><th>டிகிரி</th><th>ராசி</th><th>நட்சத்திரம்</th><th>பாதம்</th><th>அதிபதி</th></tr>"
    for r in rows:
        table_html += f"<tr><td>{r['name']}</td><td>{r['dms']}</td><td>{r['rasi']}</td><td>{r['nak']}</td><td>{r['pada']}</td><td>{r['rasi_lord']}</td></tr>"
    table_html += "</table>"

    # 2️⃣ Chart HTML
    chart_html = generate_south_indian_chart(rows)

    return jsonify({"status": "ok", "table": table_html, "chart": chart_html})

print("🌙 Moon test:", swe.calc_ut(swe.julday(2025, 10, 22, 8.5 - 5.5/24), swe.MOON))

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)
