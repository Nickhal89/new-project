import Link from 'next/link';

export default function DemoHubPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Demo Hub</h1>
        <p className="mt-3 text-slate-600">
          Επιλέξτε εμπειρία demo: HR dashboard με ranking ή candidate αξιολόγηση Waiter v2.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/hr/demo" className="rounded-xl bg-slate-900 px-5 py-4 text-center text-white">
            HR Demo Dashboard
          </Link>
          <Link href="/t2/demo" className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center text-slate-700">
            Candidate Demo Test
          </Link>
        </div>
      </section>
    </main>
  );
}
