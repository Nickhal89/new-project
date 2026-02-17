'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

type RankRow = {
  sessionId: string;
  candidateEmail: string;
  version: string;
  overallFit: number;
  topCompetencies: Array<{ key: string; score: number }>;
  why: string[];
};

const STORAGE_KEY = 'crossroads_demo_view_key';

export default function HrDemoPage() {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [demoKey, setDemoKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<RankRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetText, setResetText] = useState('');
  const [selected, setSelected] = useState<RankRow | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) ?? '';
    if (!saved) return;
    setPasscodeInput(saved);
    setDemoKey(saved);
    void authenticateAndLoad(saved);
  }, []);

  const statusTone: 'success' | 'warn' | 'error' | 'neutral' =
    status === 'pass' ? 'success' : status === 'running' ? 'warn' : status === 'fail' ? 'error' : 'neutral';

  const kpis = useMemo(() => {
    const tested = rows.length;
    const top = tested ? Math.max(...rows.map((r) => r.overallFit)) : 0;
    const avg = tested ? rows.reduce((acc, r) => acc + r.overallFit, 0) / tested : 0;
    const flags = rows.reduce((acc, r) => acc + (r.why.some((w) => w.includes('Σημείωση')) ? 1 : 0), 0);
    return { tested, top, avg, flags };
  }, [rows]);

  function handleRateLimit(payload: any) {
    const wait = Number(payload?.retryAfterSec ?? 15);
    setCooldown(Number.isFinite(wait) ? Math.max(1, wait) : 15);
    setError('Πάρα πολλές δοκιμές. Περίμενε 15\'\' και ξαναδοκίμασε.');
  }

  async function loadRanking(key = demoKey) {
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/ranking', { headers: { 'x-demo-key': key } });
    const payload = await res.json();

    if (!res.ok || !payload.ok) {
      if (res.status === 429) handleRateLimit(payload);
      else setError(payload.error ?? 'Δεν ήταν δυνατή η φόρτωση του demo ranking.');
      setStatus('fail');
      return false;
    }

    setRows(Array.isArray(payload.all) ? payload.all : []);
    setStatus('pass');
    return true;
  }

  async function authenticateAndLoad(key: string) {
    if (!key.trim()) return;
    const ok = await loadRanking(key.trim());

    if (ok) {
      sessionStorage.setItem(STORAGE_KEY, key.trim());
      setDemoKey(key.trim());
      setUnlocked(true);
      setError('');
    } else {
      setUnlocked(false);
      setError('Λάθος passcode. Δοκιμάστε ξανά ή πατήστε Εκκαθάριση.');
    }
  }

  function clearPasscode() {
    sessionStorage.removeItem(STORAGE_KEY);
    setDemoKey('');
    setPasscodeInput('');
    setUnlocked(false);
    setRows([]);
    setError('');
    setStatus('idle');
  }

  async function simulateCandidates() {
    if (!demoKey || cooldown > 0) return;
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/simulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-key': demoKey },
      body: JSON.stringify({ count: 10 })
    });
    const payload = await res.json();

    if (!res.ok || !payload.ok) {
      if (res.status === 429) handleRateLimit(payload);
      else setError(payload.error ?? 'Η προσομοίωση απέτυχε.');
      setStatus('fail');
      return;
    }

    setLogs(Array.isArray(payload.logs) ? payload.logs : []);
    await loadRanking(demoKey);
  }

  async function resetDemo() {
    if (!demoKey || cooldown > 0 || resetText !== 'RESET') return;
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'x-demo-key': demoKey }
    });
    const payload = await res.json();

    if (!res.ok || !payload.ok) {
      if (res.status === 429) handleRateLimit(payload);
      else setError(payload.error ?? 'Το reset απέτυχε.');
      setStatus('fail');
      return;
    }

    setShowResetModal(false);
    setResetText('');
    setLogs((prev) => [...prev, `Reset completed. Cleared sessions: ${payload.clearedSessions ?? 0}`]);
    await loadRanking(demoKey);
  }

  function exportCsv() {
    const header = ['candidateEmail', 'overallFit', 'topStrengths', 'why'];
    const lines = rows.map((r) => {
      const strengths = r.topCompetencies.map((c) => `${c.key}:${Math.round(c.score)}`).join(' | ');
      const why = (r.why ?? []).join(' ');
      return [r.candidateEmail, String(Math.round(r.overallFit)), strengths, why]
        .map((v) => `"${v.replaceAll('"', '""')}"`)
        .join(',');
    });

    const blob = new Blob([`\uFEFF${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo-ranking.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copySummary(row: RankRow) {
    const text = [
      `Candidate: ${row.candidateEmail}`,
      `Overall fit: ${Math.round(row.overallFit)}`,
      `Top competencies: ${row.topCompetencies.slice(0, 3).map((c) => `${c.key}:${Math.round(c.score)}`).join(', ')}`,
      `Why: ${(row.why ?? []).slice(0, 5).join(' ')}`
    ].join('\n');

    navigator.clipboard.writeText(text);
  }

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-xl space-y-4 py-8">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold">HR Demo Access</h1>
            <p className="mt-2 text-slate-600">Εισάγετε passcode για να δείτε το dashboard.</p>
            <p className="mt-2 text-xs text-slate-500">Tip: If you are the presenter, go to /demo → Presenter Mode.</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Demo περιβάλλον: synthetic δεδομένα μόνο.</p>
            <Input type="password" value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} placeholder="Demo passcode" />
            <div className="flex gap-2">
              <Button onClick={() => authenticateAndLoad(passcodeInput)} disabled={cooldown > 0}>Είσοδος</Button>
              <Button variant="secondary" onClick={() => authenticateAndLoad(passcodeInput)} disabled={cooldown > 0}>Retry</Button>
              <Button variant="ghost" onClick={clearPasscode}>Clear</Button>
            </div>
            {cooldown > 0 ? <p className="text-sm text-amber-700">Περίμενε {cooldown}'' για retry.</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-8">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">HR Demo Dashboard</h1>
          <Badge tone={statusTone}>{status.toUpperCase()}</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">Demo περιβάλλον: synthetic δεδομένα μόνο.</p>
          <p className="text-sm text-slate-600">
            <strong>Τι βλέπετε εδώ:</strong> Overall Fit, strengths και why bullets για γρήγορο shortlisting.
          </p>

          <div className="grid gap-3 md:grid-cols-4">
            <KpiTile title="Candidates tested" value={kpis.tested} />
            <KpiTile title="Top overall fit" value={Math.round(kpis.top)} />
            <KpiTile title="Average overall fit" value={Math.round(kpis.avg)} />
            <KpiTile title="Flags count" value={kpis.flags} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadRanking()} disabled={cooldown > 0}>Refresh Ranking</Button>
            <Button onClick={simulateCandidates} disabled={cooldown > 0}>Simulate Candidates</Button>
            <Button variant="danger" onClick={() => setShowResetModal(true)} disabled={cooldown > 0}>Reset Demo</Button>
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          </div>

          {cooldown > 0 ? <p className="text-sm text-amber-700">Πάρα πολλές δοκιμές. Περίμενε {cooldown}'' και ξαναδοκίμασε.</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Top 5 Υποψήφιοι</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Overall</th>
                  <th className="px-2 py-2">Strengths</th>
                  <th className="px-2 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={row.sessionId} className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50" onClick={() => setSelected(row)}>
                    <td className="px-2 py-2">{row.candidateEmail}</td>
                    <td className="px-2 py-2 font-medium">#{i + 1} · {Math.round(row.overallFit)}</td>
                    <td className="px-2 py-2">{row.topCompetencies.map((c) => `${c.key}: ${Math.round(c.score)}`).join(' · ') || '-'}</td>
                    <td className="px-2 py-2">{(row.why ?? []).slice(0, 2).join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Logs</h2>
        </CardHeader>
        <CardBody>
          <div className="h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
            {logs.length ? logs.map((line, i) => <p key={`${line}-${i}`}>{line}</p>) : <p>No logs yet.</p>}
          </div>
        </CardBody>
      </Card>

      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="Επιβεβαίωση Reset">
        <p className="text-sm text-slate-600">Για επιβεβαίωση, πληκτρολογήστε RESET.</p>
        <Input value={resetText} onChange={(e) => setResetText(e.target.value)} className="mt-3" placeholder="RESET" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>Άκυρο</Button>
          <Button variant="danger" onClick={resetDemo} disabled={resetText !== 'RESET'}>Επιβεβαίωση Reset</Button>
        </div>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Candidate Details" mode="side">
        {selected ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase text-slate-500">Candidate</p>
              <p className="font-medium">{selected.candidateEmail}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Overall fit</p>
              <p className="font-semibold text-slate-900">{Math.round(selected.overallFit)}/100</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Top competencies</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {selected.topCompetencies.slice(0, 3).map((c) => (
                  <li key={c.key}>{c.key}: {Math.round(c.score)}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Why bullets</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {(selected.why ?? []).slice(0, 5).map((w, i) => <li key={`${w}-${i}`}>{w}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Flags</p>
              <p>{selected.why.some((w) => w.includes('Σημείωση')) ? 'Has validity note' : 'No flags detected'}</p>
            </div>
            <Button variant="secondary" onClick={() => copySummary(selected)}>Copy summary</Button>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

function KpiTile({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
