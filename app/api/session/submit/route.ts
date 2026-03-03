import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scoreV1 } from '@/lib/scoring';
import { scoreWaiterV2 } from '@/lib/scoringWaiterV2';
import { getSessionAnswers, markSubmitted } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId ?? '').trim();

    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await markSubmitted(sessionId);

    const answers = await getSessionAnswers(sessionId);
    const supabase = getSupabaseAdmin();
    const hasWaiterV2 = Object.prototype.hasOwnProperty.call(answers, 'likert_w_1');

    if (hasWaiterV2) {
      const v2 = scoreWaiterV2(answers);

      const { error: upErr } = await supabase.from('assessment_scores').upsert(
        {
          session_id: sessionId,
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
            debug: v2.debug
          }
        },
        { onConflict: 'session_id' }
      );

      if (upErr) throw upErr;

      return NextResponse.json({ success: true, scored: true, version: 'waiter_v2', overallFit: v2.overall_fit });
    }

    const scored = scoreV1(answers);

    const { error: upErr } = await supabase.from('assessment_scores').upsert(
      {
        session_id: sessionId,
        behaviour_score: scored.behaviour_score,
        soft_skill_score: scored.soft_skill_score,
        integrity_index: scored.integrity_index,
        experience_score: scored.experience_score,
        overall_fit: scored.overall_fit,
        score_json: { version: 'v1', reasons: scored.reasons, flags: scored.flags }
      },
      { onConflict: 'session_id' }
    );

    if (upErr) throw upErr;

    return NextResponse.json({ success: true, scored: true, version: 'v1', overallFit: scored.overall_fit });
  } catch (error) {
    console.error('submit-session failed', error);
    return NextResponse.json({ error: 'Failed to submit session' }, { status: 500 });
  }
}
