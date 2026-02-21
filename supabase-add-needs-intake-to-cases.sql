-- Add needs_intake to cases for matters created from Communication Hub.
-- When true, case appears highlighted in Master Registry with "Complete intake" and user can finish intake details.
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS needs_intake boolean DEFAULT false;
