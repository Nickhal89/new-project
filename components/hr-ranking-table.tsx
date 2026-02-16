'use client';

type Row = {
  sessionId: string;
  candidateEmail: string;
  version?: string;
  overallFit: number;
  breakdown: { behaviour: number; softSkills: number; integrity: number; experience: number };
  topCompetencies?: Array<{ key: string; score: number }>;
  why: string[];
};

function toCSV(rows: Row[]) {
  const header = [
    'candidateEmail',
    'version',
    'overallFit',
    'behaviour',
    'softSkills',
    'integrity',
    'experience',
    'topStrengths',
    'why'
  ];

  const lines = rows.map((r) => [
    r.candidateEmail,
    r.version ?? 'v1',
    r.overallFit,
    r.breakdown.behaviour,
    r.breakdown.softSkills,
    r.breakdown.integrity,
    r.breakdown.experience,
    (r.topCompetencies ?? []).map((x) => `${x.key}: ${Math.round(x.score)}`).join(' | '),
    (r.why ?? []).join(' | ')
  ]);

  return [header, ...lines]
    .map((arr) => arr.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

export default function HrRankingTable({ rows }: { rows: Row[] }) {
  const downloadCSV = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'ranking.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-sm font-semibold">Candidates</div>
          <div className="text-xs text-gray-600">{rows.length} total</div>
        </div>
        <button
          onClick={downloadCSV}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-t bg-gray-50 text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Version</th>
              <th className="p-3">Overall</th>
              <th className="p-3">Behaviour</th>
              <th className="p-3">Soft</th>
              <th className="p-3">Integrity</th>
              <th className="p-3">Exp</th>
              <th className="p-3">Top strengths</th>
              <th className="p-3">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sessionId} className="border-t">
                <td className="p-3">{r.candidateEmail}</td>
                <td className="p-3">{r.version ?? 'v1'}</td>
                <td className="p-3 font-semibold">{Math.round(r.overallFit)}</td>
                <td className="p-3">{Math.round(r.breakdown.behaviour)}</td>
                <td className="p-3">{Math.round(r.breakdown.softSkills)}</td>
                <td className="p-3">{Math.round(r.breakdown.integrity)}</td>
                <td className="p-3">{Math.round(r.breakdown.experience)}</td>
                <td className="p-3 text-gray-700">
                  {(r.topCompetencies ?? []).map((x) => `${x.key}: ${Math.round(x.score)}`).join(' · ')}
                </td>
                <td className="p-3 text-gray-700">{(r.why ?? []).slice(0, 2).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
