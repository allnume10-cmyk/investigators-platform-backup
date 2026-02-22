import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable resolver.
 * Handles Vite (Vercel) and standard Node/AI Studio environments safely.
 */
const getEnv = (key: string): string | undefined => {
  try {
    // Cast import.meta to any to resolve TS errors regarding the 'env' property when Vite types are not present
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env) {
      const viteKey = `VITE_${key}`;
      if (meta.env[viteKey]) return meta.env[viteKey];
      if (meta.env[key]) return meta.env[key];
    }
  } catch (e) {}

  try {
    // Check for Node/AI Studio environment
    if (typeof process !== 'undefined' && process.env) {
      const viteKey = `VITE_${key}`;
      if (process.env[viteKey]) return process.env[viteKey];
      if (process.env[key]) return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

// No hardcoded fallbacks: production must set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. in .env.local or Vercel env).'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
