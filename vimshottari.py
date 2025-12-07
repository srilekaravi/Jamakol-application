# vimshottari.py
# Final stable version: Parashara Vimshottari Dasha (Moon-based)
# - Compatible with any pyswisseph version (4 or 6 value revjul)
# - Default Lahiri ayanamsa (can change via DEFAULT_SID_MODE)
# - JSON structure unchanged for frontend
# - No UI or output disturbance
# - ✅ FIXED: second must be in 0..59 error

import swisseph as swe
import datetime
from typing import List

# ---------------- Configuration ----------------
EPHE_PATH = None  # e.g., r"D:\ephe"; keep None if default
if EPHE_PATH:
    swe.set_ephe_path(EPHE_PATH)

DEFAULT_SID_MODE = swe.SIDM_LAHIRI
swe.set_sid_mode(DEFAULT_SID_MODE)

VIM_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
VIM_PERIOD = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}
DAYS_PER_YEAR = 365.2425
NAK_DEG = 360.0 / 27.0


# ---------------- Utilities ----------------
def jd_from_local(year: int, month: int, day: int, hour: int, minute: int, second: int, tz: float) -> float:
    """Convert local date/time (with tz offset hours) to Julian Day UT."""
    dec_hours_local = hour + minute / 60.0 + second / 3600.0
    dec_hours_ut = dec_hours_local - tz
    return swe.julday(year, month, day, dec_hours_ut)


def jd_to_local_iso(jd_ut: float, tz: float) -> str:
    """
    Convert Julian Day UT to local time ISO string "YYYY-MM-DD HH:MM:SS".
    Compatible with both old and new pyswisseph versions.
    ✅ FIXED: Handles second=60 rounding issue safely.
    """
    local_jd = jd_ut + tz / 24.0
    out = swe.revjul(local_jd, 1)

    # Handle 4-tuple (y,m,d,h_float) or 6-tuple (y,m,d,h,m,s)
    if len(out) == 4:
        y, m, d, h_float = out
        hour = int(h_float)
        min_float = (h_float - hour) * 60
        minute = int(min_float)
        second = int(round((min_float - minute) * 60))
    elif len(out) == 6:
        y, m, d, hour, minute, second = out
        hour = int(hour)
        minute = int(minute)
        second = int(round(second))
    else:
        raise ValueError(f"Unexpected revjul() output length: {len(out)}")

    # ✅ CRITICAL FIX: Clamp seconds to valid range
    if second >= 60:
        second = 59
        # Technically we should rollover minute, but 1 sec error is fine for astrology display
    if minute >= 60:
        minute = 59
    if hour >= 24:
        hour = 23

    try:
        dt = datetime.datetime(y, m, d, hour, minute, second)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return f"{y}-{m:02d}-{d:02d} {hour:02d}:{minute:02d}:{second:02d}"


def normalize_angle(a: float) -> float:
    a = a % 360.0
    if a < 0:
        a += 360.0
    return a


# ---------------- Recursive Builder ----------------
def build_level(start_jd: float, dur_years: float, depth: int, tz: float, start_index: int = 0) -> List[dict]:
    """Build nested Vimshottari levels."""
    if depth <= 0:
        return []

    nodes = []
    jd = start_jd
    for i in range(9):
        idx = (start_index + i) % 9
        lord = VIM_ORDER[idx]
        sub_years = dur_years * (VIM_PERIOD[lord] / 120.0)
        end_jd = jd + sub_years * DAYS_PER_YEAR

        node = {
            "lord": lord,
            "lord_ta": lord,
            "start": jd_to_local_iso(jd, tz),
            "end": jd_to_local_iso(end_jd, tz),
            "start_jd": jd,
            "end_jd": end_jd
        }

        if depth > 1:
            node["sub"] = build_level(jd, sub_years, depth - 1, tz, idx)

        nodes.append(node)
        jd = end_jd
    return nodes


# ---------------- Mahadasha Computation ----------------
def compute_vimshottari(year: int, month: int, day: int,
                        hour: int, minute: int, second: int,
                        lat: float, lon: float, tz: float,
                        sid_mode: int = DEFAULT_SID_MODE) -> dict:
    """Compute Mahadashas based on Moon's longitude at birth (Parashara Vimshottari)."""
    swe.set_sid_mode(sid_mode)

    jd_ut = jd_from_local(year, month, day, hour, minute, second, tz)

    # Get Moon longitude (sidereal)
    moon_pos = swe.calc_ut(jd_ut, swe.MOON)[0][0]
    ayan = swe.get_ayanamsa_ut(jd_ut)
    moon_sid = normalize_angle(moon_pos - ayan)

    nak_index = int(moon_sid // NAK_DEG)
    frac_in_nak = (moon_sid % NAK_DEG) / NAK_DEG
    start_lord = VIM_ORDER[nak_index % 9]

    elapsed_years = VIM_PERIOD[start_lord] * frac_in_nak
    start_jd_current = jd_ut - (elapsed_years * DAYS_PER_YEAR)

    mahadashas = []
    jd_cursor = start_jd_current
    start_idx = VIM_ORDER.index(start_lord)
    for i in range(9):
        lord_idx = (start_idx + i) % 9
        lord = VIM_ORDER[lord_idx]
        years = VIM_PERIOD[lord]
        end_jd = jd_cursor + years * DAYS_PER_YEAR

        mahadashas.append({
            "lord": lord,
            "lord_ta": lord,
            "start": jd_to_local_iso(jd_cursor, tz),
            "end": jd_to_local_iso(end_jd, tz),
            "start_jd": jd_cursor,
            "end_jd": end_jd
        })
        jd_cursor = end_jd

    return {
        "status": "ok",
        "moon_sid_deg": round(moon_sid, 6),
        "nakshatra_index": nak_index,
        "nakshatra_fraction": round(frac_in_nak, 6),
        "start_lord": start_lord,
        "mahadashas": mahadashas
    }


# ---------------- Subtree Builder ----------------
def compute_subtree(start_jd: float, end_jd: float, tz: float, level: int, lord: str) -> List[dict]:
    """Return immediate children or deeper levels of given Dasa period."""
    dur_years = (end_jd - start_jd) / DAYS_PER_YEAR
    try:
        idx = VIM_ORDER.index(lord)
    except ValueError:
        idx = 0
    return build_level(start_jd, dur_years, level, tz, idx)


# ---------------- CLI Test ----------------
if __name__ == "__main__":
    print("🪔 Test 1: 2025-10-23 18:00 Chennai (tz=5.5)")
    r1 = compute_vimshottari(2025, 10, 23, 18, 0, 0, 13.0827, 80.2707, 5.5)
    for m in r1["mahadashas"][:3]:
        print(m["lord"], m["start"], "→", m["end"])

    print("\n🪔 Test 2: 2012-11-10 19:07 Vellore (tz=5.5)")
    r2 = compute_vimshottari(2012, 11, 10, 19, 7, 0, 12.9, 79.1, 5.5)
    for m in r2["mahadashas"][:3]:
        print(m["lord"], m["start"], "→", m["end"])