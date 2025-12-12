# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import sqlite3, swisseph as swe
import datetime
from app_stable_backup import calc_full_table  # ✅ uses your verified calc with Maandhi, Lagna, etc.
from maandhi import compute_maandhi
from maandhi import compute_maandhi as _compute_maandhi
import os
from vimshottari import compute_vimshottari
from ashtakavarga_calc import compute_ashtakavarga_dynamic as compute_ashtakavarga
#from ashtakavarga_dynamic_autofix import compute_ashtakavarga
from shadbala import calculate_shadbala
from padas import calculate_padas
from karakas import calculate_chara_karakas
from chart_comparison import get_dual_chart_data
from divisional_charts import compute_all_divisions
import os

# ------------------------------------------------------------
# ✅ ALWAYS USE LINUX-SAFE PATH FOR RENDER
# ------------------------------------------------------------
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CHARTS_DB = os.path.join(DATA_DIR, "charts.db")
DASHA_DB = os.path.join(DATA_DIR, "dasha.db")
EVENTS_DB = os.path.join(DATA_DIR, "events.db")
TRANSIT_HISTORY_DB = os.path.join(DATA_DIR, "transit_history.db")

CHART_DB = CHARTS_DB
DB_PATH = CHARTS_DB


print("📊 CHARTS_DB:", CHARTS_DB)
print("🌙 DASHA_DB:", DASHA_DB)
print("🧾 EVENTS_DB:", EVENTS_DB)
print("🪐 TRANSIT_HISTORY_DB:", TRANSIT_HISTORY_DB)


# ✅ ensure all chart data goes to the correct DB
DB_PATH = CHARTS_DB




def ensure_dasha_table():
    conn = sqlite3.connect(DASHA_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS dashas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chart_id INTEGER,
            level TEXT,         -- Mahadasha / Bhukti / Antara / etc.
            planet TEXT,
            start_date TEXT,
            end_date TEXT,
            duration REAL,
            raw_json TEXT
        )
    """)
    conn.commit()
    conn.close()

ensure_dasha_table()



# Always use a fixed file in your project folder
TRANSIT_HISTORY_DB = os.path.join(os.path.dirname(__file__), "transit_history.db")
print("🧭 Using DB file:", TRANSIT_HISTORY_DB)
EVENTS_DB = "data/events.db"

import os
import sqlite3
from flask import Flask, jsonify, request

# --- Always use absolute paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)  # ✅ Create if missing


TRANSIT_HISTORY_DB = os.path.join(DATA_DIR, "transit_history.db")
  # ✅ Important

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENTS_DB = os.path.join(BASE_DIR, "data", "events.db")




def ensure_events_table():
    """Create events table if it doesn't exist."""
    conn = sqlite3.connect(EVENTS_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chart_id INTEGER,
            event_name TEXT,
            event_date TEXT,
            event_time TEXT,
            event_notes TEXT,
            dasha TEXT,
            bhukti TEXT,
            antara TEXT,
            sookshma TEXT,
            prana TEXT
        )
    """)
    conn.commit()
    conn.close()

def ensure_transit_table():
    conn = sqlite3.connect(TRANSIT_HISTORY_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transit_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chart_id INTEGER,
            timestamp TEXT,
            location TEXT,
            note TEXT,
            data_json TEXT
        )
    """)
    conn.commit()
    conn.close()
    
def compute_maandhi_safe(*args, **kwargs):
    result = _compute_maandhi(*args, **kwargs)
    if isinstance(result, dict):
        return result
    # Wrap stray string or other types
    return {
        "dbg_line": str(result),
        "rasi": "",
        "dms": "",
        "nak": "",
        "pada": "",
        "rasi_lord": "",
        "maandhi_jd": 0.0
    }

app = Flask(__name__)

DB_PATH = "charts.db"
PLACES_DB = "places.db"
DB_PATH = CHARTS_DB
  # ✅ ensure all chart data goes to /data/charts.db


###################################
# TRANSIT TIMELINE FOR SAVED CHARTS
###################################
from timeline import register_timeline_routes, add_timeline_entry

app = Flask(__name__)
CHARTS_DB = "charts.db"

register_timeline_routes(app, CHARTS_DB)




##################################


# -------------------- MAIN PAGE --------------------
@app.route("/")
def index():
    return render_template("chart.html")


# short Tamil labels used in chart and table (keeps calculation names unchanged)
SHORT_NAMES = {
    "சூரியன்": "சூரி",
    "சந்திரன்": "சந்",
    "புதன்": "புத",
    "சுக்கிரன்": "சுக்",
    "செவ்வாய்": "செவ்",
    "குரு": "குரு",
    "சனி": "சனி",
    "ராகு": "ராகு",
    "கேது": "கேது",
    "லக்னம்": "லக்ன",
    "மாந்தி": "மா",  # ensure maandhi short label
    "மாந்தி": "மா",   # some code uses மாந்தி
}


