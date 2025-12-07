# -*- coding: utf-8 -*-
# create_places_db.py — Tamil Nadu places database for astrology app

import sqlite3

# === Database name ===
DB_PATH = "places.db"

# === List of key Tamil Nadu cities ===
places = [
    # name_ta, name_en, latitude, longitude, timezone (IST +5.5)
    ("சென்னை", "Chennai", 13.0827, 80.2707, 5.5),
    ("கோயம்புத்தூர்", "Coimbatore", 11.0168, 76.9558, 5.5),
    ("மதுரை", "Madurai", 9.9252, 78.1198, 5.5),
    ("திருச்சி", "Tiruchirappalli", 10.7905, 78.7047, 5.5),
    ("சேலம்", "Salem", 11.6643, 78.1460, 5.5),
    ("திருநெல்வேலி", "Tirunelveli", 8.7139, 77.7567, 5.5),
    ("ஈரோடு", "Erode", 11.3410, 77.7172, 5.5),
    ("வெள்ளூர்", "Vellore", 12.9165, 79.1325, 5.5),
    ("தஞ்சாவூர்", "Thanjavur", 10.7870, 79.1378, 5.5),
    ("தூத்துக்குடி", "Thoothukudi", 8.7642, 78.1348, 5.5),
    ("நாகப்பட்டினம்", "Nagapattinam", 10.7654, 79.8424, 5.5),
    ("நாமக்கல்", "Namakkal", 11.2184, 78.1677, 5.5),
    ("கரூர்", "Karur", 10.9601, 78.0766, 5.5),
    ("புதுக்கோட்டை", "Pudukkottai", 10.3797, 78.8208, 5.5),
    ("கன்னியாகுமரி", "Kanyakumari", 8.0883, 77.5385, 5.5),
    ("திருப்பூர்", "Tiruppur", 11.1085, 77.3411, 5.5),
    ("கடலூர்", "Cuddalore", 11.7480, 79.7714, 5.5),
    ("திருவண்ணாமலை", "Tiruvannamalai", 12.2266, 79.0747, 5.5),
    ("விழுப்புரம்", "Viluppuram", 11.9395, 79.4861, 5.5),
    ("பெரம்பலூர்", "Perambalur", 11.2332, 78.8800, 5.5),
    ("தர்மபுரி", "Dharmapuri", 12.1357, 78.1582, 5.5),
    ("நீலகிரி", "Nilgiris (Ooty)", 11.4064, 76.6932, 5.5),
    ("கன்னியாகுமரி", "Nagercoil", 8.1750, 77.4300, 5.5),
    ("திருவாரூர்", "Tiruvarur", 10.7720, 79.6389, 5.5),
    ("காஞ்சிபுரம்", "Kanchipuram", 12.8372, 79.7000, 5.5),
    ("வேலூர்", "Vaniyambadi", 12.6870, 78.6200, 5.5),
    ("சிவகங்கை", "Sivaganga", 9.8473, 78.4806, 5.5),
    ("ராமநாதபுரம்", "Ramanathapuram", 9.3639, 78.8308, 5.5),
    ("திண்டுக்கல்", "Dindigul", 10.3673, 77.9803, 5.5),
    ("விருதுநகர்", "Virudhunagar", 9.5851, 77.9579, 5.5),
    ("கோவை", "Pollachi", 10.6620, 77.0100, 5.5),
    ("மாணார்குடி", "Mannargudi", 10.6670, 79.4500, 5.5),
    ("சேங்கோட்டை", "Shenkottai", 8.9800, 77.2500, 5.5),
    ("அரியலூர்", "Ariyalur", 11.1333, 79.0833, 5.5),
    ("உதகமண்டலம்", "Udhagamandalam", 11.4064, 76.6932, 5.5)
]

# === Create DB ===
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS places")
cur.execute("""
CREATE TABLE places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ta TEXT,
    name_en TEXT,
    latitude REAL,
    longitude REAL,
    timezone REAL
)
""")

cur.executemany(
    "INSERT INTO places (name_ta, name_en, latitude, longitude, timezone) VALUES (?, ?, ?, ?, ?)",
    places
)

conn.commit()
conn.close()

print(f"✅ Tamil Nadu place database created successfully with {len(places)} entries → {DB_PATH}")
