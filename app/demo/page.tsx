import Link from 'next/link';
import DemoPresenterModeCard from '@/components/demo-presenter-mode-card';
import { isDemoModeEnabled } from '@/lib/demoConfig';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TrustStrip from '@/components/trust-strip';

export default function DemoHubPage() {
  const demoMode = isDemoModeEnabled();

  return (
    <main className="mx-auto max-w-4xl space-y-6 py-8">
      <TrustStrip />

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

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-slate-900">Ζήτα Pilot</h2>
          <p className="mt-2 text-slate-600">
            Προτείνουμε 2 εβδομάδες pilot για έναν ρόλο, με KPI χρόνο screening και ποιότητα shortlist.
          </p>
        </CardHeader>
        <CardBody>
          <a href="mailto:hello@crossroads.example?subject=Crossroads%20HR%20Pilot%20Request">
            <Button>Ζήτα Pilot</Button>
          </a>
        </CardBody>
      </Card>

      {demoMode ? <DemoPresenterModeCard /> : null}
    </main>
  );
}
