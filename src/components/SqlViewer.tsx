import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Check, Copy, Terminal, ExternalLink } from 'lucide-react'

export const SqlViewer: React.FC = () => {
  const [copied, setCopied] = useState(false)

  const sqlCode = `-- ====================================================================
-- CITY HOSPITAL MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA & SEED DATA
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ====================================================================

DROP TABLE IF EXISTS ambulances CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

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

CREATE TABLE ambulances (
    id TEXT PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('idle', 'enroute', 'occupied')),
    assigned_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for Hackathon Demo
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on hospitals for demo"
    ON hospitals FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on ambulances for demo"
    ON ambulances FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime Publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE hospitals, ambulances;
COMMIT;

-- Seed Sample Data
INSERT INTO hospitals (id, name, lat, lng, total_beds, occupied_beds, icu_beds, icu_occupied, specialties, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'City Central Trauma Center', 40.7128, -74.0060, 250, 228, 45, 42, ARRAY['Trauma Level 1', 'Cardiology', 'Neurosurgery', 'ER'], 'operational'),
    ('22222222-2222-2222-2222-222222222222', 'St. Jude General Hospital', 40.7306, -73.9352, 180, 126, 30, 18, ARRAY['General Emergency', 'Pediatrics', 'Orthopedics'], 'operational'),
    ('33333333-3333-3333-3333-333333333333', 'Metropolitan Heart & Vascular Institute', 40.7589, -73.9851, 140, 132, 35, 33, ARRAY['Cardiology', 'Vascular Surgery', 'ICU'], 'busy'),
    ('44444444-4444-4444-4444-444444444444', 'Northwest Children & Maternity Hospital', 40.7829, -73.9654, 120, 72, 20, 8, ARRAY['Pediatrics', 'Obstetrics', 'Neonatal ICU'], 'operational'),
    ('55555555-5555-5555-5555-555555555555', 'Eastside Community Emergency Clinic', 40.7282, -73.9799, 90, 87, 15, 14, ARRAY['Urgent Care', 'General ER'], 'critical'),
    ('66666666-6666-6666-6666-666666666666', 'West Park Medical Center', 40.7648, -73.9808, 200, 140, 35, 22, ARRAY['Oncology', 'Neurology', 'General Surgery'], 'operational'),
    ('77777777-7777-7777-7777-777777777777', 'Apex Surgical Institute', 40.7484, -73.9857, 80, 45, 10, 3, ARRAY['Orthopedic Surgery', 'Outpatient Care'], 'operational');

INSERT INTO ambulances (id, lat, lng, status, assigned_hospital_id) VALUES
    ('AMB-101', 40.7180, -74.0010, 'occupied', '11111111-1111-1111-1111-111111111111'),
    ('AMB-102', 40.7350, -73.9400, 'enroute', '22222222-2222-2222-2222-222222222222'),
    ('AMB-103', 40.7600, -73.9750, 'idle', NULL),
    ('AMB-104', 40.7250, -73.9820, 'occupied', '55555555-5555-5555-5555-555555555555');`

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="max-w-4xl mx-auto rounded-[2.5rem] p-4 bg-white border-slate-100 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900">
              schema.sql (Supabase Setup Script)
            </CardTitle>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Copy & run this script in your Supabase SQL Editor
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="h-10 px-4 rounded-2xl text-xs font-extrabold border-slate-200 text-slate-700 hover:bg-slate-50 space-x-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600">Copied SQL!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-slate-400" />
              <span>Copy SQL Script</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            Need help? Paste this SQL script into your{' '}
            <a
              href="https://app.supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-extrabold underline inline-flex items-center gap-1"
            >
              Supabase SQL Editor <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
        <pre className="p-5 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[450px] select-all border border-slate-800 shadow-inner">
          {sqlCode}
        </pre>
      </CardContent>
    </Card>
  )
}
