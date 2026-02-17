import { NextResponse } from 'next/server';
import { demoGuard } from '@/lib/demoAuth';
import { ensureDemoJob, getDemoRankingRows } from '@/lib/demoData';

export async function GET(request: Request) {
  const denied = demoGuard(request);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get('dryRun') === 'true') {
      return NextResponse.json({ ok: true, dryRun: true, top5: [], all: [] });
    }

    const demo = await ensureDemoJob();
    const rows = await getDemoRankingRows(demo.jobId);

    return NextResponse.json({
      ok: true,
      jobId: demo.jobId,
      jobToken: demo.jobToken,
      top5: rows.slice(0, 5),
      all: rows
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
