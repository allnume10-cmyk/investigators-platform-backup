-- Run in PRODUCTION Supabase: SQL Editor → New query → Paste & Run
-- Creates app_admin_users table so the RLS script can use it. Run this first, then run the INSERT.

CREATE TABLE IF NOT EXISTS public.app_admin_users (
  user_id uuid PRIMARY KEY
);

ALTER TABLE public.app_admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can check own admin status" ON public.app_admin_users;
CREATE POLICY "Users can check own admin status"
  ON public.app_admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Then run: INSERT INTO public.app_admin_users (user_id) VALUES ('c3db5705-635c-4099-a800-3bbdb6f1b9e3') ON CONFLICT (user_id) DO NOTHING;