# -------------------- GENERATE CHART --------------------
@app.route("/generate_chart", methods=["POST"])
def generate_chart():
    try:
        data = request.get_json() or {}

        # Handle both styles: either individual numeric fields OR combined date/time strings
        if "year" in data and "month" in data and "day" in data:
            year, month, day = int(data["year"]), int(data["month"]), int(data["day"])
            hour, minute, second = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data and "time" in data:
            date_parts = data["date"].split("-")
            time_parts = data["time"].split(":")
            year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
            hour = int(time_parts[0]) if len(time_parts) > 0 else 0
            minute = int(time_parts[1]) if len(time_parts) > 1 else 0
            second = int(float(time_parts[2])) if len(time_parts) > 2 else 0
        else:
            raise ValueError("Missing or invalid date/time fields")

        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))
        ayanamsa = data.get("ayanamsa", "lahiri")
        chart_type = data.get("chartType", "rasi").lower()


        # Ayanamsa mode (unchanged)
        if ayanamsa.lower() == "raman":
            swe.set_sid_mode(swe.SIDM_RAMAN)
        elif ayanamsa.lower() == "kp":
            swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)
        elif ayanamsa.lower() == "yukteshwar":
            swe.set_sid_mode(swe.SIDM_YUKTESHWAR)
        else:
            swe.set_sid_mode(swe.SIDM_LAHIRI)

        # Get planetary rows
        rows = calc_full_table(year, month, day, hour, minute, second, lat, lon, tz)
        # ============================================================
        # 🆕 NEW: INJECT KARAKAS (AK, AmK) INTO ROWS
        # ============================================================
        try:
            jd_ut = swe.julday(year, month, day, hour + minute/60.0 + second/3600.0) - (tz / 24.0)
            karaka_data = calculate_chara_karakas(jd_ut)
            
            # Map English (karakas.py) -> Tamil (rows)
            eng_to_tamil = {
                "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்",
                "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", "Saturn": "சனி"
            }
            
            # Helper Map: "சூரியன்" -> "AK"
            k_map = {}
            for k in karaka_data:
                if k['planet'] in eng_to_tamil:
                    t_name = eng_to_tamil[k['planet']]
                    k_map[t_name] = k['karaka_code'] # e.g. "AK"

            # Inject into rows
            for r in rows:
                pname = r.get("name")
                if pname in k_map:
                    r["karaka"] = k_map[pname]  
                else:
                    r["karaka"] = ""
                    
        except Exception as e:
            print(f"⚠️ Karaka Injection Failed: {e}")
        print("🧩 DEBUG: rows type =", type(rows), "length =", len(rows) if rows else 0)

        # Retrograde detection
        retro_map = {}
        planet_check_names = {
            "சூரியன்": swe.SUN, "சந்திரன்": swe.MOON, "செவ்வாய்": swe.MARS,
            "புதன்": swe.MERCURY, "குரு": swe.JUPITER, "சுக்கிரன்": swe.VENUS,
            "சனி": swe.SATURN, "ராகு": swe.MEAN_NODE, "கேது": swe.MEAN_NODE
        }
        jd_ut = swe.julday(year, month, day, hour + minute/60.0 + second/3600.0) - (tz / 24.0)
        for pname, pid in planet_check_names.items():
            try:
                cres = swe.calc_ut(jd_ut, pid)
                if isinstance(cres, (list, tuple)) and len(cres) > 0 and isinstance(cres[0], (list, tuple)):
                    speed = float(cres[0][3])
                else:
                    speed = float(cres[3])
                retro_map[pname] = speed < 0
            except Exception:
                retro_map[pname] = False

        # D-chart mapping
        def map_divisional_rasi_name(row, div):
            try:
                deg = float(row.get("deg_in_sign", 0.0))
                rasis = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி",
                         "துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"]
                cur_rasi_idx = rasis.index(row.get("rasi")) if row.get("rasi") in rasis else 0
                part_size = 30.0 / div
                part_no = int(deg // part_size)
                new_index = (cur_rasi_idx * div + part_no) % 12
                return rasis[new_index]
            except Exception:
                return row.get("rasi")

        if chart_type.startswith("d") and chart_type[1:].isdigit():
            div = int(chart_type[1:])
            for r in rows:
                r["rasi"] = map_divisional_rasi_name(r, div)

        # --- Assign display names for chart & table ---
        for r in rows:
            name = r.get("name", "")
            short = SHORT_NAMES.get(name, name[:3] if name else "")
            is_retro = retro_map.get(name, False)

            # Save back into row dict
            r["short"] = short
            r["retro_flag"] = "வ" if is_retro else ""

            # ✅ Chart box label: show brackets only if retro
            if is_retro:
                r["grid_label"] = f"({short})"   # example → (சனி)
            else:
                r["grid_label"] = short          # example → சூரி


        # --- Build HTML table (table shows retro marker) ---
        html = "<table id='planet-table' style='border-collapse:collapse;width:100%;font-size:13px;'>"
        html += "<tr><th>கிரகம்</th><th>டிகிரி</th><th>ராசி</th><th>நட்சத்திரம்</th><th>பாதம்</th><th>அதிபதி</th></tr>"

        for r in rows:
            dms = r.get('dms') or r.get('degree') or ''
            # ✅ Table: show செவ் (வ) if retro
            display_name = f"{r['short']} ({r['retro_flag']})" if r['retro_flag'] else r['short']
            html += (
                f"<tr>"
                f"<td>{display_name}</td>"
                f"<td>{dms}</td>"
                f"<td>{r.get('rasi','')}</td>"
                f"<td>{r.get('nak','')}</td>"
                f"<td>{r.get('pada','')}</td>"
                f"<td>{r.get('rasi_lord','')}</td>"
                f"</tr>"
            )

        html += "</table>"
                # --- Build HTML table (table shows retro marker) ---
        html = "<table id='planet-table' style='border-collapse:collapse;width:100%;font-size:13px;'>"
        html += "<tr><th>கிரகம்</th><th>டிகிரி</th><th>ராசி</th><th>நட்சத்திரம்</th><th>பாதம்</th><th>அதிபதி</th></tr>"

        for r in rows:
            dms = r.get('dms') or r.get('degree') or ''
            display_name = f"{r['short']} ({r['retro_flag']})" if r['retro_flag'] else r['short']
            html += (
                f"<tr>"
                f"<td>{display_name}</td>"
                f"<td>{dms}</td>"
                f"<td>{r.get('rasi','')}</td>"
                f"<td>{r.get('nak','')}</td>"
                f"<td>{r.get('pada','')}</td>"
                f"<td>{r.get('rasi_lord','')}</td>"
                f"</tr>"
            )

        html += "</table>"

        # ✅ Prevent .get() crash anywhere (wrap rows if string)
        if isinstance(rows, str):
            rows = [{"dbg_line": rows}]

        # ✅ Return chart data safely
        return jsonify({"status": "ok", "rows": rows, "html": html})

        
    except Exception as e:
        print("❌ Error generating chart:", e)
        return jsonify({"status": "error", "message": str(e)})


@app.route('/favicon.ico')
def favicon():
    from flask import send_from_directory
    import os
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


# -------------------- SAVE CHART (SMART UPSERT) --------------------
@app.route("/save_chart", methods=["POST"])
def save_chart():
    import datetime, json, sqlite3
    
    try:
        data = request.get_json(force=True)

        # 1. Extract Data
        id_val = data.get("id") # Frontend might send ID
        name = (data.get("name") or "").strip()
        date_val = data.get("date") or ""
        time_val = data.get("time") or ""
        place_json = data.get("place") or "{}"
        if isinstance(place_json, dict): place_json = json.dumps(place_json)
        
        gender = data.get("gender") or "male"
        tag = data.get("tag") or ""
        comment = data.get("comment") or ""
        ayanamsa = data.get("ayanamsa") or ""
        chart_data = data.get("chart") or {}

        # 2. Timestamp
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(CHARTS_DB)
        cur = conn.cursor()

        # 3. Ensure columns exist
        try: cur.execute("ALTER TABLE charts ADD COLUMN saved_at TEXT")
        except: pass
        try: cur.execute("ALTER TABLE charts ADD COLUMN updated_at TEXT")
        except: pass

        # 4. FIND EXISTING CHART (Smart Check)
        # If ID is provided, use it.
        # If NO ID, look for a chart with same Name + Date + Time (HH:MM)
        chart_id = None
        
        if id_val:
            chart_id = id_val
        else:
            cur.execute("""
                SELECT id FROM charts
                WHERE TRIM(name)=? AND date=? AND SUBSTR(time,1,5)=SUBSTR(?,1,5)
                ORDER BY id DESC LIMIT 1
            """, (name, date_val, time_val))
            row = cur.fetchone()
            if row:
                chart_id = row[0]

        # 5. SAVE or UPDATE
        if chart_id:
            # UPDATE
            cur.execute("""
                UPDATE charts SET
                    name=?, date=?, time=?, place_json=?, ayanamsa=?,
                    comment=?, data_json=?, gender=?, tag=?, updated_at=?
                WHERE id=?
            """, (
                name, date_val, time_val, place_json, ayanamsa,
                comment, json.dumps(chart_data, ensure_ascii=False),
                gender, tag, now, chart_id
            ))
            msg = "Chart updated"
        else:
            # INSERT NEW
            cur.execute("""
                INSERT INTO charts (
                    name, date, time, place_json, ayanamsa, comment,
                    data_json, gender, tag, saved_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                name, date_val, time_val,
                place_json, ayanamsa, comment,
                json.dumps(chart_data, ensure_ascii=False),
                gender, tag, now, now
            ))
            chart_id = cur.lastrowid
            msg = "Chart saved"

        conn.commit()
        conn.close()

        return jsonify({
            "status": "ok",
            "message": msg,
            "chart_id": chart_id,
            "saved_on": now
        })

    except Exception as e:
        print("❌ save_chart error:", e)
        return jsonify({"status": "error", "message": str(e)})
#####################################################
# Update chart
#####################################################
@app.route("/update_chart_full", methods=["POST"])
def update_chart_full():
    """Insert new or update existing chart with TIMESTAMPS."""
    import sqlite3, traceback, datetime, json

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"status": "error", "message": "No data received"}), 400

        # ✅ Get Current Time
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Normalize JSON fields
        for k in ["place_json", "data_json"]:
            if isinstance(data.get(k), (dict, list)):
                data[k] = json.dumps(data[k], ensure_ascii=False)
            elif not data.get(k):
                data[k] = "{}"

        conn = sqlite3.connect(CHARTS_DB)
        cur = conn.cursor()

        # Ensure columns exist
        try: cur.execute("ALTER TABLE charts ADD COLUMN saved_at TEXT")
        except: pass
        try: cur.execute("ALTER TABLE charts ADD COLUMN updated_at TEXT")
        except: pass

        # Fields to save
        fields = ["name", "date", "time", "seconds", "ayanamsa", "chartType",
                  "gender", "tag", "comment", "place_json", "data_json"]

        if data.get("id"):
            # --- UPDATE EXISTING ---
            cid = int(data["id"])
            # Add updated_at to the update query
            set_clause = ", ".join([f"{f}=?" for f in fields]) + ", updated_at=?"
            values = [data.get(f, "") for f in fields] + [now, cid]
            
            cur.execute(f"UPDATE charts SET {set_clause} WHERE id=?", values)
            msg = "Chart updated"
        else:
            # --- INSERT NEW ---
            # Add saved_at AND updated_at to insert query
            all_fields = fields + ["saved_at", "updated_at"]
            placeholders = ", ".join(["?"] * len(all_fields))
            values = [data.get(f, "") for f in fields] + [now, now]
            
            cur.execute(
                f"INSERT INTO charts ({', '.join(all_fields)}) VALUES ({placeholders})",
                values
            )
            cid = cur.lastrowid
            msg = "Chart saved"

        conn.commit()
        conn.close()
        return jsonify({"status": "ok", "message": msg, "id": cid, "saved_on": now})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

    #############################
    #Removing Duplicates
    #############################
@app.route("/remove_duplicates")
def remove_duplicates():
    import sqlite3
    conn = sqlite3.connect(CHARTS_DB)
    cur = conn.cursor()
    
    # Keep the row with the MAX(id) (newest) for every unique combination of Name, Date, Time (HH:MM)
    query = """
    DELETE FROM charts 
    WHERE id NOT IN (
        SELECT MAX(id) 
        FROM charts 
        GROUP BY name, date, SUBSTR(time, 1, 5)
    )
    """
    cur.execute(query)
    deleted_count = cur.rowcount
    conn.commit()
    conn.close()
    
    return jsonify({"status": "ok", "message": f"Removed {deleted_count} duplicate charts."})
    # -------- UPDATE EXISTING CHART --------
    if row:
        chart_id = row[0]
        cur.execute("""
            UPDATE charts SET
                name=?, date=?, time=?, place_json=?, ayanamsa=?,
                comment=?, data_json=?, gender=?, tag=?, updated_at=?
            WHERE id=?
        """, (
            name, date_val, time_val, place_json, ayanamsa,
            comment, json.dumps(chart_data, ensure_ascii=False),
            gender, tag, now, chart_id
        ))
        conn.commit()
        conn.close()

        return jsonify({
            "status": "updated",
            "chart_id": chart_id,
            "saved_on": now         # ← Frontend uses saved_on
        })

    # -------- INSERT NEW CHART --------
    cur.execute("""
        INSERT INTO charts (
            name, date, time, place_json, ayanamsa, comment,
            data_json, gender, tag, saved_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name, date_val, time_val,
        place_json, ayanamsa, comment,
        json.dumps(chart_data, ensure_ascii=False),
        gender, tag, now, now
    ))

    chart_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "status": "saved",
        "chart_id": chart_id,
        "saved_on": now            # ← Frontend uses saved_on
    })





    # --- Also store Dasha info ---
    try:
        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        for maha in dasha_result.get("mahadasha", []):
            cur_d.execute("""
                INSERT INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                chart_id,
                "Mahadasha",
                maha.get("lord", ""),
                maha.get("start_date", ""),
                maha.get("end_date", ""),
                float(maha.get("duration", 0) or 0),
                str(maha)
            ))
        conn_d.commit()
        conn_d.close()
    except Exception as e:
        print("⚠️ Failed to save dashas to dasha.db:", e)

    return jsonify({"status": "ok", "chart_id": chart_id, "message": msg})


    # --- Store Vimshottari dashas into separate dasha.db ---
    try:
        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        for maha in dasha_result.get("mahadasha", []):
            cur_d.execute("""
                INSERT INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                chart_id,
                "Mahadasha",
                maha.get("lord", ""),
                maha.get("start_date", ""),
                maha.get("end_date", ""),
                float(maha.get("duration", 0) or 0),
                str(maha)
            ))
        conn_d.commit()
        conn_d.close()
    except Exception as e:
        print("⚠️ Failed to save dashas to dasha.db:", e)

    return jsonify({"status": "ok", "chart_id": chart_id})

    print("⚠️ Dasha computation skipped:", e)

    # ✅ Step 2: Save to DB
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS charts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, date TEXT, time TEXT,
            place_json TEXT, ayanamsa TEXT,
            comment TEXT, data_json TEXT
        )
    """)

    cur.execute("""
        INSERT INTO charts (name, date, time, place_json, ayanamsa, comment, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("name"),
        data.get("date"),
        data.get("time"),
        str(data.get("place_json")),
        data.get("ayanamsa"),
        data.get("comment"),
        str(data.get("data_json"))
    ))
    # ✅ Get the new chart ID and link dashas to it
    chart_id = cur.lastrowid
    try:
        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        cur_d.execute("UPDATE dashas SET chart_id=? WHERE chart_id IS NULL", (chart_id,))
        conn_d.commit()
        conn_d.close()
    except Exception as e:
        print("⚠️ Failed to link dashas to chart_id:", e)

    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/list_charts", methods=["GET"])
