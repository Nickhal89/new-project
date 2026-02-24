import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold text-slate-900">Σελίδα δεν βρέθηκε</h1>
          <p className="mt-2 text-slate-600">
            Η διεύθυνση που ανοίξατε δεν είναι διαθέσιμη. Επιστρέψτε στο Demo Hub για να συνεχίσετε.
          </p>
        </CardHeader>
        <CardBody className="flex gap-3">
          <Link href="/demo"><Button>Επιστροφή στο Demo</Button></Link>
          <Link href="/"><Button variant="secondary">Αρχική</Button></Link>
        </CardBody>
      </Card>
    </main>
  );
}
