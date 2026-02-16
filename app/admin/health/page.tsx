'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type RunResponse = {
  ok: boolean;
  startedAt?: string;
  finishedAt?: string;
  output?: string;
  error?: string;
};

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_BASE_URL',
  'ADMIN_TOKEN',
  'SMOKE_JOB_TOKEN',
  'SMOKE_JOB_ID',
  'SMOKE_HR_TOKEN'
] as const;

export default function AdminHealthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromQuery = useMemo(() => params.get('token')?.trim() ?? '', [params]);
  const [adminToken, setAdminToken] = useState(tokenFromQuery);

  const [state, setState] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [timing, setTiming] = useState<{ startedAt?: string; finishedAt?: string }>({});

  useEffect(() => {
    if (!tokenFromQuery) return;

    setAdminToken(tokenFromQuery);
    router.replace('/admin/health');
  }, [router, tokenFromQuery]);

  async function runSmoke() {
    if (!adminToken) {
      setState('fail');
      setError('Unauthorized: missing token in query string. Use ?token=ADMIN_TOKEN');
      return;
    }

    setState('running');
    setLogs('');
    setError('');
    setTiming({});

    try {
      const response = await fetch('/api/admin/run-smoke', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        }
      });

      const payload = (await response.json()) as RunResponse;

      setLogs(payload.output ?? '');
      setTiming({ startedAt: payload.startedAt, finishedAt: payload.finishedAt });

      if (!response.ok || !payload.ok) {
        setState('fail');
        setError(payload.error ?? `Smoke run failed with status ${response.status}`);
        return;
      }

      setState('pass');
    } catch (runErr) {
      setState('fail');
      setError(runErr instanceof Error ? runErr.message : String(runErr));
    }
  }

  const statusStyles: Record<typeof state, string> = {
    idle: 'bg-slate-100 text-slate-700',
    running: 'bg-amber-100 text-amber-800',
    pass: 'bg-emerald-100 text-emerald-800',
    fail: 'bg-rose-100 text-rose-800'
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Admin Health Check</h1>
      <p className="mt-2 text-sm text-slate-600">
        Run the Supabase smoke flow from the browser (start → save → submit → HR ranking).
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[state]}`}>
            Status: {state.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={runSmoke}
            disabled={state === 'running'}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'running' ? 'Running…' : 'Run Smoke Test'}
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <p>
            <span className="font-medium text-slate-700">Started:</span> {timing.startedAt ?? '-'}
          </p>
          <p>
            <span className="font-medium text-slate-700">Finished:</span> {timing.finishedAt ?? '-'}
          </p>
        </div>

        {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="smoke-output">
          Output logs
        </label>
        <textarea
          id="smoke-output"
          readOnly
          value={logs}
          className="mt-2 h-72 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
        />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 p-4">
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
