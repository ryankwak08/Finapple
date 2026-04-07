import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingPublicEnvKeys = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean);

if (missingPublicEnvKeys.length > 0) {
  throw new Error(`Missing required public env: ${missingPublicEnvKeys.join(', ')}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
