export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Crossroads HR</h1>
        <p className="mt-2 text-slate-600">Candidate assessment routes are available under /t/[job_token].</p>
      </div>
    </main>
  );
}
