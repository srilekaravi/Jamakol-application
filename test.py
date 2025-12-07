# -*- coding: utf-8 -*-
import sqlite3
import csv
import os

# ✅ CONFIGURATION
CSV_FILE = "india.csv"
DB_FILE = "places.db"  # <--- CHANGED FROM charts.db TO places.db
DEFAULT_TZ = 5.5

def import_data():
    if not os.path.exists(CSV_FILE):
        print(f"❌ Error: '{CSV_FILE}' not found.")
        return

    print(f"📂 Opening {CSV_FILE}...")
    print(f"🎯 Target Database: {DB_FILE}")

    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    # Ensure table exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS places (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_ta TEXT,
            name_en TEXT,
            latitude REAL,
            longitude REAL,
            timezone REAL
        )
    """)

    success_count = 0
    skip_count = 0

    # Open with utf-8-sig to handle BOM characters
    with open(CSV_FILE, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f)
        
        # Clean up headers (remove spaces)
        if reader.fieldnames:
            reader.fieldnames = [name.strip() for name in reader.fieldnames]
        
        print(f"📋 Columns found: {reader.fieldnames}")

        cur.execute("BEGIN TRANSACTION")

        for row in reader:
            try:
                # ✅ MAP EXACT COLUMN NAMES FROM YOUR FILE
                city = row.get('iPlace')
                lat = row.get('ilatitudeindia')
                lon = row.get('iLongitudeindia')
                tz = row.get('iTimeZone')

                # Use English name for Tamil name as fallback
                city_ta = city 

                if city and lat and lon:
                    cur.execute("""
                        INSERT INTO places (name_ta, name_en, latitude, longitude, timezone)
                        VALUES (?, ?, ?, ?, ?)
                    """, (city_ta, city, float(lat), float(lon), float(tz) if tz else DEFAULT_TZ))
                    success_count += 1
                else:
                    skip_count += 1
            except Exception as e:
                skip_count += 1

        cur.execute("COMMIT")

    conn.close()
    print(f"\n✅ Import Finished!")
    print(f"   - Imported: {success_count}")
    print(f"   - Skipped:  {skip_count}")
    print(f"   - Written to: {DB_FILE}")

if __name__ == "__main__":
    import_data()