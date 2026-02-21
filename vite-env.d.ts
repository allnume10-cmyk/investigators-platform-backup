/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  /** Set to "true" to call Gemini via Supabase Edge Function (key stays server-side) */
  readonly VITE_USE_GEMINI_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
