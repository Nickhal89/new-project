import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TrustStrip from '@/components/trust-strip';

export default function CandidateDemoLandingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 py-8">
      <TrustStrip compact />

      <Card>
        <CardHeader>
          <h1 className="text-3xl font-semibold text-slate-900">Demo Τεστ Υποψηφίου</h1>
          <p className="mt-3 text-slate-600">
            Γρήγορη αξιολόγηση για ρόλο Service/Waiter με έμφαση σε εξυπηρέτηση, πίεση και συνέπεια.
          </p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Ολοκλήρωση σε περίπου 3 λεπτά</li>
            <li>• Δεν χρειάζεται CV</li>
            <li>• Στόχος: Service/Waiter fit</li>
          </ul>

          <Link href="/t2/demo/start" className="mt-8 inline-block">
            <Button size="lg">Ξεκίνα</Button>
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
