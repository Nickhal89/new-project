import { NextResponse } from 'next/server';
import { demoGuard } from '@/lib/demoAuth';
import { ensureDemoJob } from '@/lib/demoData';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const denied = demoGuard(request);
  if (denied) return denied;

  try {
    const demo = await ensureDemoJob();
    const supabase = getSupabaseAdmin();

    const { data: sessions, error: sessionsErr } = await supabase
      .from('assessment_sessions')
      .select('id,candidate_id')
      .eq('job_id', demo.jobId)
      .returns<Array<{ id: string; candidate_id: string }>>();

    if (sessionsErr) throw sessionsErr;

    const sessionIds = (sessions ?? []).map((s) => s.id);
    const candidateIds = Array.from(new Set((sessions ?? []).map((s) => s.candidate_id)));

    if (sessionIds.length > 0) {
      const { error: scoreErr } = await supabase.from('assessment_scores').delete().in('session_id', sessionIds);
      if (scoreErr) throw scoreErr;

      const { error: ansErr } = await supabase.from('assessment_answers').delete().in('session_id', sessionIds);
      if (ansErr) throw ansErr;

      const { error: consentErr } = await supabase.from('consents').delete().in('session_id', sessionIds);
      if (consentErr) throw consentErr;

      const { error: sessionErr } = await supabase.from('assessment_sessions').delete().in('id', sessionIds);
      if (sessionErr) throw sessionErr;
    }

    if (candidateIds.length > 0) {
      const { error: candidateErr } = await supabase.from('candidates').delete().in('id', candidateIds);
      if (candidateErr) throw candidateErr;
    }

    return NextResponse.json({ ok: true, clearedSessions: sessionIds.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
