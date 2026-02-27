-- Run in PRODUCTION Supabase: Dashboard → SQL Editor → New query → Paste & Run
-- Avoids recursion: "admin" check uses a separate table (app_admin_users), never reads profiles.

-- 1) Table of admin user ids (no RLS recursion when policies check this)
CREATE TABLE IF NOT EXISTS public.app_admin_users (
  user_id uuid PRIMARY KEY
);
ALTER TABLE public.app_admin_users ENABLE ROW LEVEL SECURITY;
-- Only allow users to check "am I in this list" (no one can list all admins via this table)
CREATE POLICY "Users can check own admin status"
  ON public.app_admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) Add your admin user here (run after: Auth → Users → copy admin's "User UID")
-- INSERT INTO public.app_admin_users (user_id) VALUES ('PASTE_ADMIN_UID_HERE') ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cases: read all for authenticated
DROP POLICY IF EXISTS "Allow admin read all cases" ON public.cases;
DROP POLICY IF EXISTS "Allow investigator read assigned cases" ON public.cases;
DROP POLICY IF EXISTS "Allow read cases for admin or assigned" ON public.cases;
DROP POLICY IF EXISTS "Allow authenticated read cases" ON public.cases;
CREATE POLICY "Allow authenticated read cases"
  ON public.cases FOR SELECT TO authenticated
  USING (true);

-- Cases: update for assigned investigator OR user listed in app_admin_users
DROP POLICY IF EXISTS "Allow admin or assigned update cases" ON public.cases;
DROP POLICY IF EXISTS "Allow authenticated update cases" ON public.cases;
CREATE POLICY "Allow admin or assigned update cases"
  ON public.cases FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admin_users a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.app_admin_users a WHERE a.user_id = auth.uid())
  );

-- Cases: insert for any authenticated
DROP POLICY IF EXISTS "Allow admin or assigned insert cases" ON public.cases;
DROP POLICY IF EXISTS "Allow authenticated insert cases" ON public.cases;
CREATE POLICY "Allow authenticated insert cases"
  ON public.cases FOR INSERT TO authenticated
  WITH CHECK (true);

-- Profiles: read own row; users in app_admin_users can read all (no read of profiles = no recursion)
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read all profiles" ON public.profiles;
CREATE POLICY "Allow read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Allow admin read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admin_users a WHERE a.user_id = auth.uid()));

-- 3) After running this script: add your admin's User UID to app_admin_users:
--    Auth → Users → open admin user → copy "User UID"
--    Then run: INSERT INTO public.app_admin_users (user_id) VALUES ('paste-uid-here') ON CONFLICT (user_id) DO NOTHING;
