from flask import Blueprint, request, jsonify
import sqlite3

def register_timeline_routes(app, charts_db_path):
    timeline_bp = Blueprint("timeline", __name__)

    # ----- DB FUNCTIONS -----
    def add_timeline_entry(entry):
        conn = sqlite3.connect(charts_db_path)
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS timeline (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event TEXT,
                timestamp TEXT
            )
        """)

        cur.execute("INSERT INTO timeline (event, timestamp) VALUES (?, ?)",
                    (entry["event"], entry["timestamp"]))

        conn.commit()
        conn.close()
        return True

    # ----- ROUTES -----
    @timeline_bp.route("/timeline", methods=["GET"])
    def get_timeline():
        conn = sqlite3.connect(charts_db_path)
        cur = conn.cursor()

        cur.execute("SELECT id, event, timestamp FROM timeline ORDER BY id DESC")
        rows = cur.fetchall()
        conn.close()

        data = [{"id": r[0], "event": r[1], "timestamp": r[2]} for r in rows]
        return jsonify(data)

    @timeline_bp.route("/timeline", methods=["POST"])
    def add():
        data = request.json
        add_timeline_entry(data)
        return jsonify({"status": "ok"}), 201

    app.register_blueprint(timeline_bp)
    return app


# Export add_timeline_entry for external use
def add_timeline_entry(*args, **kwargs):
    pass  # optional external helper placeholder
