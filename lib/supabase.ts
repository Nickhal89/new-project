import 'server-only';
import { createClient } from '@supabase/supabase-js';

function requireServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('Server-only module imported on the client: lib/supabase.ts');
  }
}

export function getSupabaseAdmin() {
  requireServerOnly();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}
