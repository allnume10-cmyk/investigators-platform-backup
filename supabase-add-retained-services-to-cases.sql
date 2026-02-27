-- Run in Supabase Dashboard → SQL Editor.
-- Adds Retained Services flag to cases (outside referrals; amount paid set when case is marked Paid).

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS is_retained_services boolean NOT NULL DEFAULT false;
