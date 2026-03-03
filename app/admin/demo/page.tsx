'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type SeedResponse = {
  ok: boolean;
  companyId?: string;
  jobId?: string;
  jobToken?: string;
  hrToken?: string;
  logs?: string[];
  error?: string;
};

type RankingRow = {
  sessionId: string;
  candidateEmail: string;
  version: string;
  overallFit: number;
  topCompetencies?: Array<{ key: string; score: number }>;
  why?: string[];
};

type SimulationResponse = {
  ok: boolean;
  candidateCount?: number;
  logs?: string[];
  ranking?: { top5?: RankingRow[]; allCount?: number };
  error?: string;
};

type DemoState = {
  jobId: string;
  jobToken: string;
  hrToken: string;
  candidateCount: number;
};

const REQUIRED_ENV = [
  'ADMIN_TOKEN',
  'NEXT_PUBLIC_BASE_URL',
  'SMOKE_JOB_TOKEN',
  'SMOKE_JOB_ID',
  'SMOKE_HR_TOKEN'
] as const;

export default function AdminDemoPage() {
  const router = useRouter();
  const params = useSearchParams();

  const tokenFromQuery = useMemo(() => params.get('token')?.trim() ?? '', [params]);
  const [adminToken, setAdminToken] = useState(tokenFromQuery);

  const [status, setStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [runningAction, setRunningAction] = useState<'seed' | 'simulate' | null>(null);

  const [demo, setDemo] = useState<DemoState>({
    jobId: '',
    jobToken: '',
    hrToken: '',
    candidateCount: 0
  });
  const [top5, setTop5] = useState<RankingRow[]>([]);

  useEffect(() => {
    if (!tokenFromQuery) return;

    setAdminToken(tokenFromQuery);
    router.replace('/admin/demo');
  }, [router, tokenFromQuery]);

  function appendLogs(next: string[]) {
    setLogs((prev) => [...prev, ...next]);
  }

  async function seedDemo() {
    if (!adminToken) {
      setStatus('fail');
      setError('Unauthorized: missing token. Open /admin/demo?token=ADMIN_TOKEN');
      return;
    }

    setStatus('running');
    setRunningAction('seed');
    setError('');
    setTop5([]);

    try {
      const response = await fetch('/api/admin/seed-demo', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        }
      });

      const payload = (await response.json()) as SeedResponse;
      if (payload.logs?.length) appendLogs(payload.logs);

      if (!response.ok || !payload.ok || !payload.jobId || !payload.jobToken || !payload.hrToken) {
        setStatus('fail');
        setError(payload.error ?? 'Seeding failed');
        return;
      }

      setDemo({
        jobId: payload.jobId,
        jobToken: payload.jobToken,
        hrToken: payload.hrToken,
        candidateCount: 0
      });
      setStatus('pass');
    } catch (runErr) {
      setStatus('fail');
      setError(runErr instanceof Error ? runErr.message : String(runErr));
    } finally {
      setRunningAction(null);
    }
  }

  async function runFullSimulation() {
    if (!adminToken) {
      setStatus('fail');
      setError('Unauthorized: missing token. Open /admin/demo?token=ADMIN_TOKEN');
      return;
    }

    if (!demo.jobId || !demo.jobToken || !demo.hrToken) {
      setStatus('fail');
      setError('Please seed a demo job first.');
      return;
    }

    setStatus('running');
    setRunningAction('simulate');
    setError('');

    try {
      const response = await fetch('/api/admin/run-demo-simulation', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          jobId: demo.jobId,
          jobToken: demo.jobToken,
          hrToken: demo.hrToken,
          candidateCount: 10
        })
      });

      const payload = (await response.json()) as SimulationResponse;
      if (payload.logs?.length) appendLogs(payload.logs);

      if (!response.ok || !payload.ok) {
        setStatus('fail');
        setError(payload.error ?? 'Simulation failed');
        return;
      }

      setDemo((prev) => ({
        ...prev,
        candidateCount: payload.candidateCount ?? prev.candidateCount
      }));

      setTop5(payload.ranking?.top5 ?? []);
      setStatus('pass');
    } catch (runErr) {
      setStatus('fail');
      setError(runErr instanceof Error ? runErr.message : String(runErr));
    } finally {
      setRunningAction(null);
    }
  }

  const badgeClass: Record<typeof status, string> = {
    idle: 'bg-slate-100 text-slate-700',
    running: 'bg-amber-100 text-amber-800',
    pass: 'bg-emerald-100 text-emerald-700',
    fail: 'bg-rose-100 text-rose-700'
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-900">Admin Demo Control Panel</h1>
      <p className="mt-2 text-sm text-slate-600">
        Seed demo data, simulate waiter v2 candidates, and inspect ranking in one place.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={seedDemo}
          disabled={status === 'running'}
          className="rounded-2xl bg-white p-6 text-left shadow-lg ring-1 ring-slate-200 transition hover:shadow-xl disabled:opacity-60"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Seed Demo Job</h2>
          <p className="mt-2 text-sm text-slate-600">Creates demo company/job and a fresh HR token.</p>
        </button>

        <button
          type="button"
          onClick={runFullSimulation}
          disabled={status === 'running'}
          className="rounded-2xl bg-white p-6 text-left shadow-lg ring-1 ring-slate-200 transition hover:shadow-xl disabled:opacity-60"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Run Full Demo Simulation</h2>
          <p className="mt-2 text-sm text-slate-600">Generates 10 random candidates and returns ranking.</p>
        </button>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Status</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass[status]}`}>
            {status.toUpperCase()}
          </span>
        </div>

        {runningAction ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Running {runningAction === 'seed' ? 'seed' : 'full simulation'}...
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Meta label="Job ID" value={demo.jobId || '-'} />
          <Meta label="Job Token" value={demo.jobToken || '-'} />
          <Meta label="HR Token" value={demo.hrToken || '-'} />
          <Meta label="Simulated Candidates" value={String(demo.candidateCount)} />
        </dl>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Top 5 Ranking</h2>
        {!top5.length ? (
          <p className="mt-3 text-sm text-slate-600">No ranking yet. Run full demo simulation.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Candidate</th>
                  <th className="px-2 py-2">Overall Fit</th>
                  <th className="px-2 py-2">Top Competencies</th>
                  <th className="px-2 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((row) => (
                  <tr key={row.sessionId} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2 text-slate-700">{row.candidateEmail}</td>
                    <td className="px-2 py-2 font-medium text-slate-900">{Math.round(row.overallFit)}</td>
                    <td className="px-2 py-2 text-slate-700">
                      {(row.topCompetencies ?? [])
                        .map((c) => `${c.key}: ${Math.round(c.score)}`)
                        .join(' · ') || '-'}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {(row.why ?? []).slice(0, 2).join(' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Logs</h2>
        <div className="mt-3 h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          {logs.length ? logs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>) : <p>No logs yet.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Required env vars</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {REQUIRED_ENV.map((name) => (
            <li key={name} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">
              {name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-slate-800">{value}</dd>
    </div>
  );
}
