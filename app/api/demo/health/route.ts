import { NextResponse } from 'next/server';
import { isDemoModeEnabled } from '@/lib/demoConfig';
import { verifyDemoOrAdmin } from '@/lib/demoAuth';

export async function GET(request: Request) {
  if (!verifyDemoOrAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks = {
    demoMode: isDemoModeEnabled(),
    supabaseUrl: Boolean(String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()),
    supabaseAnon: Boolean(String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()),
    supabaseService: Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()),
    demoViewKey: Boolean(String(process.env.DEMO_VIEW_KEY ?? '').trim())
  };

  return NextResponse.json({
    ok: Object.values(checks).every(Boolean),
    checks
  });
}
