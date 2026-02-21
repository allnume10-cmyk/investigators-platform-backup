-- Run this in Supabase Dashboard → SQL Editor → New query → Paste & Run
-- Fix: "invalid input value for enum user_role: global_admin"
-- Adds 'global_admin' to the user_role enum so profiles and triggers can use it.
-- Run once. If you get "already exists", the fix is already applied.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'global_admin';
