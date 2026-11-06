-- Add detailed hospital resource tracking to an existing Supabase database.
-- This migration is additive and does not drop existing tables or records.

ALTER TABLE hospitals
    ADD COLUMN IF NOT EXISTS icu_beds_total INTEGER,
    ADD COLUMN IF NOT EXISTS icu_beds_available INTEGER,
    ADD COLUMN IF NOT EXISTS ventilators_available INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS oxygen_status TEXT NOT NULL DEFAULT 'critical',
    ADD COLUMN IF NOT EXISTS blood_types_available TEXT[] NOT NULL DEFAULT '{}';

UPDATE hospitals
SET
    icu_beds_total = COALESCE(icu_beds_total, icu_beds, 0),
    icu_beds_available = COALESCE(
        icu_beds_available,
        GREATEST(0, COALESCE(icu_beds, 0) - COALESCE(icu_occupied, 0))
    );

ALTER TABLE hospitals
    ALTER COLUMN icu_beds_total SET DEFAULT 0,
    ALTER COLUMN icu_beds_total SET NOT NULL,
    ALTER COLUMN icu_beds_available SET DEFAULT 0,
    ALTER COLUMN icu_beds_available SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'hospitals_oxygen_status_check'
          AND conrelid = 'hospitals'::regclass
    ) THEN
        ALTER TABLE hospitals
            ADD CONSTRAINT hospitals_oxygen_status_check
            CHECK (oxygen_status IN ('sufficient', 'low', 'critical'));
    END IF;
END
$$;
