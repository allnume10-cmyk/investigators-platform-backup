-- Run in Supabase: Dashboard → SQL Editor → New query → Paste & Run
-- Adds is_active to profiles so investigators can be marked inactive (e.g. when they opt out).
-- When is_active = false, the app shows a dedicated "Export my data" option in System Settings only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.is_active IS 'When false, investigator is inactive (e.g. opted out); app shows Export my data only for them.';
