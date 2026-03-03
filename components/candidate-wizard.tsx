'use client';

import { FormEvent, useMemo, useState } from 'react';

type WizardProps = { jobToken: string };

type WizardData = {
  email: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cvProcessingAccepted: boolean;
  cvFilePath?: string;
  likert_1?: number;
  likert_2?: number;
  likert_3?: number;
  situational_1?: 'A' | 'B' | 'C';
  situational_2?: 'A' | 'B' | 'C';
  integrity_1?: 'yes' | 'no';
  integrity_2?: 'yes' | 'no';
};

const steps = ['Welcome', 'CV Upload', 'Likert', 'Situational', 'Integrity', 'Review'];
const SESSION_KEY_PREFIX = 'crossroads_session_';

export default function CandidateWizard({ jobToken }: WizardProps) {
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [candidateId, setCandidateId] = useState<string>('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [insight, setInsight] = useState('');
  const [submitDone, setSubmitDone] = useState(false);
  const [data, setData] = useState<WizardData>({
    email: '',
    termsAccepted: false,
    privacyAccepted: false,
    cvProcessingAccepted: false
  });

  const progress = useMemo(() => Math.round((step / (steps.length - 1)) * 100), [step]);

  const onStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStartValid(data)) return;

    setSaving(true);
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobToken,
        email: data.email,
        termsAccepted: data.termsAccepted,
        privacyAccepted: data.privacyAccepted,
        cvProcessingAccepted: data.cvProcessingAccepted
      })
    });

    setSaving(false);

    if (!res.ok) return;

    const payload = await res.json();
    setSessionId(payload.sessionId);
    setCandidateId(payload.candidateId);
    setStep(payload.currentStep ?? 1);
    setStarted(true);

    const merged = { ...data, ...(payload.answers ?? {}) };
    setData(merged);
    localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}`, payload.sessionId);
    localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}_data`, JSON.stringify(merged));
  };

  const saveStep = async () => {
    if (!sessionId) return;

    setSaving(true);
    const section = getSectionByStep(step);
    const answers = getAnswersByStep(step, data);

    const res = await fetch('/api/session/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, step, section, answers })
    });

    setSaving(false);
    if (!res.ok) return;

    const payload = await res.json();
    setInsight(payload.insight ?? 'Progress saved');
    localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}_data`, JSON.stringify(data));
  };

  const submitSession = async () => {
    if (!sessionId) return;

    setSaving(true);
    await saveStep();
    const res = await fetch('/api/session/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    setSaving(false);

    if (res.ok) {
      setSubmitDone(true);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}`);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}_data`);
    }
  };

  const tryResume = async () => {
    const savedData = localStorage.getItem(`${SESSION_KEY_PREFIX}${jobToken}_data`);
    const session = localStorage.getItem(`${SESSION_KEY_PREFIX}${jobToken}`);
    if (!savedData || !session) return;

    try {
      const parsed = JSON.parse(savedData) as WizardData;
      setData((prev) => ({ ...prev, ...parsed }));
      setSessionId(session);
      setStarted(true);
      setStep(inferStepFromData(parsed));
    } catch {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}`);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}_data`);
    }
  };

  if (!started) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Crossroads HR Assessment</h1>
        <p className="mt-2 text-sm text-slate-600">Complete your candidate assessment for this role.</p>
        <form className="mt-6 space-y-4" onSubmit={onStart}>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={data.email}
              onChange={(e) => setData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <CheckboxRow
            checked={data.termsAccepted}
            onChange={(v) => setData((prev) => ({ ...prev, termsAccepted: v }))}
            label="I accept the assessment terms (required)"
          />
          <CheckboxRow
            checked={data.privacyAccepted}
            onChange={(v) => setData((prev) => ({ ...prev, privacyAccepted: v }))}
            label="I accept the privacy policy (required)"
          />
          <CheckboxRow
            checked={data.cvProcessingAccepted}
            onChange={(v) => setData((prev) => ({ ...prev, cvProcessingAccepted: v }))}
            label="I consent to CV processing for this assessment (optional)"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!isStartValid(data) || saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? 'Starting...' : 'Start assessment'}
            </button>
            <button
              type="button"
              onClick={tryResume}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700"
            >
              Resume previous session
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (submitDone) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-emerald-700">Assessment submitted</h2>
        <p className="mt-2 text-sm text-slate-600">Thank you. Our team will review your responses.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{steps[step]}</h2>
          <span className="text-sm text-slate-500">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <StepContent step={step} data={data} setData={setData} sessionId={sessionId} />

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
        {insight || 'Fill this section and continue.'}
      </div>

      <footer className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0 || saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 disabled:opacity-50"
          onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
        >
          Back
        </button>

        {step < steps.length - 1 ? (
          <button
            type="button"
            disabled={!isStepValid(step, data) || saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            onClick={async () => {
              await saveStep();
              setStep((prev) => Math.min(prev + 1, steps.length - 1));
            }}
          >
            {saving ? 'Saving...' : 'Next'}
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={submitSession}
          >
            {saving ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </footer>

      <p className="text-xs text-slate-400">Session: {sessionId} · Candidate: {candidateId}</p>
    </section>
  );
}

function StepContent({
  step,
  data,
  setData,
  sessionId
}: {
  step: number;
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  sessionId: string;
}) {
  if (step === 0) {
    return <p className="text-slate-700">Welcome. This wizard takes around 8-10 minutes.</p>;
  }

  if (step === 1) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">CV upload is optional.</p>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !sessionId) return;
            const form = new FormData();
            form.append('sessionId', sessionId);
            form.append('file', file);
            const res = await fetch('/api/upload-cv', { method: 'POST', body: form });
            if (!res.ok) return;
            const payload = await res.json();
            setData((prev) => ({ ...prev, cvFilePath: payload.path }));
          }}
        />
        {data.cvFilePath ? <p className="text-xs text-emerald-700">Uploaded: {data.cvFilePath}</p> : null}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        {[
          ['likert_1', 'I can handle high-priority tasks calmly.'],
          ['likert_2', 'I communicate clearly under pressure.'],
          ['likert_3', 'I adapt quickly to changes.']
        ].map(([key, label]) => (
          <div key={key}>
            <p className="mb-2 text-sm text-slate-700">{label}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`rounded-md border px-3 py-1 text-sm ${
                    data[key as keyof WizardData] === score
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                  onClick={() => setData((prev) => ({ ...prev, [key]: score }))}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (step === 3) {
    return (
      <ChoiceBlock
        items={[
          {
            key: 'situational_1',
            label: 'A teammate misses a deadline. What do you do first?'
          },
          {
            key: 'situational_2',
            label: 'A stakeholder asks for conflicting priorities. How do you react?'
          }
        ]}
        data={data}
        setData={setData}
      />
    );
  }

  if (step === 4) {
    return (
      <YesNoBlock
        items={[
          { key: 'integrity_1', label: 'I represent information accurately in my work.' },
          { key: 'integrity_2', label: 'I raise concerns when I see policy violations.' }
        ]}
        data={data}
        setData={setData}
      />
    );
  }

  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p>Email: {data.email}</p>
      <p>CV: {data.cvFilePath ? 'Uploaded' : 'Skipped'}</p>
      <p>Likert answered: {data.likert_1 && data.likert_2 && data.likert_3 ? 'Yes' : 'No'}</p>
      <p>Situational answered: {data.situational_1 && data.situational_2 ? 'Yes' : 'No'}</p>
      <p>Integrity answered: {data.integrity_1 && data.integrity_2 ? 'Yes' : 'No'}</p>
    </div>
  );
}

