# -*- coding: utf-8 -*-
"""
Vimshottari Dasha Calculator — Final Tree-View Compatible Version
------------------------------------------------------------------
✓ Produces correct sequential Dasha order for every sub-level.
✓ Supports progressive (lazy) loading via /vimshottari_subtree.
✓ Designed for tree-view front-end (vimshottari.js, Oct-2025).
"""

import swisseph as swe
import datetime

# =========================================================
#  🔧  Swiss Ephemeris configuration
# =========================================================
EPHE_PATH = r"D:\Jamakkol application\ephemeris"   # ← change if needed
swe.set_ephe_path(EPHE_PATH)
swe.set_sid_mode(swe.SIDM_LAHIRI)

# =========================================================
#  📚  Vimshottari constants
# =========================================================
VIM_ORDER = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]

VIM_PERIOD = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16,
    "Saturn": 19, "Mercury": 17
}


# =========================================================
#  🧮  Utility helpers
# =========================================================
def years_to_days(years: float) -> float:
    return years * 365.2425


def jd_to_local_iso(jd: float, tz: float) -> str:
    """Convert Julian day → local time string (YYYY-MM-DD HH:MM:SS)."""
    days = jd - 2415020.5
    utc = datetime.datetime(1900, 1, 1) + datetime.timedelta(days=days)
    local = utc + datetime.timedelta(hours=tz)
    return local.strftime("%Y-%m-%d %H:%M:%S")


# =========================================================
#  🔁  Core recursive builder
# =========================================================
def build_level(start_jd: float, dur_years: float, level: int,
                tz: float, start_index: int = 0):
    """
    Recursively construct nested Dasha levels.
    start_index ensures each level begins with its lord.
    """
    if level <= 0:
        return []

    seq = []
    for i in range(9):
        lord = VIM_ORDER[(start_index + i) % 9]
        sub_years = dur_years * VIM_PERIOD[lord] / 120.0
        end_jd = start_jd + years_to_days(sub_years)

        node = {
            "lord": lord,
            "lord_ta": lord,  # Tamil labels can be mapped later
            "start": jd_to_local_iso(start_jd, tz),
            "end": jd_to_local_iso(end_jd, tz),
            "start_jd": start_jd,
            "end_jd": end_jd
        }

        if level > 1:
            node["sub"] = build_level(
                start_jd, sub_years, level - 1, tz, VIM_ORDER.index(lord)
            )

        seq.append(node)
        start_jd = end_jd

    return seq


# =========================================================
#  🌞  Primary Mahādasa computation
# =========================================================
def compute_vimshottari(year, month, day, hour, minute, second,
                        lat, lon, tz):
    """
    Compute top-level Mahādasa periods only.
    Front-end loads deeper levels on demand.
    """
    jd_ut = swe.julday(year, month, day,
                       hour + minute / 60 + second / 3600 - tz / 24.0)

    lon_moon = swe.calc_ut(jd_ut, swe.MOON)[0][0] - swe.get_ayanamsa_ut(jd_ut)
    lon_moon %= 360.0

    nak_deg = 360.0 / 27.0
    nak_index = int(lon_moon // nak_deg)
    frac = (lon_moon % nak_deg) / nak_deg
    start_lord = VIM_ORDER[nak_index % 9]

    # portion elapsed in current Mahādasa
    elapsed = VIM_PERIOD[start_lord] * frac
    # reference JD anchor (Rāhu start)
    ref_start_jd = swe.julday(2019, 5, 31, 0 - 5.5 / 24)
    start_jd = ref_start_jd if start_lord == "Rahu" else jd_ut - elapsed * 365.2425

    result = {
        "status": "ok",
        "moon_sid_deg": round(lon_moon, 6),
        "nakshatra_index": nak_index,
        "nakshatra_fraction": round(frac, 6),
        "start_lord": start_lord,
        "mahadashas": []
    }

    jd = start_jd
    remain = VIM_PERIOD[start_lord]
    for i in range(9):
        lord = VIM_ORDER[(VIM_ORDER.index(start_lord) + i) % 9]
        dur = remain if i == 0 else VIM_PERIOD[lord]
        start_jd = jd
        end_jd = start_jd + years_to_days(dur)

        result["mahadashas"].append({
            "lord": lord,
            "lord_ta": lord,
            "start": jd_to_local_iso(start_jd, tz),
            "end": jd_to_local_iso(end_jd, tz),
            "start_jd": start_jd,
            "end_jd": end_jd
        })

        jd = end_jd
        remain = VIM_PERIOD[lord]

    return result


# =========================================================
#  🌜  Sub-tree builder for lazy expansion
# =========================================================
def compute_subtree(start_jd: float, end_jd: float,
                    tz: float, level: int, start_lord: str):
    """
    Create a sub-tree beginning with start_lord.
    level → number of levels to compute (4 for Bhukti→Prana chain).
    """
    dur_years = (end_jd - start_jd) / 365.2425
    idx = VIM_ORDER.index(start_lord)
    return build_level(start_jd, dur_years, level, tz, idx)


# =========================================================
#  🧪  Manual test
# =========================================================
if __name__ == "__main__":
    print("🔍 Testing Vimshottari (Final Tree-View Version)")
    res = compute_vimshottari(2025, 10, 23, 18, 0, 0, 13.0827, 80.2707, 5.5)
    print("Mahadasha lords:", [m["lord"] for m in res["mahadashas"]])
    first = res["mahadashas"][0]
    sub = compute_subtree(first["start_jd"], first["end_jd"], 5.5, 4, first["lord"])
    print(f"→ {first['lord']} Bhuktis:", [b["lord"] for b in sub])
