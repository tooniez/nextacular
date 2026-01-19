import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function RicaricaInCorsoPage() {
  return (
    <AccountLayout>
      <Meta title="Ricarica in Corso - Area Conducente" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Ricarica in Corso</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Visualizza le ricariche attualmente in corso.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
