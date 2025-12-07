CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT,
    state TEXT,
    country TEXT,
    lat REAL,
    lon REAL,
    tz REAL
);

INSERT INTO places (city, state, country, lat, lon, tz) VALUES
-- 🇮🇳 India
('Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, 5.5),
('Mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, 5.5),
('Delhi', 'Delhi', 'India', 28.6139, 77.2090, 5.5),
('Kolkata', 'West Bengal', 'India', 22.5726, 88.3639, 5.5),
('Bangalore', 'Karnataka', 'India', 12.9716, 77.5946, 5.5),
('Hyderabad', 'Telangana', 'India', 17.3850, 78.4867, 5.5),
('Trivandrum', 'Kerala', 'India', 8.5241, 76.9366, 5.5),

-- 🇺🇸 United States
('New York', 'New York', 'USA', 40.7128, -74.0060, -5.0),
('Los Angeles', 'California', 'USA', 34.0522, -118.2437, -8.0),
('Chicago', 'Illinois', 'USA', 41.8781, -87.6298, -6.0),
('Houston', 'Texas', 'USA', 29.7604, -95.3698, -6.0),
('San Francisco', 'California', 'USA', 37.7749, -122.4194, -8.0),

-- 🇬🇧 United Kingdom
('London', '', 'United Kingdom', 51.5074, -0.1278, 0.0),
('Manchester', '', 'United Kingdom', 53.4808, -2.2426, 0.0),

-- 🇫🇷 France
('Paris', '', 'France', 48.8566, 2.3522, 1.0),
('Marseille', '', 'France', 43.2965, 5.3698, 1.0),

-- 🇩🇪 Germany
('Berlin', '', 'Germany', 52.5200, 13.4050, 1.0),
('Munich', '', 'Germany', 48.1351, 11.5820, 1.0),

-- 🇦🇺 Australia
('Sydney', 'New South Wales', 'Australia', -33.8688, 151.2093, 10.0),
('Melbourne', 'Victoria', 'Australia', -37.8136, 144.9631, 10.0),

-- 🇨🇦 Canada
('Toronto', 'Ontario', 'Canada', 43.651070, -79.347015, -5.0),
('Vancouver', 'British Columbia', 'Canada', 49.2827, -123.1207, -8.0),

-- 🇸🇬 Singapore
('Singapore', '', 'Singapore', 1.3521, 103.8198, 8.0),

-- 🇯🇵 Japan
('Tokyo', '', 'Japan', 35.6762, 139.6503, 9.0),
('Osaka', '', 'Japan', 34.6937, 135.5023, 9.0),

-- 🇸🇦 Saudi Arabia
('Riyadh', '', 'Saudi Arabia', 24.7136, 46.6753, 3.0),

-- 🇧🇷 Brazil
('São Paulo', '', 'Brazil', -23.5505, -46.6333, -3.0),
('Rio de Janeiro', '', 'Brazil', -22.9068, -43.1729, -3.0),

-- 🇷🇺 Russia
('Moscow', '', 'Russia', 55.7558, 37.6173, 3.0),

-- 🇨🇳 China
('Beijing', '', 'China', 39.9042, 116.4074, 8.0),
('Shanghai', '', 'China', 31.2304, 121.4737, 8.0),

-- 🇦🇪 UAE
('Dubai', '', 'United Arab Emirates', 25.276987, 55.296249, 4.0),

-- 🇿🇦 South Africa
('Cape Town', '', 'South Africa', -33.9249, 18.4241, 2.0);