def list_charts():
    """
    Returns all saved charts with robust timestamp handling
    """
    import os, json, re, sqlite3

    charts = []

    def safe_json_loads(val):
        if not val: return {}
        try: return json.loads(val)
        except: return {}

    try:
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Select all columns
        cur.execute("SELECT * FROM charts ORDER BY id DESC")
        rows = cur.fetchall()
        conn.close()

        for row in rows:
            r = dict(row)
            
            # 1. Try updated_at, then saved_at, then saved_on
            # 2. If all fail, use current time (to avoid "-") OR keep "-"
            ts = r.get("updated_at") or r.get("saved_at") or r.get("saved_on")
            
            # Fallback: If DB has NULL, show "-"
            if not ts:
                ts = "-"

            charts.append({
                "id": r.get("id"),
                "name": r.get("name", ""),
                "date": r.get("date", ""),
                "time": r.get("time", ""),
                "gender": r.get("gender", ""),
                "tag": r.get("tag", ""),
                "comment": r.get("comment", ""),
                "place_json": safe_json_loads(r.get("place_json")),
                # Send the found timestamp
                "saved_on": ts
            })
            
        return jsonify({"status": "ok", "charts": charts})

    except Exception as e:
        print("❌ list_charts error:", e)
        return jsonify({"status": "error", "message": str(e)})








@app.route("/get_chart/<int:cid>")
def get_chart(cid):
    import json
    import sqlite3
    from flask import jsonify

    conn = sqlite3.connect(CHARTS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM charts WHERE id = ?", (cid,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Chart not found"})

    chart = dict(row)

    # Decode JSON fields safely
    for field in ["place_json", "data_json"]:
        if chart.get(field):
            try:
                chart[field] = json.loads(chart[field])
            except Exception:
                chart[field] = {}

    return jsonify({"status": "ok", "chart": chart})






