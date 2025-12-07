# chart_comparison.py
# -*- coding: utf-8 -*-
from app_stable_backup import calc_full_table
from matching import calculate_marriage_compatibility, check_manglik_dosha
import swisseph as swe
import datetime

# --- CONSTANTS ---
TAMIL_MONTHS = ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி", "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"]
TAMIL_YEARS = ["பிரபவ", "விபவ", "சுக்ல", "பிரமோதூத", "பிரஜோத்பத்தி", "ஆங்கீரச", "ஸ்ரீமுக", "பவ", "யுவ", "தாது", "ஈஸ்வர", "வெகுதான்ய", "பிரமாதி", "விக்கிரம", "விஷு", "சித்திரபானு", "சுபானு", "தாரண", "பார்த்திப", "விய", "சர்வஜித்", "சர்வதாரி", "விரோதி", "விக்ருதி", "கர", "நந்தன", "விஜய", "ஜய", "மன்மத", "துன்முகி", "ஹேவிளம்பி", "விளம்பி", "விகாரி", "சார்வரி", "பிலவ", "சுபகிருது", "சோபகிருது", "குரோதி", "விஸ்வாவசு", "பரபாவ", "பிளவங்கா", "கீலக", "சௌமிய", "சாதாரண", "விரோதிகிருது", "பரிதாபி", "பிரமாதீச", "ஆனந்த", "ராட்சச", "நள", "பிங்கள", "காளயுக்தி", "சித்தார்த்தி", "ரௌத்ரி", "துன்மதி", "துந்துபி", "ருத்ரோத்காரி", "ரக்தாட்சி", "குரோதன", "அட்சய"]
NAK_TAMIL = ["அசுவினி", "பரணி", "கார்த்திகை", "ரோகிணி", "மிருகசீரிடம்", "திருவாதிரை", "புனர்பூசம்", "பூசம்", "ஆயில்யம்", "மகம்", "பூரம்", "உத்திரம்", "ஹஸ்தம்", "சித்திரை", "சுவாதி", "விசாகம்", "அனுஷம்", "கேட்டை", "மூலம்", "பூராடம்", "உத்திராடம்", "திருவோணம்", "அவிட்டம்", "சதயம்", "பூரட்டாதி", "உத்திரட்டாதி", "ரேவதி"]
THITHI_TAMIL = ["பிரதமை", "துவிதியை", "திருதியை", "சதுர்த்தி", "பஞ்சமி", "சஷ்டி", "சப்தமி", "அஷ்டமி", "நவமி", "தசமி", "ஏகாதசி", "துவாதசி", " திரயோதசி", "சதுர்த்தசி", "பௌர்ணமி", "அமாவாசை"]
YOGA_TAMIL = ["விஷ்கம்பம்", "ப்ரீதி", "ஆயுஷ்மான்", "சௌபாக்யம்", "சோபனம்", "அதிகண்டம்", "சுகர்மம்", "திருதி", "சூலம்", "கண்டம்", "விருத்தி", "துருவம்", "வியாகாதம்", "ஹர்ஷணம்", "வஜ்ரம்", "சித்தி", "வியதீபாதம்", "வரியான்", "பரிகம்", "சிவம்", "சித்தம்", "சாத்தியம்", "சுபம்", "சுப்பிரம்", "பிராமியம்", "ஐந்திரம்", "வைதிருதி"]
KARANA_TAMIL = ["பவம்", "பாலவம்", "கௌலவம்", "தைதுலம்", "கரசை", "வனசை", "பத்ரை", "சகுனி", "சதுஷ்பாதம்", "நாகவம்", "கிம்ஸ்துக்கினம்"]

DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}
LORD_TAMIL = {"Ketu": "கேது", "Venus": "சுக்", "Sun": "சூரி", "Moon": "சந்", "Mars": "செவ்", "Rahu": "ராகு", "Jupiter": "குரு", "Saturn": "சனி", "Mercury": "புதன்"}

def get_tamil_date_details(y, m, d):
    try:
        base = 1987
        diff = y - base
        if m < 4 or (m == 4 and d < 14): diff -= 1
        t_year = TAMIL_YEARS[diff % 60]
        dt = datetime.date(y, m, d)
        start_date = datetime.date(y if m >= 4 else y-1, 4, 14)
        days = (dt - start_date).days
        m_idx = int(days / 30.44)
        if m_idx < 0: m_idx = 0
        if m_idx >= 12: m_idx = 11
        month_start = start_date + datetime.timedelta(days=int(m_idx * 30.44))
        day_val = (dt - month_start).days + 1
        return f"{t_year} - {TAMIL_MONTHS[m_idx]} - {day_val}"
    except: return f"{y}-{m}-{d}"

