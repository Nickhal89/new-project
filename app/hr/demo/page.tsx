'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [status, setStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<RankRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) ?? '';
    if (saved) {
      setDemoKey(saved);
    }
  }, []);

  const badgeClass = useMemo(
    () =>
      ({
        idle: 'bg-slate-100 text-slate-700',
        running: 'bg-amber-100 text-amber-800',
        pass: 'bg-emerald-100 text-emerald-700',
        fail: 'bg-rose-100 text-rose-700'
      })[status],
    [status]
  );

  async function loadRanking(key = demoKey) {
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/ranking', {
      headers: { 'x-demo-key': key }
    });

    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      setStatus('fail');
      setError(payload.error ?? 'Δεν ήταν δυνατή η φόρτωση του demo ranking.');
      return;
    }

    setRows(Array.isArray(payload.all) ? payload.all : []);
    setStatus('pass');
  }

  async function submitPasscode() {
    if (!passcodeInput.trim()) return;

    const key = passcodeInput.trim();
    sessionStorage.setItem(STORAGE_KEY, key);
    setDemoKey(key);
    await loadRanking(key);
  }

  async function simulateCandidates() {
    if (!demoKey) return;
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/simulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-key': demoKey },
      body: JSON.stringify({ count: 10 })
    });

    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      setStatus('fail');
      setError(payload.error ?? 'Η προσομοίωση απέτυχε.');
      return;
    }

    setLogs(Array.isArray(payload.logs) ? payload.logs : []);
    await loadRanking(demoKey);
  }

  async function resetDemo() {
    if (!demoKey) return;
    setStatus('running');
    setError('');

    const res = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'x-demo-key': demoKey }
    });

    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      setStatus('fail');
      setError(payload.error ?? 'Το reset απέτυχε.');
      return;
    }

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

  if (!demoKey) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">HR Demo Access</h1>
          <p className="mt-2 text-slate-600">Εισάγετε demo passcode για να δείτε το dashboard.</p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Demo passcode"
          />
          <button onClick={submitPasscode} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white">
            Είσοδος
          </button>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">HR Demo Dashboard</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}>{status.toUpperCase()}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          <strong>Τι βλέπετε εδώ:</strong> Το Overall Fit δείχνει συνολική καταλληλότητα ρόλου. Τα Top Strengths
          δείχνουν τα 2 ισχυρότερα competencies, ενώ τα why bullets εξηγούν πρακτικά το ranking για γρήγορη
          shortlisting.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => loadRanking()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Refresh Ranking
          </button>
          <button onClick={simulateCandidates} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Simulate Candidates
          </button>
          <button onClick={resetDemo} className="rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700">
            Reset Demo
          </button>
          <button onClick={exportCsv} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Export CSV
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Top 5 Υποψήφιοι</h2>
        <div className="mt-4 overflow-x-auto">
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
              {rows.slice(0, 5).map((row) => (
                <tr key={row.sessionId} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2">{row.candidateEmail}</td>
                  <td className="px-2 py-2 font-medium">{Math.round(row.overallFit)}</td>
                  <td className="px-2 py-2">
                    {row.topCompetencies.map((c) => `${c.key}: ${Math.round(c.score)}`).join(' · ') || '-'}
                  </td>
                  <td className="px-2 py-2">{(row.why ?? []).slice(0, 2).join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Logs</h2>
        <div className="mt-3 h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
          {logs.length ? logs.map((line, i) => <p key={`${line}-${i}`}>{line}</p>) : <p>No logs yet.</p>}
        </div>
      </section>
    </main>
  );
}