@app.route("/delete_chart/<int:cid>", methods=["POST"])
def delete_chart(cid):
    """Delete a chart by ID"""
    import sqlite3, traceback
    try:
        conn = sqlite3.connect(CHARTS_DB)
        cur = conn.cursor()
        cur.execute("DELETE FROM charts WHERE id=?", (cid,))
        conn.commit()
        conn.close()
        return jsonify({"status": "ok", "message": f"Deleted chart #{cid}"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500


# -------------------- PLACES --------------------
# 1. Ensure this variable is defined near the top with your other DBs
import csv # Make sure this is imported

# --- GLOBAL CSV LOADER SETUP ---
# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import sqlite3, swisseph as swe
import datetime
import os
import csv # ✅ Required for CSV Search
import json

# ... (Keep your imports for internal modules like app_stable_backup, etc.) ...
try:
    from app_stable_backup import calc_full_table
    from maandhi import compute_maandhi
    from vimshottari import compute_vimshottari
    from ashtakavarga_calc import compute_ashtakavarga_dynamic as compute_ashtakavarga
    from shadbala import calculate_shadbala
    from padas import calculate_padas
    from karakas import calculate_chara_karakas
except ImportError:
    pass



# Path Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_CSV = os.path.join(BASE_DIR, "india.csv") # ✅ Your CSV File
CHARTS_DB = os.path.join(BASE_DIR, "charts.db")
DASHA_DB = os.path.join(BASE_DIR, "dasha.db")
EVENTS_DB = os.path.join(BASE_DIR, "data", "events.db")
TRANSIT_HISTORY_DB = os.path.join(BASE_DIR, "data", "transit_history.db")

# ============================================================
# 🚀 CSV LOADER (Runs Once on Startup)
# ============================================================
# Path Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_CSV = os.path.join(BASE_DIR, "india.csv") # ✅ Your CSV File
CHARTS_DB = os.path.join(BASE_DIR, "charts.db")
DASHA_DB = os.path.join(BASE_DIR, "dasha.db")
EVENTS_DB = os.path.join(BASE_DIR, "data", "events.db")
TRANSIT_HISTORY_DB = os.path.join(BASE_DIR, "data", "transit_history.db")

# ============================================================
# 🚀 CSV LOADER (Runs Once on Startup)
# ============================================================
PLACES_CACHE = []

def load_places_csv():
    global PLACES_CACHE
    if not os.path.exists(PLACES_CSV):
        print(f"❌ ERROR: '{PLACES_CSV}' not found! Search will fail.")
        return

    print("⏳ Loading cities from CSV...")
    try:
        with open(PLACES_CSV, 'r', encoding='utf-8-sig', errors='replace') as f:
            reader = csv.DictReader(f)
            # Normalize headers (strip spaces)
            if reader.fieldnames:
                reader.fieldnames = [h.strip() for h in reader.fieldnames]
            
            count = 0
            for row in reader:
                try:
                    # Match your CSV columns: iPlace, ilatitudeindia, etc.
                    city = row.get('iPlace')
                    lat = row.get('ilatitudeindia')
                    lon = row.get('iLongitudeindia')
                    tz = row.get('iTimeZone')
                    
                    if city and lat and lon:
                        PLACES_CACHE.append({
                            "label": city, 
                            "search_key": city.lower(), # Optimizes search
                            "lat": float(lat),
                            "lon": float(lon),
                            "tz": float(tz) if tz else 5.5
                        })
                        count += 1
                except ValueError:
                    continue
        print(f"✅ Loaded {count} cities from CSV.")
    except Exception as e:
        print(f"❌ CSV Load Error: {e}")

# Load immediately
load_places_csv()

# ============================================================
# 🔍 SEARCH ROUTE (Uses Memory, Not DB)
# ============================================================
@app.route("/search_places", methods=["GET"])
def search_places():
    query = request.args.get("q", "").strip().lower()
    if not query or len(query) < 2: return jsonify([])

    # Fast filter
    results = []
    count = 0
    for place in PLACES_CACHE:
        if query in place["search_key"]:
            results.append(place)
            count += 1
            if count >= 20: break # Limit results
    
    return jsonify(results)
# -----------------------------------------------------------------
# PASTE THE REST OF YOUR APP.PY ROUTES HERE (generate_chart, etc.)
# OR JUST KEEP THEM AS IS, BUT ENSURE THE SEARCH ROUTE ABOVE IS USED
# -----------------------------------------------------------------



@app.route("/add_place", methods=["POST"])
def add_place():
    data = request.get_json()
    conn = sqlite3.connect(PLACES_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS places (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT, state TEXT, country TEXT,
            lat REAL, lon REAL, tz REAL
        )
    """)
    cur.execute(
        "INSERT INTO places (city, state, country, lat, lon, tz) VALUES (?, ?, ?, ?, ?, ?)",
        (data["city"], data["state"], data["country"], data["lat"], data["lon"], data["tz"])
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})
# -------------------- PANCHANGAM ENDPOINT --------------------
from panchangam import compute_panchangam

@app.route("/panchangam", methods=["POST"])
def panchangam_route():
    try:
        data = request.get_json() or {}
        year = int(data.get("year"))
        month = int(data.get("month"))
        day = int(data.get("day"))
        hour = int(data.get("hour", 0))
        minute = int(data.get("minute", 0))
        second = int(data.get("second", 0))
        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))

        result = compute_panchangam(year, month, day, hour, minute, second, lat, lon, tz)
        # ✅ Wrap properly for frontend
        return jsonify({"status": "ok", "panchangam": result})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ================================================================
# 🌜 Lazy Load Vimshottari Levels (Dynamic Bhukti → Prana)
# ================================================================
@app.route("/vimshottari_dasha", methods=["POST"])
def vimshottari_dasha_route():
    from vimshottari import compute_vimshottari
    try:
        data = request.get_json(force=True)
        result = compute_vimshottari(
            int(data["year"]), int(data["month"]), int(data["day"]),
            int(data["hour"]), int(data["minute"]), int(data.get("second", 0)),
            float(data.get("lat", 13.0827)), float(data.get("lon", 80.2707)),
            float(data.get("tz", 5.5))
        )
        return jsonify(result)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/vimshottari_subtree", methods=["POST"])
def vimshottari_subtree():
    from vimshottari import compute_subtree
    try:
        data = request.get_json(force=True)
        start_jd = float(data.get("start_jd"))
        end_jd   = float(data.get("end_jd"))
        tz       = float(data.get("tz", 5.5))
        level    = int(data.get("level", 1))
        lord     = data.get("lord")
        subtree  = compute_subtree(start_jd, end_jd, tz, level, lord)
        return jsonify({"status": "ok", "subtree": subtree})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 400



# =========================================================
# 🌟 EVENT MANAGEMENT MODULE — Consolidated, deterministic
# =========================================================
import sqlite3
from flask import request, jsonify

# single absolute path for events DB
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
EVENTS_DB = os.path.join(DATA_DIR, "events.db")

def ensure_events_table():
    """Make sure the events table exists before using it."""
    conn = sqlite3.connect(EVENTS_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chart_id INTEGER,
            event_name TEXT,
            event_date TEXT,
            event_time TEXT,
            event_notes TEXT,
            dasha TEXT,
            bhukti TEXT,
            antara TEXT,
            sookshma TEXT,
            prana TEXT,
            transit_data TEXT
        )
    """)
    conn.commit()
    conn.close()

# ensure table exists on startup
ensure_events_table()

# -----------------------------
# Save new event / note
# -----------------------------
@app.route("/save_event", methods=["POST"])
def save_event():
    try:
        ensure_events_table()
        data = request.get_json(force=True) or {}
        fields = (
            data.get("chart_id"), data.get("event_name"),
            data.get("event_date"), data.get("event_time"),
            data.get("event_notes"), data.get("dasha"),
            data.get("bhukti"), data.get("antara"),
            data.get("sookshma"), data.get("prana"),
            str(data.get("transit_data", {}))
        )
        conn = sqlite3.connect(EVENTS_DB)
        cur = conn.cursor()
        cur.execute("""INSERT INTO events(
            chart_id,event_name,event_date,event_time,event_notes,
            dasha,bhukti,antara,sookshma,prana,transit_data
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""", fields)
        conn.commit()
        conn.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        print("❌ save_event error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# 🌙 Dasha info (v2) — reads from separate dasha.db
# ============================================================
@app.route("/get_dasha_v2/<int:chart_id>")
def get_dasha_v2(chart_id):
    try:
        conn = sqlite3.connect(DASHA_DB)  # ✅ use the global dasha.db path
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM dashas WHERE chart_id=?", (chart_id,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        # normalize the field names for frontend compatibility
        for d in rows:
            if "start_date" in d and "start" not in d:
                d["start"] = d["start_date"]
            if "end_date" in d and "end" not in d:
                d["end"] = d["end_date"]

        return jsonify({"status": "ok", "dashas": rows})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})

# ============================================================
# 🔁 Manual Rebuild Dashas from charts.db → dasha.db
# ============================================================
@app.route("/rebuild_dashas", methods=["GET"])
def rebuild_dashas_route():
    import json
    from vimshottari import compute_vimshottari

    try:
        conn_c = sqlite3.connect(CHARTS_DB)
        conn_c.row_factory = sqlite3.Row
        cur_c = conn_c.cursor()
        cur_c.execute("SELECT id, date, time, data_json FROM charts")
        charts = cur_c.fetchall()
        conn_c.close()

        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        cur_d.execute("""
            CREATE TABLE IF NOT EXISTS dashas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chart_id INTEGER,
                level TEXT,
                planet TEXT,
                start_date TEXT,
                end_date TEXT,
                duration REAL,
                raw_json TEXT
            )
        """)

        rebuilt = 0
        for c in charts:
            chart_id = c["id"]

            # skip if dashas already exist
            cur_d.execute("SELECT COUNT(*) FROM dashas WHERE chart_id=?", (chart_id,))
            if cur_d.fetchone()[0] > 0:
                continue

            # try loading existing data_json
            try:
                data = json.loads(c["data_json"] or "{}")
                dashas = data.get("dashas", [])
            except Exception:
                dashas = []

            # fallback: compute Vimshottari
            if not dashas:
                try:
                    y, m, d = [int(x) for x in c["date"].split("-")]
                    parts = [int(float(x)) for x in c["time"].split(":")]
                    hh, mm, ss = (parts + [0, 0, 0])[:3]
                    result = compute_vimshottari(y, m, d, hh, mm, ss, 13.0827, 80.2707, 5.5)
                    dashas = result.get("mahadasha", [])
                except Exception as e:
                    print(f"⚠️ Failed to compute dashas for chart {chart_id}: {e}")
                    dashas = []

            for d in dashas:
                cur_d.execute("""
                    INSERT INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    chart_id,
                    "Mahadasha",
                    d.get("lord", ""),
                    d.get("start_date", ""),
                    d.get("end_date", ""),
                    float(d.get("duration", 0) or 0),
                    json.dumps(d)
                ))
                rebuilt += 1

        conn_d.commit()
        conn_d.close()
        return jsonify({"status": "ok", "inserted": rebuilt})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})







# -----------------------------
# List all events for a chart
# -----------------------------
@app.route("/list_events", methods=["GET"])
def list_events():
    try:
        ensure_events_table()
        chart_id = request.args.get("chart_id")
        conn = sqlite3.connect(EVENTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM events WHERE chart_id=? ORDER BY id DESC", (chart_id,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return jsonify({"status": "ok", "events": rows})
    except Exception as e:
        print("❌ list_events error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------------
# Delete one event/note
# -----------------------------
@app.route("/delete_event", methods=["POST"])
def delete_event():
    try:
        ensure_events_table()
        data = request.get_json(force=True) or {}
        event_id = data.get("id")
        if not event_id:
            return jsonify({"status": "error", "message": "Missing id"}), 400
        conn = sqlite3.connect(EVENTS_DB)
        cur = conn.cursor()
        cur.execute("DELETE FROM events WHERE id=?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        print("❌ delete_event error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------------
# Update existing event/note
# -----------------------------
@app.route("/update_event", methods=["POST"])
def update_event():
    try:
        ensure_events_table()
        data = request.get_json(force=True) or {}
        event_id = data.get("id")
        if not event_id:
            return jsonify({"status": "error", "message": "Missing id"}), 400

        # allow partial update — keep fields present in payload
        name = data.get("event_name", "")
        date = data.get("event_date", "")
        time = data.get("event_time", "")
        notes = data.get("event_notes", "")
        dasha = data.get("dasha", "")
        bhukti = data.get("bhukti", "")
        antara = data.get("antara", "")
        sookshma = data.get("sookshma", "")
        prana = data.get("prana", "")

        conn = sqlite3.connect(EVENTS_DB)
        cur = conn.cursor()
        cur.execute("""
            UPDATE events
            SET event_name=?, event_date=?, event_time=?, event_notes=?,
                dasha=?, bhukti=?, antara=?, sookshma=?, prana=?
            WHERE id=?
        """, (name, date, time, notes, dasha, bhukti, antara, sookshma, prana, event_id))
        conn.commit()
        conn.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        print("❌ update_event error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# ---------------- TRANSIT HISTORY ROUTES (robust upsert + id) ----------------
from datetime import datetime
import json
import sqlite3
from flask import request, jsonify

TRANSIT_HISTORY_DB = "charts.db"  # reuse charts.db

# Ensure schema exists (run once)
def ensure_transit_history_table():
    conn = sqlite3.connect(TRANSIT_HISTORY_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transit_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chart_id INTEGER,
            timestamp TEXT,
            location TEXT,
            note TEXT,
            data_json TEXT
        )
    """)
    # index for fast lookup
    cur.execute("CREATE INDEX IF NOT EXISTS idx_transit_chart_ts ON transit_history(chart_id, timestamp)")
    conn.commit()
    conn.close()

ensure_transit_history_table()

# --- Save or append current transit snapshot when a chart is opened ---
@app.route("/save_transit_snapshot", methods=["POST"])
def save_transit_snapshot():
    ensure_transit_table()
    data = request.get_json(force=True)
    chart_id = data.get("chart_id") or int(datetime.now().timestamp())
    transit_data = data.get("transit_data") or []
    location = data.get("location", "Chennai")
    note = data.get("note", "")
    ts = datetime.now().isoformat()

    conn = sqlite3.connect(TRANSIT_HISTORY_DB)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO transit_history (chart_id, timestamp, location, note, data_json)
        VALUES (?, ?, ?, ?, ?)
    """, (chart_id, ts, location, note, json.dumps(transit_data)))
    conn.commit()
    conn.close()
    return jsonify(status="ok")





@app.route("/transit_history/<int:chart_id>", methods=["GET"])
def get_transit_history(chart_id):
    ensure_transit_table()
    conn = sqlite3.connect(TRANSIT_HISTORY_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ✅ Never limit results
    if chart_id == 0:
        cur.execute("SELECT * FROM transit_history ORDER BY id DESC")
    else:
        cur.execute("SELECT * FROM transit_history WHERE chart_id=? ORDER BY id DESC", (chart_id,))

    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    for r in rows:
        try:
            r["data"] = json.loads(r.get("data_json") or "[]")
        except Exception:
            r["data"] = []
    return jsonify(status="ok", history=rows)


@app.route("/delete_transit_snapshot/<int:entry_id>", methods=["POST"])
def delete_transit_snapshot(entry_id):
    """Deletes a saved transit snapshot safely from SQLite."""
    try:
        ensure_transit_table()
        conn = sqlite3.connect(TRANSIT_HISTORY_DB)
        cur = conn.cursor()
        cur.execute("DELETE FROM transit_history WHERE id = ?", (entry_id,))
        conn.commit()
        conn.close()

        if cur.rowcount > 0:
            return jsonify(status="ok", message="deleted")
        else:
            return jsonify(status="error", message="Not found"), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify(status="error", message=str(e)), 500


# --- Update a note for a specific transit snapshot ---
@app.route("/update_transit_note", methods=["POST"])
def update_transit_note():
    ensure_transit_table()
    data = request.get_json(force=True)
    _id = data.get("id")
    note = data.get("note", "").strip()
    ts = data.get("timestamp", "").strip()

    # ✅ Accept any format that browser sends
    try:
        if len(ts) == 16:  # "YYYY-MM-DDTHH:MM"
            ts += ":00"
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        ts = parsed.isoformat()
    except Exception:
        ts = datetime.now().isoformat()

    conn = sqlite3.connect(TRANSIT_HISTORY_DB)
    cur = conn.cursor()
    cur.execute("UPDATE transit_history SET note=?, timestamp=? WHERE id=?", (note, ts, _id))
    conn.commit()
    conn.close()
    return jsonify(status="ok", timestamp=ts)


# --- Update a client note safely (unique endpoint name) ---
@app.route("/update_client_note", methods=["POST"], endpoint="update_client_note_api")
def update_client_note_api():
    try:
        ensure_events_table()  # ✅ make sure table exists
        data = request.get_json(force=True)
        event_id = data.get("id")
        if not event_id:
            return jsonify({"status": "error", "message": "Missing event ID"}), 400

        name = data.get("event_name", "Client Note")
        date = data.get("event_date", "")
        time = data.get("event_time", "")
        notes = data.get("event_notes", "")

        conn = sqlite3.connect(EVENTS_DB)  # ✅ uses absolute path
        cur = conn.cursor()
        cur.execute("""
            UPDATE events
            SET event_name=?, event_date=?, event_time=?, event_notes=?
            WHERE id=?
        """, (name, date, time, notes, event_id))
        conn.commit()
        conn.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        print("❌ update_client_note_api error:", e)
        return jsonify({"status": "error", "message": str(e)})



@app.route("/debug_list_charts")
def debug_list_charts():
    try:
        conn = sqlite3.connect(CHART_DB)
        cur = conn.cursor()
        cur.execute("SELECT id, name, date, time FROM charts ORDER BY id DESC")
        rows = cur.fetchall()
        conn.close()
        return jsonify({"status": "ok", "charts": rows})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ============================================================
# 🛠 One-time repair: Recompute and insert Dashas for existing charts
# ============================================================
@app.route("/rebuild_dashas", methods=["POST"])
def rebuild_dashas():
    import json
    from vimshottari import compute_vimshottari
    added = 0

    try:
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id, data_json FROM charts")
        charts = cur.fetchall()
        conn.close()

        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()

        for c in charts:
            chart_id = c["id"]
            try:
                data = json.loads(c["data_json"] or "{}")
                dashas = data.get("dashas", [])
                if not dashas:
                    continue  # no dashas inside chart
                for d in dashas:
                    cur_d.execute("""
                        INSERT OR IGNORE INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        chart_id,
                        "Mahadasha",
                        d.get("lord", ""),
                        d.get("start_date", ""),
                        d.get("end_date", ""),
                        float(d.get("duration", 0) or 0),
                        json.dumps(d)
                    ))
                    added += 1
            except Exception as e:
                print("⚠️ Error for chart", chart_id, ":", e)

        conn_d.commit()
        conn_d.close()

        return jsonify({"status": "ok", "inserted": added})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})


