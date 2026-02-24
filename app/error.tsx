'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold text-slate-900">Προσωρινό σφάλμα</h1>
          <p className="mt-2 text-slate-600">
            Κάτι πήγε στραβά στη φόρτωση. Δοκιμάστε ξανά ή επιστρέψτε στο demo.
          </p>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button onClick={reset}>Δοκίμασε ξανά</Button>
          <Link href="/demo"><Button variant="secondary">Πίσω στο Demo</Button></Link>
        </CardBody>
      </Card>
    </main>
  );
}
