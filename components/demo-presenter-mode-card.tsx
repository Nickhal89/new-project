'use client';

import { useState } from 'react';

export default function DemoPresenterModeCard() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');

  async function loadHint() {
    setError('');

    const res = await fetch('/api/demo/presenter-hint', {
      headers: {
        ...(token ? { 'x-presenter-token': token, 'x-admin-token': token } : {})
      }
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? 'Δεν επιτρέπεται πρόσβαση στο presenter hint.');
      return;
    }

    setHint(String(payload.hint ?? 'Χωρίς διαθέσιμο hint'));
  }

  function copyHint() {
    if (!hint) return;
    navigator.clipboard.writeText(hint);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Presenter Mode</h2>
          <p className="mt-1 text-sm text-slate-600">Γρήγορα links και ασφαλές hint passcode για live παρουσίαση.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          {open ? 'Κλείσιμο' : 'Άνοιγμα'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Presenter/Admin token"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadHint} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
              Load Passcode Hint
            </button>
            <button type="button" onClick={copyHint} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Copy Passcode Hint
            </button>
            <a href="/hr/demo" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Open HR Demo
            </a>
            <a href="/t2/demo" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Open Candidate Demo
            </a>
          </div>

          {hint ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{hint}</p> : null}
          {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
