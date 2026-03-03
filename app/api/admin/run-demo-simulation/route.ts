import { NextResponse } from 'next/server';
import { generateWaiterV2RandomAnswers } from '@/lib/demoRandomizer';

type SimulationPayload = {
  jobId?: string;
  jobToken?: string;
  hrToken?: string;
  candidateCount?: number;
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

async function jsonFetch(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload as Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];

  try {
    const body = (await request.json().catch(() => ({}))) as SimulationPayload;

    const jobId = String(body.jobId ?? '').trim();
    const jobToken = String(body.jobToken ?? '').trim();
    const hrToken = String(body.hrToken ?? '').trim();
    const requestedCount = Number(body.candidateCount ?? 10);
    const candidateCount = Number.isFinite(requestedCount) ? Math.max(1, Math.min(30, requestedCount)) : 10;

    if (!jobId || !jobToken || !hrToken) {
      return NextResponse.json(
        { ok: false, error: 'Missing required values: jobId, jobToken, hrToken.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    logs.push(`Using BASE_URL=${baseUrl}`);
    logs.push(`Starting simulation with ${candidateCount} candidates...`);

    for (let i = 0; i < candidateCount; i++) {
      const email = `demo.candidate.${Date.now()}.${i}@example.com`;

      const start = await jsonFetch(baseUrl, '/api/session/start', {
        method: 'POST',
        body: JSON.stringify({
          email,
          jobToken,
          termsAccepted: true,
          privacyAccepted: true,
          cvProcessingAccepted: true
        })
      });

      const sessionId = String(start.sessionId ?? '');
      if (!sessionId) throw new Error(`No sessionId from start for ${email}`);

      const answers = generateWaiterV2RandomAnswers();

      const save = await jsonFetch(baseUrl, '/api/session/save', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          section: 'demo_simulation',
          step: 99,
          answers
        })
      });

      if (!save.success) {
        throw new Error(`Save failed for session ${sessionId}`);
      }

      const submit = await jsonFetch(baseUrl, '/api/session/submit', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });

      if (submit.version !== 'waiter_v2') {
        throw new Error(`Unexpected scoring version for ${sessionId}: ${String(submit.version)}`);
      }

      logs.push(`Candidate ${i + 1}/${candidateCount} submitted (${sessionId}).`);
    }

    logs.push('Fetching HR ranking...');
    const ranking = await jsonFetch(
      baseUrl,
      `/api/hr/job/${encodeURIComponent(jobId)}/ranking?token=${encodeURIComponent(hrToken)}`
    );

    const top5 = Array.isArray(ranking.top5) ? ranking.top5 : [];
    logs.push(`Ranking fetched. Top5 count: ${top5.length}.`);

    return NextResponse.json({
      ok: true,
      candidateCount,
      logs,
      ranking: {
        top5,
        allCount: Array.isArray(ranking.all) ? ranking.all.length : 0
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push(`Simulation failed: ${message}`);

    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
