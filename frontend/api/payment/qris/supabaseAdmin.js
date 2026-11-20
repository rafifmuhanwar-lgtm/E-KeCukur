import { createClient } from '@supabase/supabase-js';

let supabaseAdmin;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const error = new Error('Supabase server credentials are not configured');
    error.code = 'SUPABASE_SERVER_CONFIG';
    throw error;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  return supabaseAdmin;
}

