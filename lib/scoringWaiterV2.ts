import { WAITER_ITEM_BANK_V1, WAITER_PROFILE_V1 } from './itemBank/index.ts';

type V2Result = {
  profile_id: string;
  overall_fit: number;
  competencies: Record<
    'service' | 'stress' | 'teamwork' | 'reliability' | 'learning' | 'integrity',
    number
  >;
  validity: {
    flags: string[];
    integrity_index: number;
  };
  why_hr_el: string[];
  debug?: {
    counts: { likert: number; sjt: number; tradeoff: number; validity: number };
  };
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toABC(v: unknown): 'A' | 'B' | 'C' | null {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C') return s;
  return null;
}

function scoreLikert1to5(raw: number, reverse?: boolean) {
  const v = clamp(raw, 1, 5);
  const normalized0to5 = reverse ? 6 - v : v;
  return normalized0to5;
}

function avgOrZero(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function asPct0to100(avg1to5: number) {
  return clamp(((avg1to5 - 1) / 4) * 100);
}

function tradeoffPointsTo0to5(points: number) {
  const capped = Math.max(0, Math.min(points, 12));
  return (capped / 12) * 5;
}

export function scoreWaiterV2(answers: Record<string, unknown>): V2Result {
  const compBuckets: Record<
    'service' | 'stress' | 'teamwork' | 'reliability' | 'learning' | 'integrity',
    { likert: number[]; sjt: number[]; trade: number }
  > = {
    service: { likert: [], sjt: [], trade: 0 },
    stress: { likert: [], sjt: [], trade: 0 },
    teamwork: { likert: [], sjt: [], trade: 0 },
    reliability: { likert: [], sjt: [], trade: 0 },
    learning: { likert: [], sjt: [], trade: 0 },
    integrity: { likert: [], sjt: [], trade: 0 }
  };

  const validityFlags: string[] = [];
  let validityCount = 0;
  let likertCount = 0;
  let sjtCount = 0;
  let tradeCount = 0;

  for (const item of WAITER_ITEM_BANK_V1) {
    const raw = answers[item.question_id];

    if (item.type === 'likert') {
      const n = toNumber(raw);
      if (n === null) continue;
      const scored1to5 = scoreLikert1to5(n, item.scoring.reverse);
      compBuckets[item.competency].likert.push(scored1to5);
      likertCount++;
      continue;
    }

    if (item.type === 'sjt') {
      const ch = toABC(raw);
      if (!ch) continue;
      const opt = item.options.find((o) => o.key === ch);
      if (!opt) continue;
      compBuckets[item.competency].sjt.push(clamp(opt.weight_0_5, 0, 5));
      sjtCount++;
      continue;
    }

    if (item.type === 'tradeoff') {
      const s = String(raw ?? '').trim().toUpperCase();
      if (s !== 'A' && s !== 'B') continue;
      const choice = item.choices.find((c) => c.key === s);
      if (!choice) continue;
      for (const [k, pts] of Object.entries(choice.mapping)) {
        const key = k as keyof typeof compBuckets;
        if (!compBuckets[key] || typeof pts !== 'number') continue;
        compBuckets[key].trade += pts;
      }
      tradeCount++;
      continue;
    }

    if (item.type === 'validity') {
      const n = toNumber(raw);
      if (n === null) continue;
      validityCount++;
      if (n >= item.scoring.threshold_gte) {
        validityFlags.push(item.scoring.flag);
      }
      continue;
    }
  }

  const competencies = {
    service: 0,
    stress: 0,
    teamwork: 0,
    reliability: 0,
    learning: 0,
    integrity: 0
  };

  for (const key of Object.keys(competencies) as Array<keyof typeof competencies>) {
    const b = compBuckets[key];

    const likertAvg = avgOrZero(b.likert) || 0;
    const sjtAvg0to5 = avgOrZero(b.sjt) || 0;
    const sjtAs1to5 = 1 + (clamp(sjtAvg0to5, 0, 5) / 5) * 4;
    const trade0to5 = tradeoffPointsTo0to5(b.trade);
    const tradeAs1to5 = 1 + (clamp(trade0to5, 0, 5) / 5) * 4;

    const mixed1to5 =
      0.5 * (likertAvg || 0) + 0.35 * (sjtAs1to5 || 0) + 0.15 * (tradeAs1to5 || 0);

    competencies[key] = asPct0to100(mixed1to5 || 1);
  }

  let integrityIndex = competencies.integrity;
  if (validityFlags.includes('impression_management')) integrityIndex -= 10;
  if (validityFlags.includes('unrealistic_self_presentation')) integrityIndex -= 10;
  integrityIndex = clamp(integrityIndex);

  const w = WAITER_PROFILE_V1.weights;
  const overall =
    w.service * competencies.service +
    w.stress * competencies.stress +
    w.reliability * competencies.reliability +
    w.teamwork * competencies.teamwork +
    w.learning * competencies.learning +
    w.integrity * integrityIndex;

  const sorted = (Object.entries(competencies) as Array<[keyof typeof competencies, number]>).sort(
    (a, b) => b[1] - a[1]
  );

  const labels: Record<keyof typeof competencies, string> = {
    service: 'Εξυπηρέτηση & φιλοξενία',
    stress: 'Αντοχή σε πίεση',
    teamwork: 'Ομαδικότητα',
    reliability: 'Συνέπεια/ακρίβεια',
    learning: 'Ταχύτητα εκμάθησης',
    integrity: 'Ακεραιότητα/κανόνες'
  };

  const why: string[] = [];
  const top1 = sorted[0];
  const top2 = sorted[1];
  const low1 = sorted[sorted.length - 1];

  if (top1) why.push(`Ισχυρό σημείο: ${labels[top1[0]]} (${Math.round(top1[1])}/100).`);
  if (top2) why.push(`Δεύτερο δυνατό σημείο: ${labels[top2[0]]} (${Math.round(top2[1])}/100).`);

  if (competencies.service >= 70 && competencies.stress >= 65) {
    why.push('Καλή προσαρμογή για peak περιβάλλον με απαιτητική εξυπηρέτηση.');
  } else if (competencies.service >= 70) {
    why.push('Ισχυρή εξυπηρέτηση — χρειάζεται υποστήριξη σε peak διαχείριση.');
  } else if (competencies.stress >= 70) {
    why.push('Αντέχει πίεση — θέλει ενίσχυση σε καθαρή service επικοινωνία.');
  }

  if (low1) {
    const risk = low1[1] < 55 ? 'Πιθανό σημείο coaching:' : 'Σημείο προσοχής:';
    why.push(`${risk} ${labels[low1[0]]} (${Math.round(low1[1])}/100).`);
  }

  if (validityFlags.length) {
    why.push(
      'Σημείωση: εντοπίστηκαν ενδείξεις “πολύ τέλειας” αυτοπαρουσίασης — προτείνεται σύντομο consistency check στη συνέντευξη.'
    );
  }

  return {
    profile_id: WAITER_PROFILE_V1.id,
    overall_fit: clamp(overall),
    competencies,
    validity: { flags: validityFlags, integrity_index: integrityIndex },
    why_hr_el: why.slice(0, 5),
    debug: {
      counts: { likert: likertCount, sjt: sjtCount, tradeoff: tradeCount, validity: validityCount }
    }
  };
}
