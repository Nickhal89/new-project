import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionAnswers } from '@/lib/session';
import { scoreV1 } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId ?? '').trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: session, error: sErr } = await supabase
      .from('assessment_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle<{ id: string; status: string }>();

    if (sErr) throw sErr;
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const answers = await getSessionAnswers(sessionId);
    const scored = scoreV1(answers);

    const { error: upErr } = await supabase.from('assessment_scores').upsert(
      {
        session_id: sessionId,
        behaviour_score: scored.behaviour_score,
        soft_skill_score: scored.soft_skill_score,
        integrity_index: scored.integrity_index,
        experience_score: scored.experience_score,
        overall_fit: scored.overall_fit,
        score_json: { reasons: scored.reasons, flags: scored.flags }
      },
      { onConflict: 'session_id' }
    );

    if (upErr) throw upErr;

    return NextResponse.json({
      sessionId,
      scores: {
        behaviour: scored.behaviour_score,
        softSkills: scored.soft_skill_score,
        integrity: scored.integrity_index,
        experience: scored.experience_score,
        overallFit: scored.overall_fit
      },
      reasons: scored.reasons,
      flags: scored.flags
    });
  } catch (error) {
    console.error('score-session failed', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
