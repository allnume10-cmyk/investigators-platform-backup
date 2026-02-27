-- Run in PRODUCTION Supabase: SQL Editor → New query → Paste & Run
-- Disables RLS on cases and profiles so there are no row-level restrictions.
-- Both you and the investigator can read/update everything. Revisit permissions later.

-- Cases: turn off RLS (no policies apply; table access follows normal grants)
ALTER TABLE public.cases DISABLE ROW LEVEL SECURITY;

-- Profiles: turn off RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Optional: disable on app_admin_users too (not needed for access; you can leave it if you like)
-- ALTER TABLE public.app_admin_users DISABLE ROW LEVEL SECURITY;
