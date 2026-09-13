-- ====================================================================
-- CITY HOSPITAL MANAGEMENT SYSTEM - JAIPUR REAL HOSPITALS & AMBULANCES
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ====================================================================

-- 1. DROP EXISTING TABLES IF RE-RUNNING
DROP TABLE IF EXISTS ambulances CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

-- 2. CREATE HOSPITALS TABLE
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    total_beds INTEGER NOT NULL DEFAULT 100,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    icu_beds INTEGER NOT NULL DEFAULT 20,
    icu_occupied INTEGER NOT NULL DEFAULT 0,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'operational',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE AMBULANCES TABLE
CREATE TABLE ambulances (
    id TEXT PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('idle', 'enroute', 'occupied')),
    assigned_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) - OPEN READ/WRITE FOR DEMO
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on hospitals for demo"
    ON hospitals FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read/write on ambulances for demo"
    ON ambulances FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. ENABLE REALTIME PUBLICATION FOR LIVE UPDATES
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE hospitals, ambulances;
COMMIT;

-- 6. JAIPUR REAL HOSPITALS SEED DATA
INSERT INTO hospitals (id, name, lat, lng, total_beds, occupied_beds, icu_beds, icu_occupied, specialties, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'SMS Hospital', 26.9124, 75.8070, 250, 228, 45, 42, ARRAY['Trauma', 'Cardiology', 'Oncology'], 'operational'),
    ('22222222-2222-2222-2222-222222222222', 'Fortis Escorts Hospital', 26.8656, 75.8080, 180, 135, 30, 21, ARRAY['Cardiology', 'Neurology', 'Orthopaedics', 'Oncology'], 'operational'),
    ('33333333-3333-3333-3333-333333333333', 'Narayana Multispeciality Hospital', 26.8100, 75.7970, 160, 148, 35, 33, ARRAY['Cardiology', 'Oncology', 'Gastroenterology', 'Transplants'], 'busy'),
    ('44444444-4444-4444-4444-444444444444', 'Manipal Hospital Jaipur', 26.8580, 75.8130, 140, 84, 25, 10, ARRAY['Multi-speciality', 'Critical Care'], 'operational'),
    ('55555555-5555-5555-5555-555555555555', 'JK Lone Hospital', 26.9130, 75.8060, 190, 182, 30, 28, ARRAY['Pediatrics', 'NICU', 'PICU'], 'critical'),
    ('66666666-6666-6666-6666-666666666666', 'Mahila Chikitsalaya', 26.9115, 75.8065, 150, 95, 20, 11, ARRAY['Obstetrics', 'Gynaecology', 'High-risk pregnancy'], 'operational'),
    ('77777777-7777-7777-7777-777777777777', 'Apex Hospital', 26.8590, 75.8140, 90, 42, 12, 3, ARRAY['General', 'Emergency Care'], 'operational');

-- 7. JAIPUR REAL ROAD AMBULANCES SEED DATA
INSERT INTO ambulances (id, lat, lng, status, assigned_hospital_id) VALUES
    ('AMB-101', 26.9080, 75.8050, 'occupied', '11111111-1111-1111-1111-111111111111'),
    ('AMB-102', 26.8620, 75.8090, 'enroute', '22222222-2222-2222-2222-222222222222'),
    ('AMB-103', 26.8560, 75.8120, 'idle', NULL),
    ('AMB-104', 26.8080, 75.7950, 'occupied', '33333333-3333-3333-3333-333333333333');
