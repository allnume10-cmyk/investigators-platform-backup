-- Add sidebar display fields to profiles (initials + agency name).
-- Run this in Supabase SQL Editor if you don't use Supabase CLI migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS initials text,
  ADD COLUMN IF NOT EXISTS agency_name text;

COMMENT ON COLUMN public.profiles.initials IS 'Display initials for sidebar badge (e.g. BI).';
COMMENT ON COLUMN public.profiles.agency_name IS 'Display agency/subtitle for sidebar (e.g. Brent''s Investigative Services, LLC).';
