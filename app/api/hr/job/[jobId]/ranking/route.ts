import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyCompanyTokenForJob } from '@/lib/hrAuth';

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  try {
    const jobId = String(params.jobId ?? '').trim();
    if (!jobId) return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });

    const url = new URL(request.url);
    const token = (url.searchParams.get('token') ?? request.headers.get('x-hr-token') ?? '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const auth = await verifyCompanyTokenForJob({ jobId, token });
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('assessment_scores')
      .select(
        `
        session_id,
        overall_fit,
        behaviour_score,
        soft_skill_score,
        integrity_index,
        experience_score,
        score_json,
        assessment_sessions!inner (
          job_id,
          candidate_id,
          status,
          submitted_at,
          candidates!inner ( email )
        )
      `
      )
      .eq('assessment_sessions.job_id', jobId)
      .neq('assessment_sessions.status', 'in_progress')
      .order('overall_fit', { ascending: false })
      .limit(50);

    if (error) throw error;

    const rows = (data ?? []).map((r: any) => {
      const email = r.assessment_sessions?.candidates?.email ?? 'unknown';
      const version = r.score_json?.version ?? 'v1';

      let why: string[] = [];
      let topCompetencies: Array<{ key: string; score: number }> = [];

      if (version === 'waiter_v2') {
        why = Array.isArray(r.score_json?.why_hr_el) ? r.score_json.why_hr_el.slice(0, 3) : [];
        const comps = r.score_json?.competencies ?? {};
        const entries = Object.entries(comps)
          .map(([k, v]) => ({ key: String(k), score: Number(v) }))
          .filter((x) => Number.isFinite(x.score))
          .sort((a, b) => b.score - a.score);
        topCompetencies = entries.slice(0, 2);
      } else {
        const reasons = r.score_json?.reasons ?? [];
        why = Array.isArray(reasons) ? reasons.slice(0, 3) : [];
      }

      return {
        sessionId: r.session_id,
        candidateEmail: email,
        version,
        overallFit: Number(r.overall_fit ?? 0),
        breakdown: {
          behaviour: Number(r.behaviour_score ?? 0),
          softSkills: Number(r.soft_skill_score ?? 0),
          integrity: Number(r.integrity_index ?? 0),
          experience: Number(r.experience_score ?? 0)
        },
        topCompetencies,
        why
      };
    });

    return NextResponse.json({ jobId, top5: rows.slice(0, 5), all: rows });
  } catch (error) {
    console.error('hr-ranking failed', error);
    return NextResponse.json({ error: 'Ranking failed' }, { status: 500 });
  }
}
