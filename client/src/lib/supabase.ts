import { createClient } from '@supabase/supabase-js';

// Using the credentials directly for now - in production these would come from environment variables
const supabaseUrl = 'https://zjpswiomhhpvfphrlshy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcHN3aW9taGhwdmZwaHJsc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTk2OTUsImV4cCI6MjA2Nzg3NTY5NX0.d0dNY1fe5E_MRH7igngAdMqQzJfH8LDutYfGxBeskaE';

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