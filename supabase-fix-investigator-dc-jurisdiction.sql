-- Run in Supabase Dashboard → SQL Editor.
-- Restores DC Jurisdiction for investigators who have no rows in profile_jurisdictions
-- (e.g. their profiles.jurisdiction_id was never set, so the many-to-many backfill skipped them).
-- Cases are unchanged in the DB; this only restores what the investigator can see and use.

-- Give every investigator at least DC Jurisdiction if they have no profile_jurisdictions rows
INSERT INTO public.profile_jurisdictions (user_id, jurisdiction_id)
SELECT p.user_id, (SELECT id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1)
FROM public.profiles p
WHERE (p.role::text ILIKE 'investigator')
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_jurisdictions pj WHERE pj.user_id = p.user_id
  )
  AND EXISTS (SELECT 1 FROM public.jurisdictions WHERE name = 'DC Jurisdiction');
