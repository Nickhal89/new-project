import { NextResponse } from 'next/server';
import { getMissingSmokeEnv, runSmoke } from '@/lib/smokeRunner';

function isAuthorized(request: Request) {
  const expected = String(process.env.ADMIN_TOKEN ?? '').trim();
  if (!expected) return false;

  const url = new URL(request.url);
  const headerToken = String(request.headers.get('x-admin-token') ?? '').trim();
  const queryToken = String(url.searchParams.get('token') ?? '').trim();
  const provided = headerToken || queryToken;

  return provided.length > 0 && provided === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missing = getMissingSmokeEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Missing required smoke env vars: ${missing.join(', ')}`,
        missing
      },
      { status: 400 }
    );
  }

  const startedAt = new Date().toISOString();

  const result = await runSmoke({
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    jobToken: String(process.env.SMOKE_JOB_TOKEN),
    jobId: String(process.env.SMOKE_JOB_ID),
    hrToken: String(process.env.SMOKE_HR_TOKEN),
    email: process.env.SMOKE_EMAIL
  });

  const finishedAt = new Date().toISOString();

  return NextResponse.json(
    {
      ok: result.ok,
      startedAt,
      finishedAt,
      output: result.output,
      error: result.error
    },
    { status: result.ok ? 200 : 500 }
  );
}
