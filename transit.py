# -*- coding: utf-8 -*-
"""
maandhi_test_fixed.py
Standalone — precisely find previous local sunrise, same-day sunset, and Gulika.
Usage: python maandhi_test_fixed.py
Set swe.set_ephe_path(...) if your ephemeris folder is custom.
"""
import math
import swisseph as swe
from datetime import datetime, timedelta

# ---- CONFIG (edit only if your ephemeris path differs) ----
# swe.set_ephe_path(r"D:/Jamakkol application/ephemeris")
swe.set_sid_mode(swe.SIDM_LAHIRI)

# INPUT
YEAR, MONTH, DAY = 1985, 10, 31
HOUR, MINUTE, SECOND = 3, 33, 0          # local time (IST)
LAT, LON, TZ = 12.9165, 79.1325, 5.5     # Vellore

# ---- HELPERS ----
def normalize(x): return float(x) % 360.0

def local_to_jd(y,m,d,h,mi,s,tz):
    from datetime import datetime, timedelta
    loc = datetime(y,m,d,h,mi,s)
    utc = loc - timedelta(hours=tz)
    return swe.julday(utc.year, utc.month, utc.day,
                      utc.hour + utc.minute/60.0 + utc.second/3600.0)

def jd_to_local_hms_str(jd_ut, tz):
    if jd_ut is None: return "--:--:--"
    jd_local = jd_ut + tz/24.0
    frac = jd_local % 1.0
    hours = frac * 24.0
    h = int(hours); m = int((hours - h) * 60.0); s = int(round(((hours - h) * 60.0 - m) * 60.0))
    if s == 60: s = 0; m += 1
    if m == 60: m = 0; h += 1
    h = h % 24
    return f"{h:02d}:{m:02d}:{s:02d}"

def jd_to_local_datetime(jd_ut, tz):
    # returns (year,month,day,h,m,s) local
    jd = float(jd_ut) + tz/24.0
    F, I = math.modf(jd + 0.5)
    I = int(I)
    if I > 2299160:
        A = int((I - 1867216.25)/36524.25)
        B = I + 1 + A - int(A/4)
    else:
        B = I
    C = B + 1524
    D = int((C - 122.1)/365.25)
    E = int(365.25 * D)
    G = int((C - E)/30.6001)
    day = C - E + F - int(30.6001 * G)
    if G < 13.5:
        month = G - 1
    else:
        month = G - 13
    if month > 2.5:
        year = D - 4716
    else:
        year = D - 4715
    day_int = int(math.floor(day))
    frac = day - day_int
    hours = frac * 24.0
    h = int(hours)
    minutes = (hours - h) * 60.0
    m = int(minutes)
    s = int(round((minutes - m) * 60.0))
    return datetime(year, month, day_int, h, m, s)

# ---- MAIN ----
jd_event_ut = local_to_jd(YEAR, MONTH, DAY, HOUR, MINUTE, SECOND, TZ)
jd_event_local = jd_event_ut + TZ/24.0

print("JD UT:", jd_event_ut)

flags = swe.BIT_DISC_CENTER | getattr(swe, "BIT_NO_REFRACTION", 0)
geopos = [float(LON), float(LAT), 0.0]

# Collect candidate sunrises & sunsets from a ±3 day window around event
sunrise_candidates = []
sunset_candidates = []

# try multiple base jd seeds (midnight offsets) to get all candidates
for day_offset in range(-3, 4):
    seed = jd_event_ut + day_offset
    try:
        r = swe.rise_trans(seed, swe.SUN, rsmi=swe.CALC_RISE | flags, geopos=geopos)
        if r and r[1]:
            for v in r[1]:
                try:
                    vv = float(v)
                    # only sensible positive values
                    if vv > 0:
                        sunrise_candidates.append(vv)
                except Exception:
                    pass
    except Exception:
        pass

    try:
        s = swe.rise_trans(seed, swe.SUN, rsmi=swe.CALC_SET | flags, geopos=geopos)
        if s and s[1]:
            for v in s[1]:
                try:
                    vv = float(v)
                    if vv > 0:
                        sunset_candidates.append(vv)
                except Exception:
                    pass
    except Exception:
        pass

# Convert to unique sorted lists
sunrise_candidates = sorted(set(sunrise_candidates))
sunset_candidates = sorted(set(sunset_candidates))

# Convert candidates to local JD for comparison
sunrise_local = [(v, v + TZ/24.0) for v in sunrise_candidates]
sunset_local  = [(v, v + TZ/24.0) for v in sunset_candidates]

# Find previous sunrise: latest sunrise_local < jd_event_local - tiny_epsilon
eps = 1e-9
prev_sunrise = None
for v, vl in sunrise_local:
    if vl < jd_event_local - eps:
        prev_sunrise = v
