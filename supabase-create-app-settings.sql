-- Run this in Supabase Dashboard → SQL Editor → New query → Paste & Run
-- Fix: relation "public.app_settings" does not exist
-- A trigger in your DB expects this table. This creates a minimal version.
-- If you get a different error (e.g. column X does not exist), the trigger
-- may expect other columns—share the error and we can adjust.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allow authenticated users to read (adjust RLS as needed for your project)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated" ON public.app_settings
  FOR UPDATE TO authenticated USING (true);
