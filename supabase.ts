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

// Use env vars; fallback so app never gets empty URL/key (which causes blank screen).
const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://hezgzrgwuegovztqxsts.supabase.co';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlemd6cmd3dWVnb3Z6dHF4c3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjEyNTMsImV4cCI6MjA4MjU5NzI1M30.7Oph6m2BlYmpUTa465Ak2eu4I5VEKh6Amvkvjh6AG9s';

const usingFallback = !getEnv('SUPABASE_URL') || !getEnv('SUPABASE_ANON_KEY');
if (usingFallback) {
  console.warn(
    'Supabase: using fallback config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel for production.'
  );
}

// So we can see which backend the app is actually using (for debugging production data)
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0] || '';
if (typeof window !== 'undefined') {
  console.log('[Supabase backend]', supabaseHost, usingFallback ? '(fallback)' : '(env)');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseBackendHost = supabaseHost;