# If not found, also accept sunrise equal to event day earlier by <=12h
if prev_sunrise is None and sunrise_local:
    # pick max local < event_local + 1 day
    candidates = [v for v,vl in sunrise_local if vl <= jd_event_local + 1.0]
    if candidates:
        prev_sunrise = max(candidates)

if prev_sunrise is None:
    print("Could not determine previous sunrise. Candidates found:", len(sunrise_local))
    raise SystemExit(1)

# Now find same-day sunset: minimal sunset_local > prev_sunrise_local - eps
prev_sunrise_local = prev_sunrise + TZ/24.0
same_day_sunset = None
for v, vl in sunset_local:
    if vl > prev_sunrise_local - eps:
        # choose earliest such
        same_day_sunset = v
        break

# fallback: find any sunset after prev_sunrise
if same_day_sunset is None:
    later = [v for v,vl in sunset_local if vl > prev_sunrise_local - eps]
    if later:
        same_day_sunset = min(later)

if same_day_sunset is None:
    print("Could not determine same-day sunset. Sunset candidates:", len(sunset_local))
    raise SystemExit(1)

print("☀️  previous sunrise (local):", jd_to_local_hms_str(prev_sunrise, TZ))
print("🌇  same-day sunset   (local):", jd_to_local_hms_str(same_day_sunset, TZ))

# Determine if event is in day frame
is_day = (prev_sunrise <= jd_event_ut < same_day_sunset)
weekday = int(math.floor(prev_sunrise + 1.5)) % 7  # weekday of sunrise-day (0=Sun..6=Sat)

day_parts   = [0.125,0.875,0.75,0.625,0.5,0.375,0.25]
night_parts = [0.5,0.375,0.25,0.125,0.875,0.75,0.625]

if is_day:
    part = day_parts[weekday]
    gulika_jd = prev_sunrise + part * (same_day_sunset - prev_sunrise)
else:
    # need next sunrise after same_day_sunset
    next_sunrise = None
    # search sunrise candidates greater than same_day_sunset
    following = [v for v, vl in sunrise_local if vl > same_day_sunset + TZ/24.0 - eps]
    if following:
        next_sunrise = min(following)
    else:
        # compute a direct rise_trans starting from sunset+0.5
        try:
            rr = swe.rise_trans(same_day_sunset + 0.5, swe.SUN, rsmi=swe.CALC_RISE|flags, geopos=geopos)
            if rr and rr[1]:
                next_sunrise = float(rr[1][0])
        except Exception:
            next_sunrise = None

    if not next_sunrise:
        print("Could not determine next sunrise after sunset.")
        raise SystemExit(1)
    part = night_parts[weekday]
    gulika_jd = same_day_sunset + part * (next_sunrise - same_day_sunset)

print("🪔  Gulika time (local):", jd_to_local_hms_str(gulika_jd, TZ))

# Ascendant (Placidus) at gulika time → sidereal using Lahiri
cusps, ascmc = swe.houses_ex(gulika_jd, LAT, LON, b'P')
asc_trop = ascmc[0]
ayan = swe.get_ayanamsa_ut(gulika_jd)
asc_sid = normalize(asc_trop - ayan)

# DMS & rasi
rasi_names = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி",
              "துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"]
rasi_idx = int(asc_sid // 30) % 12
rasi_name = rasi_names[rasi_idx]
deg_in_sign = asc_sid - rasi_idx * 30.0
d = int(math.floor(deg_in_sign))
m = int(math.floor((deg_in_sign - d) * 60.0))
s = int(round((((deg_in_sign - d) * 60.0) - m) * 60.0))
if s == 60: s = 0; m += 1
if m == 60: m = 0; d += 1
dms = f"{d:02d}:{m:02d}:{s:02d}"

# Nakshatra & pada
nak_deg = 360.0 / 27.0
nak_idx = int(math.floor(asc_sid / nak_deg)) % 27
offset = asc_sid - nak_idx * nak_deg
pada_size = nak_deg / 4.0
pada = int(math.floor(offset / pada_size)) + 1
if pada < 1: pada = 1
if pada > 4: pada = 4
NAK = [
 'அசுவினி','பரணி','கிருத்திகை','ரோஹிணி','மிருகசீருஷம்','திருவாதிரை',
 'புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்',
 'ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுராதா','ஜேஷ்டா',
 'மூலம்','பூராடம்','உத்தியாடம்','திருவோணம்','அவிட்டம்','சதயம்',
 'பூரட்டாதி','உத்திரட்டாதி','ரேவதி'
]
nak_name = NAK[nak_idx]

print(f"[RESULT] மாந்தி → {rasi_name} {dms} {nak_name} (பாதம் {pada})")
