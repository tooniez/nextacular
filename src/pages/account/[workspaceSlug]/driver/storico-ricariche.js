import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function StoricoRicarichePage() {
  return (
    <AccountLayout>
      <Meta title="Storico Ricariche - Area Conducente" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Storico Ricariche</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Visualizza lo storico delle ricariche effettuate.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
