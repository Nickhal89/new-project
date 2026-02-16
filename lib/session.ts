import { getSupabaseAdmin } from '@/lib/supabase';

type CandidateRow = { id: string; email: string };
type JobRow = { id: string; company_id: string; job_token: string };

type AnswerRow = {
  question_id: string;
  answer_value: string;
  answered_at: string;
};

export async function getJobByToken(jobToken: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, company_id, job_token')
    .eq('job_token', jobToken)
    .maybeSingle<JobRow>();

  if (error) throw error;
  return data;
}

export async function getOrCreateCandidate(email: string) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing, error: findError } = await supabase
    .from('candidates')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle<CandidateRow>();

  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('candidates')
    .insert({ email: normalizedEmail })
    .select('id, email')
    .single<CandidateRow>();

  if (createError) throw createError;
  return created;
}

export async function getOrCreateSession(jobId: string, candidateId: string) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from('assessment_sessions')
    .select('id, status')
    .eq('job_id', jobId)
    .eq('candidate_id', candidateId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: 'in_progress' | 'submitted' | 'completed' }>();

  if (existingError) throw existingError;
  if (existing && existing.status === 'in_progress') return existing;

  const { data: created, error: createError } = await supabase
    .from('assessment_sessions')
    .insert({ job_id: jobId, candidate_id: candidateId, status: 'in_progress', current_step: 0 })
    .select('id, status')
    .single<{ id: string; status: 'in_progress' }>();

  if (createError) throw createError;
  return created;
}

export async function upsertConsents(params: {
  candidateId: string;
  sessionId: string;
  consentTerms: boolean;
  consentPrivacy: boolean;
  consentCvProcessing: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const { candidateId, sessionId, consentTerms, consentPrivacy, consentCvProcessing } = params;

  const { error } = await supabase.from('consents').insert({
    candidate_id: candidateId,
    session_id: sessionId,
    consent_terms: consentTerms,
    consent_privacy: consentPrivacy,
    consent_cv_processing: consentCvProcessing
  });

  if (error) throw error;
}

export async function getSessionAnswers(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('assessment_answers')
    .select('question_id, answer_value, answered_at')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })
    .returns<AnswerRow[]>();

  if (error) throw error;

  const answers: Record<string, unknown> = {};
  for (const row of data ?? []) {
    answers[row.question_id] = row.answer_value;
  }

  return answers;
}

export async function saveAnswers(sessionId: string, answers: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();

  const payload = Object.entries(answers).map(([questionId, answer]) => ({
    session_id: sessionId,
    question_id: questionId,
    answer_value: String(answer),
    answered_at: new Date().toISOString()
  }));

  if (!payload.length) return;

  const { error } = await supabase
    .from('assessment_answers')
    .upsert(payload, { onConflict: 'session_id,question_id' });

  if (error) throw error;
}

export async function markSubmitted(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('assessment_sessions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'in_progress');

  if (error) throw error;
}