# ============================================================
# 🧩 Auto Repair: Ensure all charts have Dashas in dasha.db
# ============================================================
def auto_repair_dashas():
    import json
    from vimshottari import compute_vimshottari

    try:
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id, date, time, data_json FROM charts")
        charts = cur.fetchall()
        conn.close()

        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        cur_d.execute("""
            CREATE TABLE IF NOT EXISTS dashas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chart_id INTEGER,
                level TEXT,
                planet TEXT,
                start_date TEXT,
                end_date TEXT,
                duration REAL,
                raw_json TEXT
            )
        """)
        conn_d.commit()

        repaired = 0
        for c in charts:
            chart_id = c["id"]

            # skip if dashas already exist
            cur_d.execute("SELECT COUNT(*) FROM dashas WHERE chart_id=?", (chart_id,))
            if cur_d.fetchone()[0] > 0:
                continue

            # read dashas from existing chart JSON
            try:
                data = json.loads(c["data_json"] or "{}")
                dashas = data.get("dashas", [])
            except Exception:
                dashas = []

            if not dashas:
                # fallback: recompute Vimshottari from date/time
                date_str, time_str = c["date"], c["time"]
                try:
                    year, month, day = [int(x) for x in date_str.split("-")]
                    parts = [int(float(x)) for x in time_str.split(":")]
                    h, m, s = (parts + [0, 0, 0])[:3]
                    res = compute_vimshottari(year, month, day, h, m, s, 13.0827, 80.2707, 5.5)
                    dashas = res.get("mahadasha", [])
                except Exception:
                    dashas = []

            for d in dashas:
                cur_d.execute("""
                    INSERT OR IGNORE INTO dashas
                    (chart_id, level, planet, start_date, end_date, duration, raw_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    chart_id,
                    "Mahadasha",
                    d.get("lord", ""),
                    d.get("start_date", ""),
                    d.get("end_date", ""),
                    float(d.get("duration", 0) or 0),
                    json.dumps(d)
                ))
                repaired += 1

        conn_d.commit()
        conn_d.close()
        print(f"✅ Auto-repair complete: inserted {repaired} dashas.")
    except Exception as e:
        import traceback; traceback.print_exc()
        print("⚠️ Auto-repair failed:", e)

@app.route("/recompute_all_dashas", methods=["GET", "POST"])
def recompute_all_dashas():

    import sqlite3, json
    from vimshottari import compute_vimshottari

    recomputed = 0
    try:
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id, date, time, data_json FROM charts")
        charts = cur.fetchall()
        conn.close()

        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()

        for c in charts:
            chart_id = c["id"]
            date_str, time_str = c["date"], c["time"]

            # Parse date/time
            try:
                y, m, d = [int(x) for x in date_str.split("-")]
                parts = [int(float(x)) for x in time_str.split(":")]
                h, mn, s = (parts + [0, 0, 0])[:3]
            except Exception:
                continue

            # Compute Vimshottari Dasha
            result = compute_vimshottari(y, m, d, h, mn, s, 13.0827, 80.2707, 5.5)
            dashas = result.get("mahadasha", [])
            if not dashas:
                continue

            # Update chart JSON
            try:
                data = json.loads(c["data_json"] or "{}")
            except Exception:
                data = {}
            data["dashas"] = dashas

            conn2 = sqlite3.connect(CHARTS_DB)
            cur2 = conn2.cursor()
            cur2.execute("UPDATE charts SET data_json=? WHERE id=?", (json.dumps(data), chart_id))
            conn2.commit()
            conn2.close()

            # Insert into dasha.db
            cur_d.execute("DELETE FROM dashas WHERE chart_id=?", (chart_id,))
            for d in dashas:
                cur_d.execute("""
                    INSERT INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    chart_id,
                    "Mahadasha",
                    d.get("lord", ""),
                    d.get("start_date", ""),
                    d.get("end_date", ""),
                    float(d.get("duration", 0) or 0),
                    json.dumps(d)
                ))
                recomputed += 1

        conn_d.commit()
        conn_d.close()
        return jsonify({"status": "ok", "inserted": recomputed})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})



