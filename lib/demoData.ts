import { getSupabaseAdmin } from '@/lib/supabase';
import { DEMO_COMPANY_NAME, DEMO_JOB_TOKEN } from '@/lib/demoConfig';

export async function ensureDemoJob() {
  const supabase = getSupabaseAdmin();

  const { data: existingCompany, error: companyFindError } = await supabase
    .from('companies')
    .select('id,name')
    .eq('name', DEMO_COMPANY_NAME)
    .maybeSingle<{ id: string; name: string }>();

  if (companyFindError) throw companyFindError;

  let companyId = existingCompany?.id;
  if (!companyId) {
    const { data: createdCompany, error: companyCreateError } = await supabase
      .from('companies')
      .insert({ name: DEMO_COMPANY_NAME })
      .select('id,name')
      .single<{ id: string; name: string }>();
    if (companyCreateError) throw companyCreateError;
    companyId = createdCompany.id;
  }

  const { data: existingJob, error: jobFindError } = await supabase
    .from('jobs')
    .select('id,job_token,company_id')
    .eq('job_token', DEMO_JOB_TOKEN)
    .maybeSingle<{ id: string; job_token: string; company_id: string }>();

  if (jobFindError) throw jobFindError;

  if (existingJob) {
    return { companyId, jobId: existingJob.id, jobToken: existingJob.job_token };
  }

  const { data: createdJob, error: jobCreateError } = await supabase
    .from('jobs')
    .insert({
      company_id: companyId,
      job_token: DEMO_JOB_TOKEN,
      title: 'Demo Waiter / Service Staff',
      profile_id: 'waiter_service_v1'
    })
    .select('id,job_token,company_id')
    .single<{ id: string; job_token: string; company_id: string }>();

  if (jobCreateError) throw jobCreateError;

  return { companyId, jobId: createdJob.id, jobToken: createdJob.job_token };
}

export async function getDemoRankingRows(jobId: string) {
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
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const email = r.assessment_sessions?.candidates?.email ?? 'unknown@example.com';
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
      topCompetencies,
      why
    };
  });
}
