-- ============================================================================
-- GeoData Hub - Schema Initialization with PostGIS
-- ============================================================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerations
CREATE TYPE data_source_status_enum AS ENUM ('ACTIVE', 'DEGRADED', 'NOT_CONFIGURED', 'DISABLED');
CREATE TYPE event_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE verification_status_enum AS ENUM ('CONFIRMED', 'OFFICIAL_WARNING', 'SYSTEM_INFERENCE', 'FORECAST');

-- ============================================================================
-- 3. Core Metadata & Sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    base_url TEXT,
    documentation_url TEXT,
    update_frequency_seconds INTEGER DEFAULT 300,
    status data_source_status_enum DEFAULT 'NOT_CONFIGURED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_source_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id VARCHAR(64) REFERENCES data_sources(id) ON DELETE CASCADE,
    status data_source_status_enum NOT NULL,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_success_at TIMESTAMPTZ,
    records_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    error_message TEXT,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_data_source_status_source ON data_source_status(source_id, last_attempt_at DESC);

-- ============================================================================
-- 4. Stations & Infrastructure
-- ============================================================================

CREATE TABLE IF NOT EXISTS weather_stations (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32),
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION,
    river_basin VARCHAR(128),
    region VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_stations_geom ON weather_stations USING GIST(location);

CREATE TABLE IF NOT EXISTS air_quality_stations (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    station_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(128),
    address TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    sensors_available TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_air_quality_stations_geom ON air_quality_stations USING GIST(location);

CREATE TABLE IF NOT EXISTS sensors (
    id VARCHAR(64) PRIMARY KEY,
    station_id VARCHAR(64),
    param_code VARCHAR(32) NOT NULL,
    param_name VARCHAR(128) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    sensor_type VARCHAR(64) DEFAULT 'public',
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Unified Geo Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS geo_events (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    category VARCHAR(64) NOT NULL, -- road, weather, air, hazard, hydrology
    event_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOMETRY(Geometry, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    severity event_severity_enum DEFAULT 'medium',
    verification_status verification_status_enum DEFAULT 'CONFIRMED',
    confidence DOUBLE PRECISION DEFAULT 1.0,
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    raw_payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_geo_events_geom ON geo_events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_geo_events_category ON geo_events(category);
CREATE INDEX IF NOT EXISTS idx_geo_events_observed ON geo_events(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_events_active ON geo_events(expires_at) WHERE expires_at > NOW();

-- ============================================================================
-- 6. Specialized Measurements & Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS road_events (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    road_number VARCHAR(32),
    voivodeship VARCHAR(64),
    event_type VARCHAR(64) NOT NULL, -- accident, roadworks, speed_camera, avg_speed_check, blockage
    speed_limit INTEGER,
    lanes_blocked VARCHAR(64),
    location GEOMETRY(Geometry, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    length_meters DOUBLE PRECISION,
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_road_events_geom ON road_events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_road_events_road ON road_events(road_number);

CREATE TABLE IF NOT EXISTS weather_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(64) REFERENCES weather_stations(id) ON DELETE CASCADE,
    temperature DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    precipitation DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_measurements_station ON weather_measurements(station_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_measurements_observed ON weather_measurements(observed_at DESC);

CREATE TABLE IF NOT EXISTS air_quality_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(64) REFERENCES air_quality_stations(id) ON DELETE CASCADE,
    pm10 DOUBLE PRECISION,
    pm25 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    c6h6 DOUBLE PRECISION,
    aqi_index_level VARCHAR(32),
    aqi_index_value INTEGER,
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_air_quality_measurements_station ON air_quality_measurements(station_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_air_quality_measurements_observed ON air_quality_measurements(observed_at DESC);

CREATE TABLE IF NOT EXISTS warnings (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    warning_type VARCHAR(64) NOT NULL, -- meteorological, hydrological, rcb, civil
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    polygon GEOMETRY(Geometry, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_warnings_geom ON warnings USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_warnings_valid ON warnings(valid_from, valid_until);

CREATE TABLE IF NOT EXISTS hydrology_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(64) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    river_name VARCHAR(128) NOT NULL,
    water_level_cm INTEGER,
    warning_level_cm INTEGER,
    alarm_level_cm INTEGER,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hydrology_geom ON hydrology_measurements USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hydrology_observed ON hydrology_measurements(observed_at DESC);

CREATE TABLE IF NOT EXISTS transport_stops (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64),
    city VARCHAR(128),
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    lines TEXT[] DEFAULT '{}',
    wheelchair_accessible BOOLEAN,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_stops_geom ON transport_stops USING GIST(location);

CREATE TABLE IF NOT EXISTS transport_routes (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    line_number VARCHAR(32) NOT NULL,
    route_type VARCHAR(32) NOT NULL, -- bus, tram, train, metro
    route_geometry GEOMETRY(Geometry, 4326),
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geographic_objects (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES data_sources(id),
    category VARCHAR(64) NOT NULL, -- border, river, forest, acoustic_zone, flood_risk
    name VARCHAR(255) NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geographic_objects_geom ON geographic_objects USING GIST(geometry);

-- ============================================================================
-- 7. Diagnostic & User preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id VARCHAR(64) REFERENCES data_sources(id),
    status VARCHAR(32) NOT NULL,
    message TEXT,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    theme VARCHAR(16) DEFAULT 'dark',
    default_layers TEXT[] DEFAULT ARRAY['road_events', 'warnings', 'air_quality'],
    default_center_lat DOUBLE PRECISION DEFAULT 52.0693,
    default_center_lng DOUBLE PRECISION DEFAULT 19.4803,
    default_zoom INTEGER DEFAULT 6,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(128) NOT NULL,
    categories TEXT[] NOT NULL,
    center_point GEOMETRY(Point, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL,
    min_severity event_severity_enum DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_center ON user_alerts USING GIST(center_point);

-- ============================================================================
-- 8. Data Retention Policy (Procedure & Cron friendly)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_expired_geodata(days_retention INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    tmp_count INTEGER := 0;
BEGIN
    -- 1. Purge expired geo_events
    DELETE FROM geo_events WHERE expires_at < NOW() - (days_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS tmp_count = ROW_COUNT;
    deleted_count := deleted_count + tmp_count;

    -- 2. Purge old road events
    DELETE FROM road_events WHERE expires_at < NOW() - (days_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS tmp_count = ROW_COUNT;
    deleted_count := deleted_count + tmp_count;

    -- 3. Purge raw measurements older than 30 days
    DELETE FROM weather_measurements WHERE observed_at < NOW() - INTERVAL '30 days';
    DELETE FROM air_quality_measurements WHERE observed_at < NOW() - INTERVAL '30 days';
    DELETE FROM hydrology_measurements WHERE observed_at < NOW() - INTERVAL '30 days';

    -- 4. Purge old sync logs older than 14 days
    DELETE FROM sync_logs WHERE created_at < NOW() - INTERVAL '14 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_quality_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_quality_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Public read-only policies for map display
CREATE POLICY "Public read data_sources" ON data_sources FOR SELECT USING (true);
CREATE POLICY "Public read geo_events" ON geo_events FOR SELECT USING (true);
CREATE POLICY "Public read road_events" ON road_events FOR SELECT USING (true);
CREATE POLICY "Public read weather_measurements" ON weather_measurements FOR SELECT USING (true);
CREATE POLICY "Public read air_quality_measurements" ON air_quality_measurements FOR SELECT USING (true);
CREATE POLICY "Public read warnings" ON warnings FOR SELECT USING (true);
CREATE POLICY "Public read weather_stations" ON weather_stations FOR SELECT USING (true);
CREATE POLICY "Public read air_quality_stations" ON air_quality_stations FOR SELECT USING (true);

-- User specific policies
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own alerts" ON user_alerts
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 10. Seed Initial Data Sources
-- ============================================================================

INSERT INTO data_sources (id, name, category, status, update_frequency_seconds, metadata) VALUES
('imgw_synop', 'IMGW PIB - Stacje Synoptyczne', 'weather', 'ACTIVE', 3600, '{"api_type": "REST_JSON", "endpoint": "https://danepubliczne.imgw.pl/api/data/synop"}'::jsonb),
('imgw_hydro', 'IMGW PIB - Pomiary Hydrologiczne', 'hydrology', 'ACTIVE', 3600, '{"api_type": "REST_JSON", "endpoint": "https://danepubliczne.imgw.pl/api/data/hydro"}'::jsonb),
('imgw_warnings', 'IMGW PIB - Ostrzeżenia Meteo/Hydro', 'warnings', 'ACTIVE', 1800, '{"api_type": "CAP_XML_JSON"}'::jsonb),
('gios_air', 'GIOŚ - Jakość Powietrza (Portal Jakości Powietrza)', 'environment', 'ACTIVE', 3600, '{"api_type": "REST_JSON", "endpoint": "https://api.gios.gov.pl/pjp-api/rest"}'::jsonb),
('openmeteo', 'Open-Meteo Weather Forecast', 'weather', 'ACTIVE', 3600, '{"api_type": "REST_JSON", "endpoint": "https://api.open-meteo.com/v1/forecast"}'::jsonb),
('osm_overpass', 'OpenStreetMap / Overpass - Fotoradary i OPP', 'roads', 'ACTIVE', 86400, '{"api_type": "OVERPASS_QL"}'::jsonb),
('gddkia_kpd', 'Krajowy Punkt Dostępowy / GDDKiA (Datex II)', 'roads', 'NOT_CONFIGURED', 300, '{"api_type": "DATEX_II", "note": "Wymaga dedykowanego klucza/rejestracji KPD"}'::jsonb),
('rcb_alerts', 'Rządowe Centrum Bezpieczeństwa - Alerty RCB', 'alerts', 'ACTIVE', 600, '{"api_type": "RSS_JSON"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

