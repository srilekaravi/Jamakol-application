# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import sqlite3, swisseph as swe
from datetime import datetime
from app_stable_backup import calc_full_table  # ✅ uses your verified calc with Maandhi, Lagna, etc.

app = Flask(__name__)

DB_PATH = "charts.db"
PLACES_DB = "places.db"


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
        data = request.get_json()
        year, month, day = int(data["year"]), int(data["month"]), int(data["day"])
        hour, minute, second = int(data["hour"]), int(data["minute"]), int(data.get("second", 0))
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

        # Return
        return jsonify({"status": "ok", "rows": rows, "html": html})

    except Exception as e:
        print("❌ Error generating chart:", e)
        return jsonify({"status": "error", "message": str(e)})





# -------------------- SAVE / LOAD CHART --------------------
@app.route("/save_chart", methods=["POST"])
def save_chart():
    import json, sqlite3

    data = request.get_json()
    try:
        conn = sqlite3.connect("charts.db")
        cur = conn.cursor()

        # Ensure the table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS charts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                date TEXT,
                time TEXT,
                ayanamsa TEXT,
                chartType TEXT,
                gender TEXT,
                tag TEXT,
                comment TEXT,
                place_json TEXT,
                data_json TEXT
            )
        """)

        cur.execute("""
            INSERT INTO charts (name, date, time, ayanamsa, chartType, gender, tag, comment, place_json, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("name", ""),
            data.get("date", ""),
            data.get("time", ""),
            data.get("ayanamsa", ""),
            data.get("chartType", ""),
            data.get("gender", ""),
            data.get("tag", ""),
            data.get("comment", ""),
            json.dumps(data.get("place_json", {}), ensure_ascii=False),
            json.dumps(data.get("data_json", {}), ensure_ascii=False)
        ))

        conn.commit()
        conn.close()
        return jsonify({"status": "ok", "message": "Chart saved successfully."})
    except Exception as e:
        print("❌ save_chart error:", e)
        return jsonify({"status": "error", "message": str(e)})

# -------------------- LIST CHARTS --------------------
@app.route("/list_charts")
def list_charts():
    import sqlite3, json

    try:
        conn = sqlite3.connect("charts.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                id,
                name,
                date,
                time,
                ayanamsa,
                chartType,
                gender,
                tag,
                comment,
                place_json,
                data_json
            FROM charts
            ORDER BY id DESC
        """)
        rows = cur.fetchall()
        conn.close()

        charts = []
        for r in rows:
            charts.append({
                "id": r["id"],
                "name": r["name"],
                "date": r["date"],
                "time": r["time"],
                "ayanamsa": r["ayanamsa"],
                "chartType": r["chartType"],
                "gender": r["gender"],
                "tag": r["tag"],
                "comment": r["comment"],
                "place_json": json.loads(r["place_json"]) if r["place_json"] else {},
                "data_json": json.loads(r["data_json"]) if r["data_json"] else {}
            })

        return {"status": "ok", "charts": charts}

    except Exception as e:
        print("❌ list_charts error:", e)
        return {"status": "error", "message": str(e)}




@app.route("/get_chart/<int:cid>")
def get_chart(cid):
    import sqlite3, json

    try:
        conn = sqlite3.connect("charts.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM charts WHERE id=?", (cid,))
        r = cur.fetchone()
        conn.close()

        if not r:
            return {"status": "error", "message": "Chart not found"}

        chart = {
            "id": r["id"],
            "name": r["name"],
            "date": r["date"],
            "time": r["time"],
            "ayanamsa": r["ayanamsa"],
            "chartType": r["chartType"],
            "gender": r["gender"],
            "tag": r["tag"],
            "comment": r["comment"],
            "place_json": json.loads(r["place_json"]) if r["place_json"] else {},
            "data_json": json.loads(r["data_json"]) if r["data_json"] else {}
        }

        return {"status": "ok", "chart": chart}

    except Exception as e:
        print("❌ get_chart error:", e)
        return {"status": "error", "message": str(e)}





@app.route("/update_chart_full", methods=["POST"])
def update_chart_full():
    data = request.json
    cid = data.get("id")
    if not cid:
        return jsonify({"status": "error", "message": "No chart ID provided"})

    conn = sqlite3.connect("charts.db")
    cur = conn.cursor()

    cur.execute("""
        UPDATE charts
        SET name=?, date=?, time=?, gender=?, tag=?, comment=?, place_json=?, data_json=?, ayanamsa=?, chartType=?
        WHERE id=?
    """, (
        data.get("name"),
        data.get("date"),
        data.get("time"),
        data.get("gender"),
        data.get("tag"),
        data.get("comment"),
        json.dumps(data.get("place_json", {}), ensure_ascii=False),
        json.dumps(data.get("data_json", {}), ensure_ascii=False),
        data.get("ayanamsa"),
        data.get("chartType"),
        cid
    ))

    conn.commit()
    conn.close()
    return jsonify({"status": "ok", "message": "Chart updated"})



@app.route("/delete_chart/<int:cid>", methods=["POST"])
def delete_chart(cid):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM charts WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# -------------------- PLACES --------------------
@app.route("/list_places")
def list_places():
    conn = sqlite3.connect("places.db")
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS places (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_ta TEXT, name_en TEXT,
            latitude REAL, longitude REAL, timezone REAL
        )
    """)
    cur.execute("SELECT id, name_ta, name_en, latitude, longitude, timezone FROM places ORDER BY name_en ASC")
    rows = [
        {
            "id": r[0],
            "city": r[1],       # Tamil city name shown
            "city_en": r[2],
            "country": "India",
            "lat": r[3],
            "lon": r[4],
            "tz": r[5]
        }
        for r in cur.fetchall()
    ]
    conn.close()
    return jsonify(rows)



if __name__ == "__main__":
    app.run(debug=True)
