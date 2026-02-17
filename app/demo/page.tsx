import Link from 'next/link';
import DemoPresenterModeCard from '@/components/demo-presenter-mode-card';
import { isDemoModeEnabled } from '@/lib/demoConfig';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function DemoHubPage() {
  const demoMode = isDemoModeEnabled();

  return (
    <main className="mx-auto max-w-4xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-semibold text-slate-900">Demo Hub</h1>
          <p className="mt-2 text-slate-600">
            Επιλέξτε εμπειρία demo: HR dashboard με ranking ή candidate αξιολόγηση Waiter v2.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/hr/demo">
              <Button className="w-full" size="lg">HR Demo Dashboard</Button>
            </Link>
            <Link href="/t2/demo">
              <Button variant="secondary" className="w-full" size="lg">Candidate Demo Test</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {demoMode ? <DemoPresenterModeCard /> : null}
    </main>
  );
}
