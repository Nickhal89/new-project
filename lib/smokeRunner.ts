export type SmokeRunnerParams = {
  baseUrl: string;
  jobToken: string;
  jobId: string;
  hrToken: string;
  email?: string;
};

export type SmokeRunnerResult = {
  ok: boolean;
  output: string;
  error?: string;
};

export function getMissingSmokeEnv(env: NodeJS.ProcessEnv = process.env) {
  const required = ['SMOKE_JOB_TOKEN', 'SMOKE_JOB_ID', 'SMOKE_HR_TOKEN'] as const;
  return required.filter((key) => !String(env[key] ?? '').trim());
}

function makeLogger() {
  const lines: string[] = [];

  return {
    pass(message: string) {
      lines.push(`✅ ${message}`);
    },
    fail(message: string) {
      lines.push(`❌ ${message}`);
    },
    dump() {
      return lines.join('\n');
    }
  };
}

async function jsonFetch(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload as Record<string, unknown>;
}

export async function runSmoke({ baseUrl, jobToken, jobId, hrToken, email }: SmokeRunnerParams): Promise<SmokeRunnerResult> {
  const logger = makeLogger();

  const smokeEmail = email || `smoke+${Date.now()}@example.com`;

  const likertAnswers = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`likert_w_${i + 1}`, 5]));
  const sjtAnswers = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`sjt_w_${i + 1}`, 'A']));
  const tradeoffAnswers = {
    tradeoff_w_1: 'A',
    tradeoff_w_2: 'A',
    tradeoff_w_3: 'A',
    tradeoff_w_4: 'A'
  };
  const validityAnswers = { validity_w_1: 1, validity_w_2: 1 };

  const sections = [
    { section: 'likert', step: 1, answers: likertAnswers },
    { section: 'tradeoff', step: 2, answers: tradeoffAnswers },
    { section: 'validity', step: 3, answers: validityAnswers },
    { section: 'sjt', step: 4, answers: sjtAnswers }
  ];

  try {
    logger.pass(`Using BASE_URL=${baseUrl}`);

    const start = await jsonFetch(baseUrl, '/api/session/start', {
      method: 'POST',
      body: JSON.stringify({
        email: smokeEmail,
        jobToken,
        termsAccepted: true,
        privacyAccepted: true,
        cvProcessingAccepted: true
      })
    });

    const sessionId = String(start.sessionId ?? '');
    if (!sessionId) {
      throw new Error(`start did not return a valid sessionId. payload=${JSON.stringify(start)}`);
    }
    logger.pass(`Session started: ${sessionId}`);

    for (const item of sections) {
      const saved = await jsonFetch(baseUrl, '/api/session/save', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          section: item.section,
          step: item.step,
          answers: item.answers
        })
      });

      if (!saved.success) {
        throw new Error(`save step ${item.section} did not return success=true. payload=${JSON.stringify(saved)}`);
      }
      logger.pass(`Saved section ${item.section}`);
    }

    const submit = await jsonFetch(baseUrl, '/api/session/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });

    if (submit.version !== 'waiter_v2') {
      throw new Error(`Expected submit version waiter_v2, received ${JSON.stringify(submit)}`);
    }
    logger.pass(`Session submitted with version ${String(submit.version)}`);

    const ranking = await jsonFetch(
      baseUrl,
      `/api/hr/job/${encodeURIComponent(jobId)}/ranking?token=${encodeURIComponent(hrToken)}`
    );

    const allRows = Array.isArray(ranking.all) ? ranking.all : [];
    const v2Row = allRows.find(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        ('sessionId' in row ? (row as { sessionId?: string }).sessionId === sessionId : false)
    );

    if (!v2Row || typeof v2Row !== 'object') {
      throw new Error(`Could not find smoke row in ranking output for session ${sessionId}`);
    }

    if ((v2Row as { version?: string }).version !== 'waiter_v2') {
      throw new Error(`Expected ranking row version waiter_v2. row=${JSON.stringify(v2Row)}`);
    }

    if (!Array.isArray((v2Row as { topCompetencies?: unknown[] }).topCompetencies)) {
      throw new Error(`Expected topCompetencies array. row=${JSON.stringify(v2Row)}`);
    }

    if (!Array.isArray((v2Row as { why?: unknown[] }).why)) {
      throw new Error(`Expected why array. row=${JSON.stringify(v2Row)}`);
    }

    logger.pass('Ranking returned waiter_v2 row with topCompetencies + why');
    logger.pass('Smoke test completed successfully');

    return { ok: true, output: logger.dump() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.fail(message);
    return { ok: false, output: logger.dump(), error: message };
  }
}
