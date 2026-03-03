'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';

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

  const authHeaders = key ? { 'x-demo-key': key, 'x-admin-token': key } : {};

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

  const tone = status === 'pass' ? 'success' : status === 'running' ? 'warn' : status === 'fail' ? 'error' : 'neutral';

  return (
    <main className="mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Demo Health</h1>
          <Badge tone={tone}>{status.toUpperCase()}</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-600">Προστατευμένη σελίδα ελέγχου demo readiness.</p>

          <Input
            type="password"
            className="mt-4"
            placeholder="Demo passcode ή admin token"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={runHealth}>Run Health Check</Button>
            <Button variant="secondary" onClick={runSeedDry}>Dry-run Seed</Button>
            <Button variant="secondary" onClick={runRankingDry}>Dry-run Ranking</Button>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

          {health?.checks ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(health.checks).map(([k, v]) => (
                <div key={k} className={`rounded-xl border p-3 text-sm ${v ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                  <p className="font-medium">{k}</p>
                  <p>{v ? 'PASS' : 'FAIL'}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniResult title="/api/demo/seed dry-run" status={seedDryRun} />
            <MiniResult title="/api/demo/ranking dry-run" status={rankingDryRun} />
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

function MiniResult({ title, status }: { title: string; status: 'idle' | 'pass' | 'fail' }) {
  const cls =
    status === 'pass'
      ? 'border-emerald-200 bg-emerald-50'
      : status === 'fail'
        ? 'border-rose-200 bg-rose-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className={`rounded-xl border p-3 text-sm ${cls}`}>
      <p className="font-medium">{title}</p>
      <p>{status.toUpperCase()}</p>
    </div>
  );
}
