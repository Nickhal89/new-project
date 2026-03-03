import 'server-only';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function verifyCompanyTokenForJob(params: { jobId: string; token: string }) {
  const { jobId, token } = params;
  const supabase = getSupabaseAdmin();

  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('id, company_id')
    .eq('id', jobId)
    .maybeSingle<{ id: string; company_id: string }>();

  if (jErr) throw jErr;
  if (!job) return { ok: false as const };

  const tokenHash = sha256(token);

  const { data: row, error: tErr } = await supabase
    .from('company_access_tokens')
    .select('id')
    .eq('company_id', job.company_id)
    .eq('token_hash', tokenHash)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (tErr) throw tErr;
  if (!row) return { ok: false as const };

  return { ok: true as const, companyId: job.company_id };
}
