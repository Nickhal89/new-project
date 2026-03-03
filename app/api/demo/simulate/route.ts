import { NextResponse } from 'next/server';
import { demoGuard } from '@/lib/demoAuth';
import { ensureDemoJob, getDemoRankingRows } from '@/lib/demoData';
import { generateWaiterV2RandomAnswers } from '@/lib/demoRandomizer';
import { getOrCreateCandidate, getOrCreateSession, markSubmitted, saveAnswers, upsertConsents } from '@/lib/session';
import { scoreWaiterV2 } from '@/lib/scoringWaiterV2';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const denied = demoGuard(request);
  if (denied) return denied;

  const logs: string[] = [];

  try {
    const body = (await request.json().catch(() => ({}))) as { count?: number };
    const rawCount = Number(body.count ?? 10);
    const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(30, rawCount)) : 10;

    const demo = await ensureDemoJob();
    const supabase = getSupabaseAdmin();

    for (let i = 0; i < count; i++) {
      const email = `demo.candidate.${Date.now()}.${i}@example.com`;
      const candidate = await getOrCreateCandidate(email);
      const session = await getOrCreateSession(demo.jobId, candidate.id);

      await upsertConsents({
        candidateId: candidate.id,
        sessionId: session.id,
        consentTerms: true,
        consentPrivacy: true,
        consentCvProcessing: false
      });

      const answers = generateWaiterV2RandomAnswers();
      await saveAnswers(session.id, answers);
      await markSubmitted(session.id);

      const v2 = scoreWaiterV2(answers);
      const { error: upErr } = await supabase.from('assessment_scores').upsert(
        {
          session_id: session.id,
          behaviour_score: 0,
          soft_skill_score: 0,
          integrity_index: v2.validity.integrity_index,
          experience_score: 0,
          overall_fit: v2.overall_fit,
          score_json: {
            version: 'waiter_v2',
            profile_id: v2.profile_id,
            competencies: v2.competencies,
            validity: v2.validity,
            why_hr_el: v2.why_hr_el,
            debug: v2.debug,
            synthetic: true
          }
        },
        { onConflict: 'session_id' }
      );
      if (upErr) throw upErr;

      logs.push(`Created candidate ${i + 1}/${count}`);
    }

    const rows = await getDemoRankingRows(demo.jobId);

    return NextResponse.json({
      ok: true,
      candidateCount: count,
      logs,
      top5: rows.slice(0, 5),
      allCount: rows.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        logs,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