def get_rise_set(y, m, d, lat, lon, tz):
    try:
        swe.set_topo(lon, lat, 0)
        # Check from 12 AM UT of that day
        jd_start = swe.julday(y, m, d, 0) - (tz / 24.0)
        
        # Flags for center disc
        flags_rise = swe.CALC_RISE | swe.CALC_BIT_DISC_CENTER
        flags_set = swe.CALC_SET | swe.CALC_BIT_DISC_CENTER
        
        rise = swe.rise_trans(jd_start, swe.SUN, lon, lat, flags_rise, 0, 0)
        aset = swe.rise_trans(jd_start, swe.SUN, lon, lat, flags_set, 0, 0)
        
        def fmt(res):
            if not res: return "-"
            jd = res[1][0] if isinstance(res, tuple) and len(res) > 1 else res[0]
            val = jd + (float(tz) / 24.0) + 0.5
            frac = val % 1.0
            h = int(frac * 24)
            mi = int((frac * 24 - h) * 60)
            s = int((((frac * 24 - h) * 60) - mi) * 60)
            p = "AM" if h < 12 else "PM"
            h_disp = h if h <= 12 else h - 12
            if h_disp == 0: h_disp = 12
            return f"{h_disp:02d}:{mi:02d}:{s:02d} {p}"

        return fmt(rise), fmt(aset)
    except: return "-", "-"

def calculate_dasha_details(moon_lon, dob_date):
    try:
        nak_pos = moon_lon / 13.3333333333
        nak_idx = int(nak_pos); nak_frac = nak_pos - nak_idx
        start_lord = DASHA_LORDS[nak_idx % 9]
        balance_years = DASHA_YEARS[start_lord] * (1.0 - nak_frac)
        
        by = int(balance_years)
        bm = int((balance_years - by) * 12)
        bd = int(((balance_years - by) * 12 - bm) * 30)
        bal_str = f"{LORD_TAMIL[start_lord]} இருப்பு: {by}வ {bm}ம {bd}நா"
        
        birth_dt = datetime.date(dob_date[0], dob_date[1], dob_date[2])
        years_passed = (datetime.date.today() - birth_dt).days / 365.2425
        
        curr_idx = (nak_idx % 9)
        time_rem = balance_years
        
        if years_passed < time_rem:
            maha_lord = start_lord
            spent_in_maha = (DASHA_YEARS[start_lord] - balance_years) + years_passed
        else:
            years_passed -= time_rem
            curr_idx = (curr_idx + 1) % 9
            while True:
                dur = DASHA_YEARS[DASHA_LORDS[curr_idx]]
                if years_passed < dur:
                    maha_lord = DASHA_LORDS[curr_idx]
                    spent_in_maha = years_passed
                    break
                years_passed -= dur
                curr_idx = (curr_idx + 1) % 9
        
        # 2. Bhukti
        b_idx = curr_idx
        spent_rem = spent_in_maha
        while True:
            b_dur = (DASHA_YEARS[maha_lord] * DASHA_YEARS[DASHA_LORDS[b_idx]]) / 120.0
            if spent_rem < b_dur:
                bhukti_lord = DASHA_LORDS[b_idx]
                spent_in_bhukti = spent_rem
                break
            spent_rem -= b_dur
            b_idx = (b_idx + 1) % 9
            
        # 3. Antara
        a_idx = b_idx
        spent_rem = spent_in_bhukti
        b_dur_total = (DASHA_YEARS[maha_lord] * DASHA_YEARS[bhukti_lord]) / 120.0
        while True:
            a_dur = (b_dur_total * DASHA_YEARS[DASHA_LORDS[a_idx]]) / 120.0
            if spent_rem < a_dur:
                antara_lord = DASHA_LORDS[a_idx]
                spent_in_antara = spent_rem
                break
            spent_rem -= a_dur
            a_idx = (a_idx + 1) % 9

        # 4. Pratyantara
        p_idx = a_idx
        spent_rem = spent_in_antara
        a_dur_total = (b_dur_total * DASHA_YEARS[antara_lord]) / 120.0
        while True:
            p_dur = (a_dur_total * DASHA_YEARS[DASHA_LORDS[p_idx]]) / 120.0
            if spent_rem < p_dur:
                prati_lord = DASHA_LORDS[p_idx]
                break
            spent_rem -= p_dur
            p_idx = (p_idx + 1) % 9

        chain = f"{LORD_TAMIL[maha_lord]} / {LORD_TAMIL[bhukti_lord]} / {LORD_TAMIL[antara_lord]} / {LORD_TAMIL[prati_lord]}"
        return bal_str, chain
    except: return "-", "-"

