-- places.db
CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ta TEXT,
  name_en TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timezone REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- charts.db (optional - used later to save charts)
CREATE TABLE IF NOT EXISTS charts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  date TEXT,
  time TEXT,
  place TEXT,
  ayanamsa TEXT,
  node_type TEXT,
  payload TEXT,   -- JSON string of computed positions & metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
