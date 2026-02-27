-- Run in Supabase Dashboard → SQL Editor (dev first, then production when ready).
-- 1) Rename "Jurisdiction 1" or "Default Area" to "DC Jurisdiction"
-- 2) Assign all cases to DC Jurisdiction
-- 3) Add jurisdiction_id to profiles so each investigator has one jurisdiction (admin assigns it when adding investigator).

-- Step 1: Get exactly one "DC Jurisdiction" (idempotent — safe to run multiple times).
-- You may have both "Jurisdiction 1" and "Default Area"; we rename only ONE to avoid duplicate key.
UPDATE public.jurisdictions
SET name = 'DC Jurisdiction'
WHERE id = (
  SELECT id FROM public.jurisdictions
  WHERE name IN ('Jurisdiction 1', 'Default Area')
  ORDER BY name
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.jurisdictions WHERE name = 'DC Jurisdiction');

-- If you had no matching row (or table was empty), create DC Jurisdiction:
INSERT INTO public.jurisdictions (id, name)
SELECT gen_random_uuid(), 'DC Jurisdiction'
WHERE NOT EXISTS (SELECT 1 FROM public.jurisdictions WHERE name = 'DC Jurisdiction');

-- Optional: remove the other old row so only DC Jurisdiction remains (run in Table Editor or uncomment):
-- DELETE FROM public.jurisdictions WHERE name IN ('Jurisdiction 1', 'Default Area');

-- Step 2: Assign all cases to DC Jurisdiction
UPDATE public.cases
SET jurisdiction_id = (SELECT id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1)
WHERE jurisdiction_id IS NULL OR jurisdiction_id != (SELECT id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1);

-- Step 3: Add jurisdiction_id to profiles (so each investigator can be assigned one jurisdiction)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS jurisdiction_id uuid;

-- Optional: set existing investigators to DC Jurisdiction (run after you have DC Jurisdiction)
-- UPDATE public.profiles SET jurisdiction_id = (SELECT id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1) WHERE role = 'investigator';

-- When does the admin assign a jurisdiction to a new investigator?
-- As soon as the investigator has a profile row. Steps:
-- 1) Create the user in Auth (or they sign up) and set password.
-- 2) In Table Editor → profiles: add a row with user_id = the new user's Auth UID, full_name, role = 'investigator'.
-- 3) Set jurisdiction_id = (SELECT id FROM jurisdictions WHERE name = 'DC Jurisdiction') for that profile row.
-- That is the point at which the investigator is "placed" in DC Jurisdiction; the app will then show only DC Jurisdiction and only cases assigned to them. You can do step 3 in Supabase Table Editor, or we can add an in-app "Team" / "Investigators" screen later for admins to set jurisdiction.
