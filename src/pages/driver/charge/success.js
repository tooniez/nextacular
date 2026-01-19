import { useRouter } from 'next/router';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import Link from 'next/link';

export default function DriverChargeSuccessPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  return (
    <DriverLayout requireAuth>
      <Meta title="Ricarica completata - Area Conducente" />
      <div className="space-y-4">
        <Card>
          <Card.Body>
            <div className="text-2xl font-bold">Hai concluso con successo la ricarica</div>
            <div className="text-gray-700 mt-2">
              Stiamo elaborando il riepilogo della tua ricarica: puoi consultarlo nella sezione <span className="font-semibold">Attività</span>.
            </div>
          </Card.Body>
        </Card>

        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push('/driver/activity')}>
          Ok, ho capito
        </Button>

        {sessionId && (
          <div className="text-sm text-gray-600">
            Dettaglio sessione:{' '}
            <Link className="text-blue-600 hover:underline" href={`/driver/sessions/${sessionId}`}>
              Apri
            </Link>
          </div>
        )}
      </div>
    </DriverLayout>
  );
}

