import CandidateWizard from '@/components/candidate-wizard';

export default async function JobTokenPage({ params }: { params: Promise<{ job_token: string }> }) {
  const { job_token } = await params;
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
      <CandidateWizard jobToken={job_token} />
    </main>
  );
}
