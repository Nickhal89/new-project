import CandidateWizardWaiterV2 from '@/components/candidate-wizard-waiter-v2';
import { DEMO_JOB_TOKEN } from '@/lib/demoConfig';

export default function CandidateDemoStartPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
      <CandidateWizardWaiterV2 jobToken={DEMO_JOB_TOKEN} />
    </main>
  );
}
