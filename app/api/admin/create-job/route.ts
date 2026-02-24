import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sha256 } from '@/lib/hrAuth';

type CreateJobBody = {
  title?: string;
  location?: string;
  description?: string;
};

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

async function getOrCreateCompanyId() {
  const supabase = getSupabaseAdmin();

  const { data: firstCompany } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (firstCompany?.id) return firstCompany.id;

  const { data: created, error: createError } = await supabase
    .from('companies')
    .insert({ name: 'Pilot Company' })
    .select('id')
    .single<{ id: string }>();

  if (createError) throw createError;
  return created.id;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as CreateJobBody;

    const title = String(body.title ?? '').trim();
    const location = String(body.location ?? '').trim();
    const description = String(body.description ?? '').trim();

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Job title is required.' }, { status: 400 });
    }

    const companyId = await getOrCreateCompanyId();
    const jobToken = randomToken('job');
    const hrToken = randomToken('hr');

    const supabase = getSupabaseAdmin();

    const basePayload = {
      company_id: companyId,
      job_token: jobToken,
      title,
      profile_id: 'waiter_service_v1'
    } as Record<string, unknown>;

    const fullPayload: Record<string, unknown> = { ...basePayload };
    if (location) fullPayload.location = location;
    if (description) fullPayload.description = description;

    let jobId = '';

    const { data: fullInsert, error: fullError } = await supabase
      .from('jobs')
      .insert(fullPayload)
      .select('id')
      .maybeSingle<{ id: string }>();

    if (fullError) {
      const { data: minimalInsert, error: minimalError } = await supabase
        .from('jobs')
        .insert(basePayload)
        .select('id')
        .single<{ id: string }>();

      if (minimalError) throw minimalError;
      jobId = minimalInsert.id;
    } else {
      jobId = fullInsert?.id ?? '';
    }

    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'Failed to create job.' }, { status: 500 });
    }

    const { error: tokenError } = await supabase.from('company_access_tokens').insert({
      company_id: companyId,
      token_hash: sha256(hrToken),
      is_active: true
    });

    if (tokenError) throw tokenError;

    const hrLink = `/hr/job/${jobId}?token=${encodeURIComponent(hrToken)}`;
    const candidateLink = `/t2/${jobToken}`;

    return NextResponse.json({
      ok: true,
      jobId,
      jobToken,
      hrToken,
      hrLink,
      candidateLink
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
