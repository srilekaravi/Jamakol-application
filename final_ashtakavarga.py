# ============================================================
#  TAMIL → ENGLISH
# ============================================================

TAMIL_PLANET = {
    "சூரியன்": "Sun",
    "சந்திரன்": "Moon",
    "செவ்வாய்": "Mars",
    "புதன்": "Mercury",
    "குரு": "Jupiter",
    "சுக்கிரன்": "Venus",
    "சனி": "Saturn",
    "லக்னம்": "Lagna",
}

# ============================================================
#  RASI → NUMBER
# ============================================================

TAMIL_RASI = {
    "மேஷம்": 1, "ரிஷபம்": 2, "மிதுனம்": 3, "கடகம்": 4,
    "சிம்மம்": 5, "கன்னி": 6, "துலாம்": 7, "விருச்சிகம்": 8,
    "தனுசு": 9, "மகரம்": 10, "கும்பம்": 11, "மீனம்": 12
}

def rasi_to_num(v):
    v = str(v).strip()
    if v.isdigit():
        return int(v)
    return TAMIL_RASI[v]

# ============================================================
#  YOUR EXACT EXCEL RULES (OFFSET RULES)
# ============================================================

RULES = {

    "Sun": {
        "Sun":[1,2,4,7,8,9,10,11],
        "Moon":[3,6,10,11],
        "Mars":[1,2,4,7,8,9,10,11],
        "Mercury":[3,5,6,9,10,11,12],
        "Jupiter":[5,6,9,11],
        "Venus":[6,7,12],
        "Saturn":[1,2,4,7,8,9,10,11],
        "Lagna":[3,4,6,10,11,12]
    },

    "Moon": {
        "Sun":[3,6,7,8,10,11],
        "Moon":[1,3,6,7,10,11],
        "Mars":[2,3,5,6,9,10,11],
        "Mercury":[1,3,4,5,7,8,10,11],
        "Jupiter":[1,4,7,8,10,11,12],
        "Venus":[3,4,5,7,9,10,11],
        "Saturn":[3,5,6,11],
        "Lagna":[3,6,10,11]
    },

    "Mars": {
        "Sun":[3,5,6,10,11],
        "Moon":[3,6,11],
        "Mars":[1,2,4,7,8,10,11],
        "Mercury":[3,5,6,11],
        "Jupiter":[6,10,11,12],
        "Venus":[6,8,11,12],
        "Saturn":[1,4,7,8,9,10,11],
        "Lagna":[1,3,6,10,11]
    },

    "Mercury": {
        "Sun":[5,6,9,11,12],
        "Moon":[2,4,6,8,10,11],
        "Mars":[1,2,4,7,8,9,10,11],
        "Mercury":[1,3,5,6,9,10,11,12],
        "Jupiter":[6,8,11,12],
        "Venus":[1,2,3,4,5,8,9,11],
        "Saturn":[1,2,4,7,8,9,10,11],
        "Lagna":[1,2,4,6,8,10,11]
    },

    "Jupiter": {
        "Sun":[1,2,3,4,7,8,9,10,11],
        "Moon":[2,5,7,9,11],
        "Mars":[1,2,4,7,8,10,11],
        "Mercury":[1,2,4,5,6,9,10,11],
        "Jupiter":[1,2,3,4,7,8,10,11],
        "Venus":[2,5,6,9,10,11],
        "Saturn":[3,5,6,12],
        "Lagna":[1,2,4,5,6,7,9,10,11]
    },

    "Venus": {
        "Sun":[8,11,12],
        "Moon":[1,2,3,4,5,8,9,11,12],
        "Mars":[3,5,6,9,11,12],
        "Mercury":[3,5,6,9,11],
        "Jupiter":[5,8,9,10,11],
        "Venus":[1,2,3,4,5,8,9,10,11],
        "Saturn":[3,4,5,8,9,10,11],
        "Lagna":[1,2,3,4,5,8,9,11]
    },

    "Saturn": {
        "Sun":[1,2,4,7,8,10,11],
        "Moon":[3,6,11],
        "Mars":[3,5,6,10,11,12],
        "Mercury":[6,8,9,10,11,12],
        "Jupiter":[5,6,11,12],
        "Venus":[6,11,12],
        "Saturn":[3,5,6,11],
        "Lagna":[1,3,4,6,10,11]
    },

    "Lagna": {
        "Sun":[3,4,6,10,11,12],
        "Moon":[3,6,10,11,12],
        "Mars":[1,3,6,10,11],
        "Mercury":[1,2,4,6,8,10,11],
        "Jupiter":[1,2,4,5,6,7,9,10,11],
        "Venus":[1,2,3,4,5,8,9],
        "Saturn":[1,3,4,6,10,11],
        "Lagna":[3,6,10,11]
    }
}

# ============================================================
#     ⭐ FINAL CORRECT ENGINE (OFFSET SYSTEM)
# ============================================================

def compute_ashtakavarga_from_rows(rows, debug=False):

    # 1) Planet → rasi number
    pos = {}
    for r in rows:
        name = TAMIL_PLANET.get(r["name"], r["name"])
        rr = r.get("rasi_no") or r.get("rasi")
        pos[name] = rasi_to_num(rr)

    # 2) Bhinna setup
    bhinna = {o:[0]*12 for o in RULES}

    # 3) OFFSET CALCULATION (CORRECT)
    for owner, contribs in RULES.items():
        for contrib, houses in contribs.items():
            base = pos[contrib] - 1     # rasi index 0–11
            for h in houses:
                target = (base + (h-1)) % 12
                bhinna[owner][target] += 1

    # 4) Sarva
    sarva_ex = [0]*12
    sarva_in = [0]*12

    for owner, arr in bhinna.items():
        for i,v in enumerate(arr):
            sarva_in[i] += v
            if owner != "Lagna":
                sarva_ex[i] += v

    # 5) Tamil layout order
    tamil_order = [11,0,1,2,3,4,5,6,7,8,9,10]

    return {
    "status": "ok",
    "lagna": pos["Lagna"],

    "ashtakavarga": {
        "bhinna": bhinna,
        "sarva_points": sarva_ex,
        "sarva_including_lagna": sarva_in
    }
}


def compute_ashtakavarga_dynamic(rows, debug=False):
    return compute_ashtakavarga_from_rows(rows, debug)
