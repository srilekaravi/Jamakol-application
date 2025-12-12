from flask import Blueprint, request, jsonify

timeline_bp = Blueprint("timeline", __name__)

timeline_data = []  # simple in-memory store

def add_timeline_entry(entry):
    timeline_data.append(entry)

def register_timeline_routes(app):
    @timeline_bp.route("/timeline", methods=["GET"])
    def get_timeline():
        return jsonify(timeline_data)

    @timeline_bp.route("/timeline", methods=["POST"])
    def add():
        data = request.json
        add_timeline_entry(data)
        return jsonify({"status": "ok"}), 201

    app.register_blueprint(timeline_bp)
