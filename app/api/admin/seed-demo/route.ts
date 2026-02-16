import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sha256 } from '@/lib/hrAuth';

const DEMO_COMPANY_NAME = 'Crossroads Demo Company';

function isAuthorized(request: Request) {
  const expected = String(process.env.ADMIN_TOKEN ?? '').trim();
  if (!expected) return false;

  const url = new URL(request.url);
  const headerToken = String(request.headers.get('x-admin-token') ?? '').trim();
  const queryToken = String(url.searchParams.get('token') ?? '').trim();
  const provided = headerToken || queryToken;

  return provided.length > 0 && provided === expected;
}

function randomToken(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];

  try {
    const supabase = getSupabaseAdmin();

    logs.push('Looking up demo company...');
    const { data: existingCompany, error: companyFindError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('name', DEMO_COMPANY_NAME)
      .maybeSingle<{ id: string; name: string }>();

    if (companyFindError) throw companyFindError;

    let companyId = existingCompany?.id ?? '';

    if (!companyId) {
      logs.push('Creating demo company...');
      const { data: createdCompany, error: companyCreateError } = await supabase
        .from('companies')
        .insert({ name: DEMO_COMPANY_NAME })
        .select('id, name')
        .single<{ id: string; name: string }>();

      if (companyCreateError) throw companyCreateError;
      companyId = createdCompany.id;
      logs.push(`Created company ${createdCompany.id}`);
    } else {
      logs.push(`Using existing company ${companyId}`);
    }

    const jobToken = randomToken('demojob');
    const hrToken = randomToken('hr');

    logs.push('Creating demo job...');
    const { data: createdJob, error: jobCreateError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        job_token: jobToken,
        title: 'Demo Waiter / Service Staff',
        profile_id: 'waiter_service_v1'
      })
      .select('id, job_token, company_id')
      .single<{ id: string; job_token: string; company_id: string }>();

    if (jobCreateError) throw jobCreateError;

    logs.push('Creating HR access token...');
    const { error: tokenCreateError } = await supabase.from('company_access_tokens').insert({
      company_id: companyId,
      token_hash: sha256(hrToken),
      is_active: true
    });

    if (tokenCreateError) throw tokenCreateError;

    logs.push('Demo seed completed successfully.');

    return NextResponse.json({
      ok: true,
      companyId,
      jobId: createdJob.id,
      jobToken: createdJob.job_token,
      hrToken,
      logs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push(`Seed failed: ${message}`);

    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
