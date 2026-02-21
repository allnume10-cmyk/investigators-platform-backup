-- Add needs_intake to global_tasks for tasks created from Communication Hub (attorney email).
-- When true, task appears at top of list with "Complete intake" indicator.
ALTER TABLE public.global_tasks ADD COLUMN IF NOT EXISTS needs_intake boolean DEFAULT false;