def get_panchangam_details(jd_ut, lat, lon, y, m, d, tz):
    try:
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayanamsa = swe.get_ayanamsa_ut(jd_ut)
        res_sun = swe.calc_ut(jd_ut, swe.SUN); sun_lon = (res_sun[0][0] - ayanamsa) % 360
        res_moon = swe.calc_ut(jd_ut, swe.MOON); moon_lon = (res_moon[0][0] - ayanamsa) % 360
        
        nak_idx = int(moon_lon / 13.3333333333)
        diff = (moon_lon - sun_lon) % 360
        thithi_idx = int(diff / 12)
        t_val = thithi_idx if thithi_idx < 15 else thithi_idx - 15
        paksha = "சுக்ல" if thithi_idx < 15 else "கிருஷ்ண"
        t_name = f"{paksha} {THITHI_TAMIL[t_val % 15]}"
        
        yoga_idx = int(((moon_lon + sun_lon) % 360) / 13.3333333333)
        karana_idx = int(diff / 6)
        
        sunrise, sunset = get_rise_set(y, m, d, lat, lon, tz)
        t_date = get_tamil_date_details(y, m, d)
        bal, chain = calculate_dasha_details(moon_lon, (y,m,d))

        return {
            "nakshatra": NAK_TAMIL[nak_idx % 27], "thithi": t_name,
            "yogam": YOGA_TAMIL[yoga_idx % 27], "karanam": KARANA_TAMIL[karana_idx % 11],
            "ayanamsa": f"{int(ayanamsa)}° {int((ayanamsa%1)*60)}'",
            "tamil_date": t_date, "sunrise": sunrise, "sunset": sunset,
            "dasha_balance": bal, "dasha_chain": chain
        }
    except: return {"nakshatra": "-", "thithi": "-", "yogam": "-", "karanam": "-", "tamil_date": "-", "sunrise": "-", "sunset": "-", "dasha_balance": "-", "dasha_chain": "-"}

def get_dual_chart_data(boy_data, girl_data):
    results, details = {}, {}
    PMAP = {"சூரியன்":0, "சந்திரன்":1, "புதன்":2, "சுக்கிரன்":3, "செவ்வாய்":4, "குரு":5, "சனி":6, "ராகு":10, "கேது":10}

    for label, data in [("boy", boy_data), ("girl", girl_data)]:
        y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
        h, mi = int(data.get("hour", 0)), int(data.get("minute", 0))
        lat, lon, tz = float(data.get("lat", 13.08)), float(data.get("lon", 80.27)), float(data.get("tz", 5.5))

        jd_ut = swe.julday(y, m, d, h + mi/60.0, 1) - tz/24.0
        rows = calc_full_table(y, m, d, h, mi, 0, lat, lon, tz)
        
        for p in rows:
            if p["name"] in PMAP:
                pid = PMAP[p["name"]]
                spd = -1 if pid == 10 else swe.calc_ut(jd_ut, pid)[0][3]
                p["is_retro"] = (spd < 0)
            if ":" in str(p.get("dms","")):
                deg, mn = p["dms"].split(":")[:2]
                p["short_deg"] = f"{deg}°{mn}'"
            else: p["short_deg"] = ""

        panchang = get_panchangam_details(jd_ut, lat, lon, y, m, d, tz)
        
        res_moon = swe.calc_ut(jd_ut, swe.MOON); moon_lon = (res_moon[0][0] - swe.get_ayanamsa_ut(jd_ut)) % 360
        star_idx = int(moon_lon / 13.3333333333) + 1; rasi_idx = int(moon_lon / 30) + 1
        lagna_row = next((r for r in rows if r["name"] == "லக்னம்"), {}); lagna_idx = lagna_row.get("rasi_no", 1)

        results[label] = {
            "planets": rows, "dob": f"{d:02d}-{m:02d}-{y}", "time": f"{h:02d}:{mi:02d}",
            "place": data.get("place_name", "Chennai"),
            "manglik": check_manglik_dosha(rows), "panchangam": panchang
        }
        details[label] = {"star": star_idx, "rasi": rasi_idx, "lagna": lagna_idx}

    report = calculate_marriage_compatibility(
        details["boy"]["star"], details["girl"]["star"],
        details["boy"]["rasi"], details["girl"]["rasi"],
        details["boy"]["lagna"], details["girl"]["lagna"]
    )
    return {"boy": results["boy"], "girl": results["girl"], "match_report": report}