function ChoiceBlock({
  items,
  data,
  setData
}: {
  items: Array<{ key: 'situational_1' | 'situational_2'; label: string }>;
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div className="space-y-4">
      {items.map(({ key, label }) => (
        <div key={key}>
          <p className="mb-2 text-sm text-slate-700">{label}</p>
          <div className="flex gap-2">
            {['A', 'B', 'C'].map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${
                  data[key] === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'
                }`}
                onClick={() => setData((prev) => ({ ...prev, [key]: value as 'A' | 'B' | 'C' }))}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function YesNoBlock({
  items,
  data,
  setData
}: {
  items: Array<{ key: 'integrity_1' | 'integrity_2'; label: string }>;
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div className="space-y-4">
      {items.map(({ key, label }) => (
        <div key={key}>
          <p className="mb-2 text-sm text-slate-700">{label}</p>
          <div className="flex gap-2">
            {['yes', 'no'].map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${
                  data[key] === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'
                }`}
                onClick={() => setData((prev) => ({ ...prev, [key]: value as 'yes' | 'no' }))}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

function isStartValid(data: WizardData) {
  return Boolean(data.email && data.termsAccepted && data.privacyAccepted);
}

function isStepValid(step: number, data: WizardData) {
  if (step === 0) return true;
  if (step === 1) return true;
  if (step === 2) return Boolean(data.likert_1 && data.likert_2 && data.likert_3);
  if (step === 3) return Boolean(data.situational_1 && data.situational_2);
  if (step === 4) return Boolean(data.integrity_1 && data.integrity_2);
  return true;
}

function getSectionByStep(step: number) {
  if (step === 1) return 'cv';
  if (step === 2) return 'likert';
  if (step === 3) return 'situational';
  if (step === 4) return 'integrity';
  if (step === 5) return 'review';
  return 'welcome';
}

function getAnswersByStep(step: number, data: WizardData): Record<string, unknown> {
  if (step === 1) return { cv_file_path: data.cvFilePath ?? null };
  if (step === 2) return { likert_1: data.likert_1, likert_2: data.likert_2, likert_3: data.likert_3 };
  if (step === 3) return { situational_1: data.situational_1, situational_2: data.situational_2 };
  if (step === 4) return { integrity_1: data.integrity_1, integrity_2: data.integrity_2 };
  return {};
}

function inferStepFromData(data: WizardData) {
  if (data.integrity_1 && data.integrity_2) return 5;
  if (data.situational_1 && data.situational_2) return 4;
  if (data.likert_1 && data.likert_2 && data.likert_3) return 3;
  if (data.cvFilePath) return 2;
  return 1;
}
