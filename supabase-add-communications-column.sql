-- Run this in Supabase Dashboard → SQL Editor if your cases table doesn't have a communications column yet.
-- Required for the Case Jacket Communication tab to persist.

ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS communications jsonb DEFAULT '[]'::jsonb;
