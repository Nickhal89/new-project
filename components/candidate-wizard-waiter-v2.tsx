'use client';

import { FormEvent, useMemo, useState } from 'react';
import { WAITER_ITEM_BANK_V1, type LikertItem, type TradeoffItem, type ValidityItem } from '@/lib/itemBank';

type WizardProps = { jobToken: string };

type WaiterAnswers = Record<string, string | number>;

type WizardState = {
  email: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cvProcessingAccepted: boolean;
  answers: WaiterAnswers;
};

const SESSION_KEY_PREFIX = 'crossroads_waiter_v2_';
const steps = ['Έναρξη', 'Core Skills (Likert)', 'Trade-offs & Consistency', 'Review'];

const likertItems = WAITER_ITEM_BANK_V1.filter((i): i is LikertItem => i.type === 'likert');
const tradeoffItems = WAITER_ITEM_BANK_V1.filter((i): i is TradeoffItem => i.type === 'tradeoff');
const validityItems = WAITER_ITEM_BANK_V1.filter((i): i is ValidityItem => i.type === 'validity');

export default function CandidateWizardWaiterV2({ jobToken }: WizardProps) {
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [state, setState] = useState<WizardState>({
    email: '',
    termsAccepted: false,
    privacyAccepted: false,
    cvProcessingAccepted: false,
    answers: {}
  });

  const progress = useMemo(() => Math.round((step / (steps.length - 1)) * 100), [step]);

  const startSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStartValid(state)) return;

    setSaving(true);
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobToken,
        email: state.email,
        termsAccepted: state.termsAccepted,
        privacyAccepted: state.privacyAccepted,
        cvProcessingAccepted: state.cvProcessingAccepted
      })
    });
    setSaving(false);
    if (!res.ok) return;

    const payload = await res.json();
    setSessionId(payload.sessionId);
    setStarted(true);
    setStep(1);

    const mergedAnswers = { ...state.answers, ...(payload.answers ?? {}) };
    const mergedState = { ...state, answers: mergedAnswers };
    setState(mergedState);

    localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}`, payload.sessionId);
    localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}_state`, JSON.stringify(mergedState));
  };

  const resume = async () => {
    const savedState = localStorage.getItem(`${SESSION_KEY_PREFIX}${jobToken}_state`);
    const savedSession = localStorage.getItem(`${SESSION_KEY_PREFIX}${jobToken}`);
    if (!savedState || !savedSession) return;

    try {
      const parsed = JSON.parse(savedState) as WizardState;
      setState(parsed);
      setSessionId(savedSession);
      setStarted(true);
      setStep(inferStep(parsed.answers));
    } catch {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}`);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}_state`);
    }
  };

  const saveCurrentStep = async () => {
    if (!sessionId) return;
    const answers = getAnswersForStep(step, state.answers);

    setSaving(true);
    const res = await fetch('/api/session/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, step, section: getSection(step), answers })
    });
    setSaving(false);

    if (res.ok) {
      localStorage.setItem(`${SESSION_KEY_PREFIX}${jobToken}_state`, JSON.stringify(state));
    }
  };

  const submit = async () => {
    if (!sessionId) return;
    await saveCurrentStep();

    setSaving(true);
    const res = await fetch('/api/session/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    setSaving(false);

    if (res.ok) {
      setSubmitDone(true);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}`);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${jobToken}_state`);
    }
  };

  if (!started) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Crossroads HR — Waiter v2 (Pilot)</h1>
        <p className="mt-2 text-sm text-slate-600">Σύντομο pilot test 18 ερωτήσεων.</p>

        <form className="mt-6 space-y-4" onSubmit={startSession}>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={state.email}
              onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <CheckboxRow
            checked={state.termsAccepted}
            onChange={(v) => setState((prev) => ({ ...prev, termsAccepted: v }))}
            label="Αποδέχομαι τους όρους αξιολόγησης (υποχρεωτικό)"
          />
          <CheckboxRow
            checked={state.privacyAccepted}
            onChange={(v) => setState((prev) => ({ ...prev, privacyAccepted: v }))}
            label="Αποδέχομαι την πολιτική απορρήτου (υποχρεωτικό)"
          />
          <CheckboxRow
            checked={state.cvProcessingAccepted}
            onChange={(v) => setState((prev) => ({ ...prev, cvProcessingAccepted: v }))}
            label="Συναινώ στην επεξεργασία βιογραφικού (προαιρετικό)"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!isStartValid(state) || saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? 'Starting...' : 'Έναρξη'}
            </button>
            <button
              type="button"
              onClick={resume}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700"
            >
              Συνέχεια προηγούμενης συνεδρίας
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (submitDone) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-emerald-700">Η αξιολόγηση ολοκληρώθηκε</h2>
        <p className="mt-2 text-sm text-slate-600">Ευχαριστούμε. Η ομάδα θα εξετάσει τα αποτελέσματα.</p>
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

      {step === 1 ? <LikertSection answers={state.answers} setAnswers={(a) => updateAnswers(setState, a)} /> : null}
      {step === 2 ? <TradeValiditySection answers={state.answers} setAnswers={(a) => updateAnswers(setState, a)} /> : null}
      {step === 3 ? <ReviewSection answers={state.answers} /> : null}

      <footer className="flex items-center justify-between">
        <button
          type="button"
          disabled={step <= 1 || saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 disabled:opacity-50"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          Πίσω
        </button>

        {step < 3 ? (
          <button
            type="button"
            disabled={!isStepValid(step, state.answers) || saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            onClick={async () => {
              await saveCurrentStep();
              setStep((s) => Math.min(3, s + 1));
            }}
          >
            {saving ? 'Saving...' : 'Επόμενο'}
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={submit}
          >
            {saving ? 'Submitting...' : 'Υποβολή'}
          </button>
        )}
      </footer>
    </section>
  );
}

