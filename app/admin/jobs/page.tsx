'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';

type CreateJobResponse = {
  ok: boolean;
  error?: string;
  jobId?: string;
  jobToken?: string;
  hrToken?: string;
  title?: string;
  createdAt?: string;
  hrLink?: string;
  candidateLink?: string;
};

export default function AdminJobsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromQuery = useMemo(() => params.get('token')?.trim() ?? '', [params]);

  const [adminToken, setAdminToken] = useState(tokenFromQuery);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const [status, setStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateJobResponse | null>(null);

  useEffect(() => {
    if (!tokenFromQuery) return;

    setAdminToken(tokenFromQuery);
    router.replace('/admin/jobs');
  }, [router, tokenFromQuery]);

  async function createJob() {
    if (!adminToken) {
      setStatus('fail');
      setError('Unauthorized: missing admin token. Open /admin/jobs?token=ADMIN_TOKEN');
      return;
    }

    if (!title.trim()) {
      setStatus('fail');
      setError('Το Job Title είναι υποχρεωτικό.');
      return;
    }

    setStatus('running');
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/jobs/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim(),
          description: description.trim()
        })
      });

      const payload = (await response.json()) as CreateJobResponse;

      if (!response.ok || !payload.ok) {
        setStatus('fail');
        setError(payload.error ?? 'Job creation failed');
        return;
      }

      setStatus('pass');
      setResult(payload);
    } catch (runErr) {
      setStatus('fail');
      setError(runErr instanceof Error ? runErr.message : String(runErr));
    }
  }

  const badgeClass: Record<typeof status, string> = {
    idle: 'bg-slate-100 text-slate-700',
    running: 'bg-amber-100 text-amber-800',
    pass: 'bg-emerald-100 text-emerald-700',
    fail: 'bg-rose-100 text-rose-700'
  };

  function copyText(value: string) {
    void navigator.clipboard.writeText(value);
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pilot Jobs</h1>
            <p className="mt-1 text-sm text-slate-600">Create a real pilot job and generate HR/Candidate links.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass[status]}`}>
            {status.toUpperCase()}
          </span>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            type="password"
            placeholder="Admin token (ή άνοιξε /admin/jobs?token=...)"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
          />

          <Input
            placeholder="Job Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button onClick={createJob} disabled={status === 'running'}>
            Create Job
          </Button>

          {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        </CardBody>
      </Card>

      {result?.ok && result.hrLink && result.candidateLink ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Result</h2>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-200 p-3 text-slate-700">
              <p><strong>Job Title:</strong> {result.title ?? title}</p>
              <p><strong>Created:</strong> {result.createdAt ? new Date(result.createdAt).toLocaleString() : '-'}</p>
              <p><strong>Job ID:</strong> {result.jobId}</p>
              <p><strong>Job Token:</strong> {result.jobToken}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">HR Link</p>
              <p className="mt-1 break-all text-slate-800">{result.hrLink}</p>
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => copyText(result.hrLink!)}>Copy HR Link</Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Candidate Link</p>
              <p className="mt-1 break-all text-slate-800">{result.candidateLink}</p>
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => copyText(result.candidateLink!)}>Copy Candidate Link</Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">HR Token</p>
              <p className="mt-1 break-all text-slate-800">{result.hrToken}</p>
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => copyText(result.hrToken ?? '')}>Copy HR Token</Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
              <p className="font-medium">How to use</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Στείλε το Candidate Link σε υποψηφίους για συμπλήρωση assessment.</li>
                <li>Άνοιξε το HR Link για live ranking και shortlist.</li>
                <li>Κράτα το HR Token μόνο για εσωτερική χρήση.</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </main>
  );
}
