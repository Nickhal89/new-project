import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import HrRankingTable from '@/components/hr-ranking-table';

export default async function HrJobPage({
  params,
  searchParams
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { jobId } = await params;
  const { token: tokenRaw } = await searchParams;
  const token = (tokenRaw ?? '').trim();

  if (!jobId) notFound();

  if (!token) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">Missing access token.</p>
      </main>
    );
  }

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? '';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/hr/job/${jobId}/ranking?token=${encodeURIComponent(token)}`, {
    cache: 'no-store'
  });

  if (res.status === 401) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">Invalid token.</p>
      </main>
    );
  }

  if (!res.ok) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Error</h1>
        <p className="mt-2 text-sm text-gray-600">Failed to load ranking.</p>
      </main>
    );
  }

  const data = await res.json();

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ranking</h1>
          <p className="mt-1 text-sm text-gray-600">Job ID: {jobId}</p>
        </div>
      </div>

      <div className="mt-6">
        <HrRankingTable rows={data.all ?? []} />
      </div>
    </main>
  );
}
