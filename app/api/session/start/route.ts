import { NextResponse } from 'next/server';
import {
  getJobByToken,
  getOrCreateCandidate,
  getOrCreateSession,
  getSessionAnswers,
  upsertConsents
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? '').trim().toLowerCase();
    const jobToken = String(body.jobToken ?? '').trim();

    const termsAccepted = Boolean(body.termsAccepted);
    const privacyAccepted = Boolean(body.privacyAccepted);
    const cvProcessingAccepted = Boolean(body.cvProcessingAccepted);

    if (!email || !jobToken || !termsAccepted || !privacyAccepted) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const job = await getJobByToken(jobToken);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const candidate = await getOrCreateCandidate(email);
    const session = await getOrCreateSession(job.id, candidate.id);

    await upsertConsents({
      candidateId: candidate.id,
      sessionId: session.id,
      consentTerms: termsAccepted,
      consentPrivacy: privacyAccepted,
      consentCvProcessing: cvProcessingAccepted
    });

    const answers = await getSessionAnswers(session.id);

    return NextResponse.json({
      sessionId: session.id,
      candidateId: candidate.id,
      status: session.status,
      currentStep: inferCurrentStep(answers),
      answers
    });
  } catch (error) {
    console.error('start-session failed', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}

// 0-based steps (MVP)
function inferCurrentStep(answers: Record<string, unknown>) {
  // Step mapping:
  // 0 Welcome
  // 1 CV Upload
  // 2 Likert
  // 3 Situational
  // 4 Integrity
  // 5 Review

  if (answers.integrity_1 || answers.integrity_2) return 5;
  if (answers.situational_1 || answers.situational_2) return 4;
  if (answers.likert_1 || answers.likert_2 || answers.likert_3) return 3;
  if (answers.cv_file_path) return 2;
  return 1;
}
