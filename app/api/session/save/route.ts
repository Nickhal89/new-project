import { NextResponse } from 'next/server';
import { saveAnswers } from '@/lib/session';
import { getInsightTeaser } from '@/lib/insights';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId ?? '');
    const section = String(body.section ?? '');
    const step = Number(body.step ?? 0);
    const answers = (body.answers ?? {}) as Record<string, unknown>;

    if (!sessionId || !section || Number.isNaN(step) || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await saveAnswers(sessionId, answers);

    return NextResponse.json({ success: true, insight: getInsightTeaser(step, answers) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
