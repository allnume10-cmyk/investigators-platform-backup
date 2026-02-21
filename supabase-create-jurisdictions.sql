-- Run this in Supabase Dashboard → SQL Editor to enable the Jurisdiction dropdown on new cases.
-- Creates the table and inserts one row. Add more rows as you expand to other areas.

CREATE TABLE IF NOT EXISTS public.jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.jurisdictions
  FOR SELECT TO authenticated USING (true);

-- Insert your first jurisdiction (edit the name if you like)
INSERT INTO public.jurisdictions (id, name) VALUES (gen_random_uuid(), 'Default Area')
ON CONFLICT (name) DO NOTHING;
