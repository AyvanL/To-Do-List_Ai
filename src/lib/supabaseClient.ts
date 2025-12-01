import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

if (supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error('Supabase service-role keys (sb_secret_*) must never run in the browser. Use the anon public key instead.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
