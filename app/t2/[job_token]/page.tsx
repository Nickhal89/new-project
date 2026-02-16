import CandidateWizardWaiterV2 from '@/components/candidate-wizard-waiter-v2';

export default async function JobTokenV2Page({ params }: { params: Promise<{ job_token: string }> }) {
  const { job_token } = await params;
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
      <CandidateWizardWaiterV2 jobToken={job_token} />
    </main>
  );
}
