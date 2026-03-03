import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Crossroads HR • HORECA</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Προσλήψεις service προσωπικού με ταχύτητα και αξιοπιστία</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Μειώστε το κόστος λάθος πρόσληψης με δομημένη αξιολόγηση για Waiter/Service: overall fit,
            strengths, και ξεκάθαρα why bullets για γρήγορες αποφάσεις.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">
              Δείτε Demo HR Dashboard
            </Link>
            <Link href="/t2/demo" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700">
              Κάντε Demo Τεστ (Υποψήφιος)
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
