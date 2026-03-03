'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';

type Section = {
  key: string;
  title: string;
  points: string[];
};

const sections: Section[] = [
  {
    key: 'today',
    title: 'Σήμερα (MVP)',
    points: ['Waiter v2 αξιολόγηση', 'Explainable ranking με why bullets', 'Demo-safe ροή με synthetic data']
  },
  {
    key: '30d',
    title: 'Σε 30 ημέρες',
    points: ['PDF report ανά υποψήφιο', 'Job management UI για HR', 'Dynamic rendering από item bank']
  },
  {
    key: '90d',
    title: 'Σε 90 ημέρες',
    points: ['Multi-role profiles', 'Calibration με ιστορικά δεδομένα', 'ATS/email workflows']
  },
  {
    key: 'moat',
    title: 'Data moat (GDPR-first)',
    points: ['Opt-in talent pool', 'Anonymized insights ανά ρόλο', 'Company matching με privacy by design']
  }
];

export default function RoadmapPage() {
  const [active, setActive] = useState(sections[0].key);
  const [presenterMode, setPresenterMode] = useState(false);

  const index = sections.findIndex((s) => s.key === active);
  const current = sections[index] ?? sections[0];

  const fs = presenterMode ? 'text-2xl' : 'text-xl';

  return (
    <main className="mx-auto max-w-6xl py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Roadmap Pitch</h1>
        <div className="flex items-center gap-2">
          <Button variant={presenterMode ? 'primary' : 'secondary'} onClick={() => setPresenterMode((v) => !v)}>
            Presenter Mode {presenterMode ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sections</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {sections.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${s.key === active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            {!presenterMode ? (
              <Tabs tabs={sections.map((s) => ({ key: s.key, label: s.title }))} activeKey={active} onChange={setActive} />
            ) : (
              <p className="text-sm text-slate-500">Presenter controls: χρησιμοποιήστε Next/Prev.</p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setActive(sections[Math.max(0, index - 1)].key)} disabled={index === 0}>
                Prev
              </Button>
              <Button onClick={() => setActive(sections[Math.min(sections.length - 1, index + 1)].key)} disabled={index === sections.length - 1}>
                Next
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <h2 className={`${fs} font-semibold text-slate-900`}>{current.title}</h2>
            <ul className={`mt-4 list-disc space-y-3 pl-6 ${presenterMode ? 'text-lg' : 'text-base'} text-slate-700`}>
              {current.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
