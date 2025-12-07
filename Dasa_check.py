# test_vim.py
# Quick test harness — runs your compute_vimshottari on 2012-11-10 19:07 IST (Chennai)
from vimshottari import compute_vimshottari, VIM_ORDER
import swisseph as swe

# human-friendly nakshatra names (1-based list)
NAKS = [
 "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
 "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
 "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada",
 "Uttara Bhadrapada","Revati"
]

# Target: 10-Nov-2012 19:07 IST Chennai (13.0827, 80.2707), tz=5.5
Y, M, D = 2012, 11, 10
H, Min, S = 19, 7, 0
LAT, LON, TZ = 13.0827, 80.2707, 5.5

# call your function
out = compute_vimshottari(Y, M, D, H, Min, S, LAT, LON, TZ)

print("=== compute_vimshottari() OUTPUT ===")
for k,v in out.items():
    print(f"{k}: {v}")

# additionally compute raw moon sidereal pos & nakshatra from swe (duplicate check)
jd = swe.julday(Y, M, D, H + Min/60.0 + S/3600.0 - TZ/24.0)
moon = swe.calc_ut(jd, swe.MOON)[0][0] - swe.get_ayanamsa_ut(jd)
moon = moon % 360.0
nak_index = int(moon // (360.0/27.0))   # 0-based
frac = (moon % (360.0/27.0)) / (360.0/27.0)

print("\n=== Low-level check ===")
print(f"moon_sidereal_deg = {moon:.6f}")
print(f"nak_index (0-based) = {nak_index}")
print(f"nak_name = {NAKS[nak_index]} (1-based pos = {nak_index+1})")
print(f"nak_fraction = {frac:.6f}")

# show the lord mapping variants so you can verify the fix
print("\nVIM_ORDER (0..8):", VIM_ORDER)
# compute start_lord using both original and corrected formulas
orig = VIM_ORDER[nak_index % 9]
corrected = VIM_ORDER[(nak_index + 1) % 9]
print("lord (orig nak%9)    =>", orig)
print("lord (corrected +1) =>", corrected)
