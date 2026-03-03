export type ScoreResult = {
  behaviour_score: number;
  soft_skill_score: number;
  integrity_index: number;
  experience_score: number;
  overall_fit: number;
  reasons: string[];
  flags: string[];
};

const WEIGHTS = {
  behaviour: 0.35,
  soft: 0.35,
  integrity: 0.2,
  experience: 0.1
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function toNumber1to5(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

function toYesNo(v: unknown): 'yes' | 'no' | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'yes') return 'yes';
  if (s === 'no') return 'no';
  return null;
}

function toABC(v: unknown): 'A' | 'B' | 'C' | null {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C') return s;
  return null;
}

export function scoreV1(answers: Record<string, unknown>): ScoreResult {
  const reasons: string[] = [];
  const flags: string[] = [];

  const likerts = ['likert_1', 'likert_2', 'likert_3']
    .map((k) => toNumber1to5(answers[k]))
    .filter((n): n is number => n !== null);

  let behaviour = 0;
  if (likerts.length) {
    const avg = likerts.reduce((a, b) => a + b, 0) / likerts.length;
    behaviour = clamp(((avg - 1) / 4) * 100);
    if (avg >= 4) reasons.push('Strong alignment in core work-style indicators.');
    else if (avg >= 3) reasons.push('Balanced behavioural signals across key indicators.');
    else reasons.push('High variability across core indicators; clarify in interview.');
  } else {
    flags.push('missing_behaviour_section');
  }

  const situ = ['situational_1', 'situational_2']
    .map((k) => toABC(answers[k]))
    .filter((v): v is 'A' | 'B' | 'C' => v !== null);

  const mapABC = (v: 'A' | 'B' | 'C') => {
    if (v === 'B') return 80;
    if (v === 'C') return 55;
    return 30;
  };

  let soft = 0;
  if (situ.length) {
    soft = clamp(situ.map(mapABC).reduce((a, b) => a + b, 0) / situ.length);
    if (soft >= 75) reasons.push('Decision pattern supports service-quality and teamwork contexts.');
    else if (soft >= 55) reasons.push('Decision pattern is workable; role-fit depends on team context.');
    else reasons.push('Decision pattern may require stronger coaching/structure.');
  } else {
    flags.push('missing_soft_section');
  }

  const i1 = toYesNo(answers.integrity_1);
  const i2 = toYesNo(answers.integrity_2);

  let integrity = 50;
  if (i1 && i2) {
    if (i1 === 'yes' && i2 === 'yes') integrity = 75;
    else if (i1 === 'no' && i2 === 'no') integrity = 65;
    else integrity = 45;

    if (integrity < 55) flags.push('lower_response_consistency');
  } else {
    flags.push('missing_integrity_section');
    integrity = 50;
  }

  const hasCV = typeof answers.cv_file_path === 'string' && String(answers.cv_file_path).length > 0;
  const experience = hasCV ? 60 : 0;
  if (hasCV) reasons.push('Candidate provided a CV for improved matching accuracy.');
  else flags.push('no_cv_provided');

  const overall =
    WEIGHTS.behaviour * behaviour +
    WEIGHTS.soft * soft +
    WEIGHTS.integrity * integrity +
    WEIGHTS.experience * experience;

  return {
    behaviour_score: clamp(behaviour),
    soft_skill_score: clamp(soft),
    integrity_index: clamp(integrity),
    experience_score: clamp(experience),
    overall_fit: clamp(overall),
    reasons: reasons.slice(0, 5),
    flags
  };
}
