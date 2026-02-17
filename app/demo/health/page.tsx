'use client';

import { useState } from 'react';

type HealthPayload = {
  ok: boolean;
  checks?: {
    demoMode: boolean;
    supabaseUrl: boolean;
    supabaseAnon: boolean;
    supabaseService: boolean;
    demoViewKey: boolean;
  };
  error?: string;
};

export default function DemoHealthPage() {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'pass' | 'fail' | 'running'>('idle');
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [seedDryRun, setSeedDryRun] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [rankingDryRun, setRankingDryRun] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [error, setError] = useState('');

  const authHeaders = key
    ? {
        'x-demo-key': key,
        'x-admin-token': key
      }
    : {};

  async function runHealth() {
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/health', { headers: authHeaders });
    const payload = (await res.json()) as HealthPayload;
    if (!res.ok) {
      setStatus('fail');
      setError(payload.error ?? 'Health check failed');
      return;
    }

    setHealth(payload);
    setStatus(payload.ok ? 'pass' : 'fail');
  }

  async function runSeedDry() {
    const res = await fetch('/api/demo/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ dryRun: true })
    });
    setSeedDryRun(res.ok ? 'pass' : 'fail');
  }

  async function runRankingDry() {
    const res = await fetch('/api/demo/ranking?dryRun=true', { headers: authHeaders });
    setRankingDryRun(res.ok ? 'pass' : 'fail');
  }

  const badge = {
    idle: 'bg-slate-100 text-slate-700',
    running: 'bg-amber-100 text-amber-800',
    pass: 'bg-emerald-100 text-emerald-700',
    fail: 'bg-rose-100 text-rose-700'
  }[status];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Demo Health</h1>
          <span className={`rounded-full px-3 py-1 text-sm ${badge}`}>{status.toUpperCase()}</span>
        </div>

        <p className="mt-3 text-sm text-slate-600">Προστατευμένη σελίδα ελέγχου demo readiness.</p>

        <input
          type="password"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Demo passcode ή admin token"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={runHealth} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Run Health Check
          </button>
          <button onClick={runSeedDry} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Dry-run Seed
          </button>
          <button onClick={runRankingDry} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Dry-run Ranking
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        {health?.checks ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Object.entries(health.checks).map(([k, v]) => (
              <div key={k} className={`rounded-lg border p-3 text-sm ${v ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className="font-medium">{k}</p>
                <p>{v ? 'PASS' : 'FAIL'}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-lg border p-3 text-sm ${seedDryRun === 'pass' ? 'border-emerald-200 bg-emerald-50' : seedDryRun === 'fail' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            <p className="font-medium">/api/demo/seed dry-run</p>
            <p>{seedDryRun.toUpperCase()}</p>
          </div>
          <div className={`rounded-lg border p-3 text-sm ${rankingDryRun === 'pass' ? 'border-emerald-200 bg-emerald-50' : rankingDryRun === 'fail' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            <p className="font-medium">/api/demo/ranking dry-run</p>
            <p>{rankingDryRun.toUpperCase()}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
