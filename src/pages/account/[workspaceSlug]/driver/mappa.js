import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function DriverMappaPage() {
  return (
    <AccountLayout>
      <Meta title="Mappa - Area Conducente" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Mappa</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Mappa delle stazioni di ricarica disponibili.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