# ================================================================
# 🌙 Rebuild Dasha for a specific chart (safe GET + POST)
# ================================================================
# ================================================================
# 🌙 Rebuild Vimshottari Dasha for ONE specific chart (final version)
# ================================================================
@app.route("/rebuild_dasha_for_chart/<int:chart_id>", methods=["GET", "POST"])
def rebuild_dasha_for_chart(chart_id):
    """
    Recomputes Vimshottari Dasha for a single chart.
    ✅ Reads from charts.db
    ✅ Updates charts.db (data_json)
    ✅ Updates dasha.db (Mahadasha periods)
    ✅ Compatible with compute_vimshottari() returning 'mahadashas'
    """
    import json
    from vimshottari import compute_vimshottari

    try:
        # --- Load chart from charts.db ---
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id, date, time, data_json FROM charts WHERE id=?", (chart_id,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return jsonify({"status": "error", "message": f"Chart {chart_id} not found"})

        # --- Parse date/time safely ---
        date_str, time_str = row["date"], row["time"]
        try:
            y, m, d = [int(x) for x in date_str.split("-")]
            parts = [int(float(x)) for x in time_str.split(":")]
            h, mn, s = (parts + [0, 0, 0])[:3]
        except Exception as e:
            return jsonify({"status": "error", "message": f"Invalid date/time format: {e}"})

        # --- Compute Vimshottari Dasha ---
        result = compute_vimshottari(y, m, d, h, mn, s, 13.0827, 80.2707, 5.5)

        # 🪔 Handle different key names: "mahadasha", "mahadashas", or "dashas"
        dashas = result.get("mahadasha") or result.get("mahadashas") or result.get("dashas") or []
        if not dashas:
            return jsonify({
                "status": "error",
                "message": "No dashas computed",
                "debug": list(result.keys())  # helpful for testing, remove later if desired
            })

        # --- Update chart JSON in charts.db ---
        data = {}
        try:
            data = json.loads(row["data_json"] or "{}")
        except Exception:
            data = {}

        data["dashas"] = dashas
        conn2 = sqlite3.connect(CHARTS_DB)
        cur2 = conn2.cursor()
        cur2.execute("UPDATE charts SET data_json=? WHERE id=?", (json.dumps(data), chart_id))
        conn2.commit()
        conn2.close()

        # --- Write Mahadasha data to dasha.db ---
        conn_d = sqlite3.connect(DASHA_DB)
        cur_d = conn_d.cursor()
        cur_d.execute("DELETE FROM dashas WHERE chart_id=?", (chart_id,))
        for d in dashas:
            cur_d.execute("""
                INSERT INTO dashas (chart_id, level, planet, start_date, end_date, duration, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                chart_id,
                "Mahadasha",
                d.get("lord", ""),
                d.get("start") or d.get("start_date", ""),
                d.get("end") or d.get("end_date", ""),
                float(d.get("duration", 0) or 0),
                json.dumps(d, ensure_ascii=False)  # ✅ ensures valid JSON
            ))
        conn_d.commit()
        conn_d.close()

        print(f"✅ Successfully rebuilt {len(dashas)} dashas for chart {chart_id}")
        return jsonify({"status": "ok", "inserted": len(dashas)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})

# ============================================================
# 🪔 Helper: Get Active Dasha chain for a given date (read-only)
# ============================================================
@app.route("/get_dasha_chain/<int:chart_id>", methods=["GET"])
def get_dasha_chain(chart_id):
    """
    Returns full active Vimshottari chain (Mahadasha → Prana)
    for the given chart and target date.
    Uses vimshottari.py directly — no recomputation stored.
    """
    import datetime, json, sqlite3
    from vimshottari import compute_vimshottari, compute_subtree, jd_from_local

    # Get target date/time from query string
    date_str = request.args.get("date", "")
    if not date_str:
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        target = datetime.datetime.fromisoformat(date_str.replace("T", " "))
    except Exception:
        return jsonify({"status": "error", "message": f"Invalid date: {date_str}"})

    # --- Step 1: Get chart details ---
    try:
        conn = sqlite3.connect(CHARTS_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM charts WHERE id=?", (chart_id,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return jsonify({"status": "error", "message": f"Chart {chart_id} not found"})

        # ✅ SAFELY parse data_json (handles both 'single quotes' and proper JSON)
        try:
            data_raw = row["data_json"] or "{}"
            data_raw = data_raw.replace("'", '"').replace("None", "null")
            data_json = json.loads(data_raw)
        except Exception:
            data_json = {}

        lat = float(data_json.get("lat", 13.0827))
        lon = float(data_json.get("lon", 80.2707))
        tz = float(data_json.get("tz", 5.5))

        y, m, d = [int(x) for x in row["date"].split("-")]
        hh, mm, ss = [int(float(x)) for x in row["time"].split(":")[:3]]

        # --- Step 2: Compute Vimshottari dashas for this chart ---
        res = compute_vimshottari(y, m, d, hh, mm, ss, lat, lon, tz)
        mahadashas = res.get("mahadashas") or res.get("mahadasha") or res.get("dashas") or []
        if not mahadashas:
            return jsonify({"status": "error", "message": "No Vimshottari data found"})

        # --- Step 3: Recursively find active Dasha chain ---
        def find_active_chain(levels, depth=1):
            for dasha in levels:
                s = datetime.datetime.fromisoformat(dasha["start"])
                e = datetime.datetime.fromisoformat(dasha["end"])
                if s <= target <= e:
                    chain = [{
                        "level": ["Mahadasha","Bhukti","Antara","Pratyantara","Sookshma","Prana"][depth-1],
                        "planet": dasha["lord"],
                        "start_date": dasha["start"],
                        "end_date": dasha["end"]
                    }]
                    if "sub" in dasha:
                        chain += find_active_chain(dasha["sub"], depth+1)
                    else:
                        # Dynamically compute deeper levels
                        if depth < 6:
                            sub = compute_subtree(dasha["start_jd"], dasha["end_jd"], tz, 1, dasha["lord"])
                            chain += find_active_chain(sub, depth+1)
                    return chain
            return []

        full_chain = find_active_chain(mahadashas)

        return jsonify({
            "status": "ok",
            "chart_id": chart_id,
            "target_date": date_str,
            "active_dasha_chain": full_chain
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})

#----------------------------------------------------------
#
#Bhava Chart 
# ----------------------------------------------------------------
# app.py

@app.route("/bhava_chart", methods=["POST"])
def bhava_chart():
    try:
        data = request.get_json(force=True)

        # 1. Parse Date/Time
        if "year" in data:
            y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
            h, mi, s = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = int(data.get("seconds", 0))
        else:
            return jsonify({"status": "error", "message": "Invalid Data"})

        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))
        
        # Ayanamsa
        ayanamsa = data.get("ayanamsa", "lahiri").lower()
        if ayanamsa == "raman": swe.set_sid_mode(swe.SIDM_RAMAN)
        elif ayanamsa == "kp": swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)
        else: swe.set_sid_mode(swe.SIDM_LAHIRI)

        # 2. Julian Day
        jd_ut = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0

        # 3. GET ANGLES (ASC & MC) ONLY
        # We do NOT ask SwissEph for houses. We calculate them manually.
        res_flags = swe.FLG_SIDEREAL
        cusps_temp, ascmc = swe.houses_ex(jd_ut, lat, lon, b'P', res_flags)
        
        asc_deg = ascmc[0]  # Lagna Degree (Midpoint of H1)
        mc_deg = ascmc[1]   # MC Degree (Midpoint of H10)

        # 4. MANUAL SRIPATI CALCULATION
        
        def normalize(d): 
            return (d + 360) % 360
        
        def get_distance(start, end): 
            return (end - start + 360) % 360

        midpoints = [0.0] * 13 # 1-based index
        
        # A. Set Angles as Midpoints
        midpoints[1]  = asc_deg
        midpoints[10] = mc_deg
        midpoints[7]  = normalize(asc_deg + 180) # Descendant
        midpoints[4]  = normalize(mc_deg + 180)  # IC

        # B. Trisect Quadrants to find other Midpoints
        # 10th to 1st (Houses 11, 12)
        dist_10_1 = get_distance(midpoints[10], midpoints[1])
        midpoints[11] = normalize(midpoints[10] + dist_10_1 / 3)
        midpoints[12] = normalize(midpoints[10] + 2 * dist_10_1 / 3)

        # 1st to 4th (Houses 2, 3)
        dist_1_4 = get_distance(midpoints[1], midpoints[4])
        midpoints[2] = normalize(midpoints[1] + dist_1_4 / 3)
        midpoints[3] = normalize(midpoints[1] + 2 * dist_1_4 / 3)

        # 4th to 7th (Houses 5, 6)
        dist_4_7 = get_distance(midpoints[4], midpoints[7])
        midpoints[5] = normalize(midpoints[4] + dist_4_7 / 3)
        midpoints[6] = normalize(midpoints[4] + 2 * dist_4_7 / 3)

        # 7th to 10th (Houses 8, 9)
        dist_7_10 = get_distance(midpoints[7], midpoints[10])
        midpoints[8] = normalize(midpoints[7] + dist_7_10 / 3)
        midpoints[9] = normalize(midpoints[7] + 2 * dist_7_10 / 3)

        # C. Calculate Sandhis (Start of Houses)
        # The Start of House X is the halfway point between Midpoint(X-1) and Midpoint(X)
        sandhis = [0.0] * 13
        for i in range(1, 13):
            prev = 12 if i == 1 else i - 1
            span = get_distance(midpoints[prev], midpoints[i])
            sandhis[i] = normalize(midpoints[prev] + span / 2)

        # 5. Format Output
        tamil_signs = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
                       "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"]
        
        # Determine strict Rasi for Lagna (Visual Highlight)
        # This is based purely on the Ascendant degree, not the Bhava start.
        lagna_rasi_idx = int(asc_deg / 30)
        lagna_rasi_name = tamil_signs[lagna_rasi_idx]

        bhavas_out = []
        for i in range(1, 13):
            # Format Midpoint
            md = midpoints[i]
            mid_d = int(md % 30)
            mid_m = int((md % 30 - mid_d) * 60)
            
            # Format Start (Sandhi)
            sd = sandhis[i]
            sd_d = int(sd % 30)
            sd_m = int((sd % 30 - sd_d) * 60)
            
            # Determine Rasi for display in table
            m_rasi = tamil_signs[int(md / 30)]
            
            bhavas_out.append({
                "house": i,
                "rasi": m_rasi,
                "mid_dms": f"{mid_d}°{mid_m}'",   # Bhava Madhya
                "start_dms": f"{sd_d}°{sd_m}'",   # Bhava Arambha
                "full_mid_deg": md
            })

        # 6. Planet Positions
        planet_map = {
            swe.SUN: "சூரியன்", swe.MOON: "சந்திரன்", swe.MARS: "செவ்வாய்",
            swe.MERCURY: "புதன்", swe.JUPITER: "குரு", swe.VENUS: "சுக்கிரன்",
            swe.SATURN: "சனி", swe.MEAN_NODE: "ராகு"
        }
        
        planets_out = []
        ayan_val = swe.get_ayanamsa_ut(jd_ut)

        # Logic: Does planet fall between Start(H) and Start(H+1)?
        def get_bhava_number(p_lon, sandhis_list):
            p_lon = normalize(p_lon)
            for h in range(1, 13):
                start = sandhis_list[h]
                end = sandhis_list[h+1] if h < 12 else sandhis_list[1]
                
                if start < end:
                    if start <= p_lon < end: return h
                else: # Wrap around case (Pisces -> Aries)
                    if p_lon >= start or p_lon < end: return h
            return 1

        for pid, name in planet_map.items():
            res = swe.calc_ut(jd_ut, pid)
            lon = normalize(res[0][0] - ayan_val)
            
            # Rasi (Visual) - Where it sits in the grid
            p_rasi_idx = int(lon / 30)
            
            # Bhava (Functional) - Which House it belongs to
            bhava_num = get_bhava_number(lon, sandhis)
            
            d_p = int(lon % 30)
            m_p = int((lon % 30 - d_p) * 60)

            planets_out.append({
                "name": name,
                "rasi": tamil_signs[p_rasi_idx], # Visual Location
                "bhava_no": bhava_num,           # Functional House
                "dms": f"{d_p}°{m_p}'"
            })

        # Ketu
        rahu = next(p for p in planets_out if p["name"] == "ராகு")
        k_lon = normalize(swe.calc_ut(jd_ut, swe.MEAN_NODE)[0][0] - ayan_val + 180)
        k_rasi_idx = int(k_lon / 30)
        k_bhava = get_bhava_number(k_lon, sandhis)
        
        planets_out.append({
            "name": "கேது",
            "rasi": tamil_signs[k_rasi_idx],
            "bhava_no": k_bhava,
            "dms": rahu["dms"]
        })

        return jsonify({
            "status": "ok",
            "bhavas": bhavas_out,
            "planets": planets_out,
            "lagna_rasi": lagna_rasi_name 
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})

#----------------------------------------------------------
#
#Ashtagavarga
#----------------------------------------------------------


@app.route("/compute_ashtakavarga", methods=["POST"])
def compute_ashtakavarga_api():
    try:
        data = request.get_json(force=True)
    except Exception:
        data = request.get_json(silent=True) or {}

    # parse incoming fields with robust defaults
    date = data.get("date", "")  # expecting "YYYY-MM-DD"
    time = data.get("time", "")  # expecting "HH:MM:SS" or "HH:MM"
    lat = data.get("lat", data.get("latitude", 13.0827))
    lon = data.get("lon", data.get("longitude", 80.2707))
    tz = data.get("tz", data.get("timezone", 5.5))
    ayanamsa = data.get("ayanamsa", data.get("ayanamsha", "lahiri"))
    debug = bool(data.get("debug", False))

    # default date/time fallback
    try:
        if date:
            y, m, d = map(int, date.split("-"))
        else:
            # fallback today (not ideal)
            import datetime
            today = datetime.datetime.utcnow()
            y, m, d = today.year, today.month, today.day
    except Exception:
        y, m, d = 2000, 1, 1

    # time parsing
    h = 0; mi = 0; s = 0
    try:
        if isinstance(time, (int, float)):
            h = int(time)
        elif time:
            parts = time.split(":")
            h = int(parts[0]) if len(parts) > 0 else 0
            mi = int(parts[1]) if len(parts) > 1 else 0
            s = int(parts[2]) if len(parts) > 2 else 0
    except Exception:
        h, mi, s = 0, 0, 0

    # ensure numeric types
    try:
        lat = float(lat); lon = float(lon); tz = float(tz)
    except Exception:
        lat = 13.0827; lon = 80.2707; tz = 5.5

    try:
        # call the calculation function
        # 🔧 Fix: Use same rows as Rasi chart (no argument confusion)
        rows = calc_full_table(y, m, d, h, mi, s, lat, lon, tz)
        res = compute_ashtakavarga(rows=rows, debug=debug)

        return jsonify(res)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500




# Add import at top
from kp import calculate_kp_data
#############################################
# ... KP 
#############################################
@app.route("/kp_chart", methods=["POST"])
def kp_chart_route():
    try:
        data = request.get_json(force=True)
        if "year" in data:
            y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
            h, mi, s = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = int(data.get("seconds", 0))
        else:
            return jsonify({"status": "error", "message": "Invalid date"})

        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))

        jd_ut = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0
        
        # Calc KP
        result = calculate_kp_data(jd_ut, lat, lon, tz)
        return jsonify({"status": "ok", "data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})


#######
####### PADAS (AL,UL)
# Import at top


# Add this route
@app.route("/compute_padas", methods=["POST"])
def compute_padas_route():
    try:
        data = request.get_json(force=True)
        # Date parsing logic (reused)
        if "year" in data:
            y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
            h, mi, s = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = int(data.get("seconds", 0))
        else:
            return jsonify({"status": "error", "message": "Invalid date"})

        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))

        jd_ut = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0
        
        # Compute
        result = calculate_padas(jd_ut, lat, lon, tz)
        
        return jsonify({"status": "ok", "data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})


#######
#######.KARAKS OF JEIMINI



# Add Route
@app.route("/compute_karakas", methods=["POST"])
def compute_karakas_route():
    try:
        data = request.get_json(force=True)
        
        # Date Parsing
        if "year" in data:
            y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
            h, mi, s = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = int(data.get("seconds", 0))
        else:
            return jsonify({"status": "error", "message": "Invalid date"})

        tz = float(data.get("tz", 5.5))
        jd_ut = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0
        
        result = calculate_chara_karakas(jd_ut)
        return jsonify({"status": "ok", "data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})





#######
#######Shatbala
#######
#######
# app.py - Add this BEFORE 'if __name__ == "__main__":'

@app.route("/compute_shadbala", methods=["POST"])
def compute_shadbala_route():
    try:
        data = request.get_json(force=True)
        
        if "year" in data:
            y, m, d = int(data["year"]), int(data["month"]), int(data["day"])
            h, mi, s = int(data.get("hour", 0)), int(data.get("minute", 0)), int(data.get("second", 0))
        elif "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = int(data.get("seconds", 0))
        else:
            return jsonify({"status": "error", "message": "Invalid date"})

        lat = float(data.get("lat", 13.0827))
        lon = float(data.get("lon", 80.2707))
        tz = float(data.get("tz", 5.5))

        # Calculate JD
        jd_ut = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0
        
        # Call the new function
        from shadbala import calculate_shadbala  # Import here or at top
        result = calculate_shadbala(jd_ut, lat, lon, tz)
        
        return jsonify({"status": "ok", "data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})
#############################################
# Marriage Matching Chart Comparison
#############################################
@app.route("/compare_charts_view", methods=["POST"])
def compare_charts_view():
    try:
        data = request.get_json()
        # Takes { boy: {date...}, girl: {date...} }
        result = get_dual_chart_data(data["boy"], data["girl"])
        return jsonify({"status": "ok", "data": result})
    except Exception as e:
        print("Error in comparison:", e) # Print error to console for debugging
        return jsonify({"status": "error", "message": str(e)}), 500

# --- MATCH HISTORY TRACKING ---
MATCH_DB = "match_history.db"

def ensure_match_db():
    conn = sqlite3.connect(MATCH_DB)
    cur = conn.cursor()
    # Stores: Who (Name), Gender, Matched With (Partner Name), Date, Score
    cur.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            gender TEXT,
            partner_name TEXT,
            score TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

ensure_match_db()

@app.route("/log_match", methods=["POST"])
def log_match():
    try:
        data = request.get_json()
        boy = data.get("boy_name")
        girl = data.get("girl_name")
        score = data.get("score")

        conn = sqlite3.connect(MATCH_DB)
        cur = conn.cursor()
        
        # Log Boy's History
        cur.execute("INSERT INTO history (name, gender, partner_name, score) VALUES (?, ?, ?, ?)", (boy, "Male", girl, score))
        # Log Girl's History
        cur.execute("INSERT INTO history (name, gender, partner_name, score) VALUES (?, ?, ?, ?)", (girl, "Female", boy, score))
        
        conn.commit()
        conn.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/get_match_count", methods=["POST"])
def get_match_count():
    try:
        data = request.get_json()
        name = data.get("name")
        conn = sqlite3.connect(MATCH_DB)
        cur = conn.cursor()
        
        # Count distinct partners checked
        cur.execute("SELECT COUNT(DISTINCT partner_name) FROM history WHERE name = ?", (name,))
        count = cur.fetchone()[0]
        
        # Optional: Get last 5 partners
        cur.execute("SELECT partner_name, score, date(timestamp) FROM history WHERE name = ? ORDER BY id DESC LIMIT 5", (name,))
        recent = [{"partner": r[0], "score": r[1], "date": r[2]} for r in cur.fetchall()]
        
        conn.close()
        return jsonify({"status": "ok", "count": count, "recent": recent})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ===================================================================

# All division drop down option
#===================================================================
@app.route("/get_all_divisions", methods=["POST"])
def get_all_divisions():
    try:
        data = request.get_json()
        # Parse inputs
        if "date" in data:
            d_parts = data["date"].split("-")
            t_parts = data["time"].split(":")
            y, m, d = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
            h, mi = int(t_parts[0]), int(t_parts[1])
            s = 0 # default
        else:
            return jsonify({"status": "error", "message": "Missing Date/Time"})

        lat = float(data.get("lat"))
        lon = float(data.get("lon"))
        tz = float(data.get("tz"))

        # Set Ayanamsa
        ayanamsa = data.get("ayanamsa", "lahiri")
        if ayanamsa == "raman": swe.set_sid_mode(swe.SIDM_RAMAN)
        elif ayanamsa == "kp": swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)
        else: swe.set_sid_mode(swe.SIDM_LAHIRI)

        # Calc JD
        jd = swe.julday(y, m, d, h + mi/60.0 + s/3600.0) - tz/24.0

        # Compute
        charts = compute_all_divisions(jd, lat, lon, tz)

        return jsonify({"status": "ok", "charts": charts})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
#######################################################################
#Time stamp
#######################################################################

@app.route("/fix_timestamps")
def fix_timestamps():
    import sqlite3
    from datetime import datetime

    # Current time
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect(CHARTS_DB)
    cur = conn.cursor()

    # Ensure columns exist
    try: cur.execute("ALTER TABLE charts ADD COLUMN saved_at TEXT")
    except: pass
    try: cur.execute("ALTER TABLE charts ADD COLUMN updated_at TEXT")
    except: pass

    # 1. Fix NULLs, empty strings, dashes, or "None" text
    query = """
        UPDATE charts 
        SET saved_at = ? 
        WHERE saved_at IS NULL 
           OR saved_at = '' 
           OR saved_at = '-' 
           OR saved_at = 'None'
    """
    cur.execute(query, (now,))
    rows_affected = cur.rowcount

    # 2. Sync updated_at with saved_at
    cur.execute("UPDATE charts SET updated_at = saved_at WHERE updated_at IS NULL OR updated_at = ''")

    conn.commit()
    conn.close()

    return {"status": "ok", "message": f"Fixed {rows_affected} records successfully!"}


# ================================================================
# 🚀 Run the Flask app
# ================================================================
if __name__ == "__main__":
    app.run(debug=True)

