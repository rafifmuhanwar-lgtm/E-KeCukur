import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('YOUR_')
);

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ Supabase credentials not detected or using placeholders. App running in offline/demo mode with Zustand fallback.'
  );
}

// Fallback to placeholder if env not set to prevent runtime crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
