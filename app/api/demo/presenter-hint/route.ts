import { NextResponse } from 'next/server';
import { verifyAdminOrPresenterToken } from '@/lib/demoAuth';
import { getDemoViewKey, isDemoModeEnabled } from '@/lib/demoConfig';

function buildHint() {
  const key = getDemoViewKey();
  if (!key) return 'Ο presenter θα σας δώσει passcode πριν το demo.';

  const trimmed = key.trim();
  if (trimmed.length <= 2) return `Κωδικός μορφής: ••${trimmed}`;
  return `Hint passcode: ••••${trimmed.slice(-2)}`;
}

export async function GET(request: Request) {
  if (!verifyAdminOrPresenterToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    demoMode: isDemoModeEnabled(),
    hint: buildHint()
  });
}
