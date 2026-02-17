import Link from 'next/link';

export default function CandidateDemoLandingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Demo Τεστ Υποψηφίου</h1>
        <p className="mt-3 text-slate-600">
          Γρήγορη αξιολόγηση για ρόλο Service/Waiter με έμφαση σε εξυπηρέτηση, πίεση και συνέπεια.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          <li>• Ολοκλήρωση σε περίπου 3 λεπτά</li>
          <li>• Δεν χρειάζεται CV</li>
          <li>• Στόχος: Service/Waiter fit</li>
        </ul>

        <Link href="/t2/demo/start" className="mt-8 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">
          Ξεκίνα
        </Link>
      </section>
    </main>
  );
}
