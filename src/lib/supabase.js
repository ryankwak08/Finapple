import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://eluwjbpgqnyoohtxrufd.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdXdqYnBncW55b29odHhydWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTEwNDcsImV4cCI6MjA5MDc2NzA0N30.7iAptNfLnsgZmfOv6izi5qOHUZr2E_sM3Me620gh2NY';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (
  (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) &&
  typeof window !== 'undefined'
) {
  console.warn(
    'Using fallback Supabase public credentials because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
