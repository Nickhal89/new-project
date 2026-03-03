import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sha256 } from '@/lib/hrAuth';

type CreateJobBody = {
  title?: string;
  location?: string;
  description?: string;
};

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

function resolveOrigin(request: Request) {
  const envBase = String(process.env.NEXT_PUBLIC_BASE_URL ?? '').trim();
  if (envBase) return envBase.replace(/\/$/, '');

  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';

  if (host) return `${proto}://${host}`;
  return '';
}

async function getOrCreateCompanyId() {
  const supabase = getSupabaseAdmin();

  const { data: demoCompany, error: demoFindError } = await supabase
    .from('companies')
    .select('id,name')
    .eq('name', DEMO_COMPANY_NAME)
    .maybeSingle<{ id: string; name: string }>();

  if (demoFindError) throw demoFindError;
  if (demoCompany?.id) return demoCompany.id;

  const { data: firstCompany, error: firstFindError } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (firstFindError) throw firstFindError;
  if (firstCompany?.id) return firstCompany.id;

  const { data: created, error: createError } = await supabase
    .from('companies')
    .insert({ name: DEMO_COMPANY_NAME })
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
      is_active: true,
      label: `job_${jobId}`
    });

    if (tokenError) {
      const { error: tokenFallbackError } = await supabase.from('company_access_tokens').insert({
        company_id: companyId,
        token_hash: sha256(hrToken),
        is_active: true
      });

      if (tokenFallbackError) throw tokenFallbackError;
    }

    const origin = resolveOrigin(request);
    const hrPath = `/hr/job/${jobId}?token=${encodeURIComponent(hrToken)}`;
    const candidatePath = `/t2/${jobToken}`;

    const hrLink = origin ? `${origin}${hrPath}` : hrPath;
    const candidateLink = origin ? `${origin}${candidatePath}` : candidatePath;

    return NextResponse.json({
      ok: true,
      jobId,
      jobToken,
      hrToken,
      title,
      createdAt: new Date().toISOString(),
      hrLink,
      candidateLink
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
