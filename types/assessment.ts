export type SessionStatus = 'in_progress' | 'submitted';

export type StartSessionResponse = {
  sessionId: string;
  candidateId: string;
  status: SessionStatus;
  currentStep: number;
  answers: Record<string, unknown>;
};

export type AnswerPayload = {
  step: number;
  section: string;
  answers: Record<string, unknown>;
};
