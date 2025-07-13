import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables for security
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'cobuddy-auth',
    storage: window.localStorage,
    flowType: 'pkce',
    debug: true
  }
});