function LikertSection({
  answers,
  setAnswers
}: {
  answers: WaiterAnswers;
  setAnswers: (next: WaiterAnswers) => void;
}) {
  return (
    <div className="space-y-5">
      {likertItems.map((item) => (
        <div key={item.question_id}>
          <p className="mb-2 text-sm text-slate-700">{item.prompt_el}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${
                  Number(answers[item.question_id]) === v
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white'
                }`}
                onClick={() => setAnswers({ ...answers, [item.question_id]: v })}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TradeValiditySection({
  answers,
  setAnswers
}: {
  answers: WaiterAnswers;
  setAnswers: (next: WaiterAnswers) => void;
}) {
  return (
    <div className="space-y-6">
      {tradeoffItems.map((item) => (
        <div key={item.question_id}>
          <p className="mb-2 text-sm text-slate-700">{item.prompt_el}</p>
          <div className="flex gap-2">
            {item.choices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${
                  String(answers[item.question_id] ?? '') === choice.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white'
                }`}
                onClick={() => setAnswers({ ...answers, [item.question_id]: choice.key })}
              >
                {choice.key}: {choice.text_el}
              </button>
            ))}
          </div>
        </div>
      ))}

      {validityItems.map((item) => (
        <div key={item.question_id}>
          <p className="mb-2 text-sm text-slate-700">{item.prompt_el}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${
                  Number(answers[item.question_id]) === v
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white'
                }`}
                onClick={() => setAnswers({ ...answers, [item.question_id]: v })}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewSection({ answers }: { answers: WaiterAnswers }) {
  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p>Συνολικές απαντήσεις: {answered}</p>
      <p>Likert: {likertItems.filter((i) => answers[i.question_id] !== undefined).length} / {likertItems.length}</p>
      <p>
        Trade-offs: {tradeoffItems.filter((i) => answers[i.question_id] !== undefined).length} / {tradeoffItems.length}
      </p>
      <p>
        Validity: {validityItems.filter((i) => answers[i.question_id] !== undefined).length} / {validityItems.length}
      </p>
    </div>
  );
}

function updateAnswers(
  setState: React.Dispatch<React.SetStateAction<WizardState>>,
  nextAnswers: WaiterAnswers
) {
  setState((prev) => ({ ...prev, answers: nextAnswers }));
}

function isStartValid(state: WizardState) {
  return Boolean(state.email && state.termsAccepted && state.privacyAccepted);
}

function isStepValid(step: number, answers: WaiterAnswers) {
  if (step === 1) return likertItems.every((i) => answers[i.question_id] !== undefined);
  if (step === 2)
    return (
      tradeoffItems.every((i) => answers[i.question_id] !== undefined) &&
      validityItems.every((i) => answers[i.question_id] !== undefined)
    );
  return true;
}

function getAnswersForStep(step: number, answers: WaiterAnswers) {
  if (step === 1) {
    return Object.fromEntries(likertItems.map((i) => [i.question_id, answers[i.question_id]]));
  }

  if (step === 2) {
    return Object.fromEntries(
      [...tradeoffItems, ...validityItems].map((i) => [i.question_id, answers[i.question_id]])
    );
  }

  return {};
}

function getSection(step: number) {
  if (step === 1) return 'waiter_v2_likert';
  if (step === 2) return 'waiter_v2_tradeoff_validity';
  return 'waiter_v2_review';
}

function inferStep(answers: WaiterAnswers) {
  const likertDone = likertItems.every((i) => answers[i.question_id] !== undefined);
  const restDone =
    tradeoffItems.every((i) => answers[i.question_id] !== undefined) &&
    validityItems.every((i) => answers[i.question_id] !== undefined);

  if (likertDone && restDone) return 3;
  if (likertDone) return 2;
  return 1;
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
