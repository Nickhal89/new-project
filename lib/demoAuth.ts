import { NextResponse } from 'next/server';
import { getDemoViewKey, isDemoModeEnabled } from '@/lib/demoConfig';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const ipHits = new Map<string, { count: number; resetAt: number }>();

export function readClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown';
}

export function applyDemoRateLimit(request: Request) {
  const ip = readClientIp(request);
  const now = Date.now();
  const current = ipHits.get(ip);

  if (!current || current.resetAt <= now) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true as const };
  }

  if (current.count >= RATE_LIMIT) {
    return { ok: false as const, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  ipHits.set(ip, current);
  return { ok: true as const };
}

export function verifyDemoKey(request: Request) {
  const expected = getDemoViewKey();
  if (!expected) return false;

  const provided = String(request.headers.get('x-demo-key') ?? '').trim();
  return provided.length > 0 && provided === expected;
}

export function verifyAdminOrPresenterToken(request: Request) {
  const admin = String(process.env.ADMIN_TOKEN ?? '').trim();
  const presenter = String(process.env.PRESENTER_TOKEN ?? '').trim();

  const adminProvided = String(request.headers.get('x-admin-token') ?? '').trim();
  const presenterProvided = String(request.headers.get('x-presenter-token') ?? '').trim();

  if (admin && adminProvided && adminProvided === admin) return true;
  if (presenter && presenterProvided && presenterProvided === presenter) return true;

  return false;
}

export function verifyDemoOrAdmin(request: Request) {
  if (verifyDemoKey(request)) return true;

  const admin = String(process.env.ADMIN_TOKEN ?? '').trim();
  const adminProvided = String(request.headers.get('x-admin-token') ?? '').trim();
  return Boolean(admin && adminProvided && adminProvided === admin);
}

export function demoGuard(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: 'Demo mode is disabled' }, { status: 403 });
  }

  if (!verifyDemoKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = applyDemoRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec }, { status: 429 });
  }

  return null;
}
