-- Run in Supabase → SQL Editor.
-- This lets the global_admin read all profiles (so "Assigned Investigator" dropdown shows all investigators).
-- If app_admin_users doesn't exist, run supabase-rls-allow-admin-read-cases.sql first.
-- 1) In Supabase: Auth → Users → open the global_admin user → copy "User UID".
-- 2) Replace the placeholder below with that UUID, then run.

INSERT INTO public.app_admin_users (user_id)
VALUES ('PASTE_GLOBAL_ADMIN_USER_UID_HERE')
ON CONFLICT (user_id) DO NOTHING;
