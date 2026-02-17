'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Presenter Mode</h2>
          <p className="mt-1 text-sm text-slate-600">Γρήγορα links και ασφαλές hint passcode για live παρουσίαση.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Κλείσιμο' : 'Άνοιγμα'}
        </Button>
      </CardHeader>

      {open ? (
        <CardBody className="space-y-3">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Presenter/Admin token"
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={loadHint}>Load Passcode Hint</Button>
            <Button type="button" variant="secondary" onClick={copyHint}>Copy Passcode Hint</Button>
            <a href="/hr/demo"><Button type="button" variant="ghost">Open HR Demo</Button></a>
            <a href="/t2/demo"><Button type="button" variant="ghost">Open Candidate Demo</Button></a>
          </div>

          {hint ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{hint}</p> : null}
          {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        </CardBody>
      ) : null}
    </Card>
  );
}
