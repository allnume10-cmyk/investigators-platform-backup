-- Run this in Supabase Dashboard → SQL Editor → New query → Paste & Run
-- Adds attorney column to global_tasks so the app can save/load attorney name.
-- Run ONE of the two lines below. If your table uses camelCase (like "caseNumber"),
-- use the first. If your table uses snake_case (like case_number), use the second,
-- then we'll update the app to use attorney_name.

ALTER TABLE public.global_tasks ADD COLUMN IF NOT EXISTS "attorneyName" text DEFAULT '';

-- If the first fails or tasks still break, run this instead and tell us you use snake_case:
-- ALTER TABLE public.global_tasks ADD COLUMN IF NOT EXISTS attorney_name text DEFAULT '';
