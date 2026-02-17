import { NextResponse } from 'next/server';
import { demoGuard } from '@/lib/demoAuth';
import { ensureDemoJob } from '@/lib/demoData';

export async function POST(request: Request) {
  const denied = demoGuard(request);
  if (denied) return denied;

  try {
    const seeded = await ensureDemoJob();
    return NextResponse.json({ ok: true, ...seeded });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
