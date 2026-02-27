-- Run in Supabase Dashboard → SQL Editor.
-- Lets investigators be assigned one or more jurisdictions. They only see and can add cases to those.

-- 1) Junction table: which jurisdictions each user (investigator) can access
CREATE TABLE IF NOT EXISTS public.profile_jurisdictions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdictions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, jurisdiction_id)
);

-- 2) RLS: users read their own rows; admins (app_admin_users) read/insert/delete all for management
ALTER TABLE public.profile_jurisdictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile_jurisdictions" ON public.profile_jurisdictions;
CREATE POLICY "Users read own profile_jurisdictions"
  ON public.profile_jurisdictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage profile_jurisdictions" ON public.profile_jurisdictions;
CREATE POLICY "Admin manage profile_jurisdictions"
  ON public.profile_jurisdictions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admin_users a WHERE a.user_id = auth.uid()));

-- 3) Backfill: copy current single jurisdiction from profiles into profile_jurisdictions
INSERT INTO public.profile_jurisdictions (user_id, jurisdiction_id)
SELECT p.user_id, p.jurisdiction_id
FROM public.profiles p
WHERE p.jurisdiction_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profile_jurisdictions pj WHERE pj.user_id = p.user_id AND pj.jurisdiction_id = p.jurisdiction_id);

-- 4) Ensure every investigator has at least one jurisdiction (DC) if they had none from step 3
INSERT INTO public.profile_jurisdictions (user_id, jurisdiction_id)
SELECT p.user_id, (SELECT id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1)
FROM public.profiles p
WHERE (p.role::text ILIKE 'investigator')
  AND NOT EXISTS (SELECT 1 FROM public.profile_jurisdictions pj WHERE pj.user_id = p.user_id)
  AND EXISTS (SELECT 1 FROM public.jurisdictions WHERE name = 'DC Jurisdiction');

-- How to assign jurisdictions to an investigator (admin):
-- In Table Editor → profile_jurisdictions, add rows: user_id = investigator's Auth UID, jurisdiction_id = jurisdiction UUID.
-- Or run SQL: INSERT INTO public.profile_jurisdictions (user_id, jurisdiction_id) VALUES ('investigator-uid', 'jurisdiction-id');
-- To assign DC Jurisdiction: INSERT INTO public.profile_jurisdictions (user_id, jurisdiction_id) SELECT 'investigator-uid', id FROM public.jurisdictions WHERE name = 'DC Jurisdiction' LIMIT 1;
