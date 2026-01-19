import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function DriverPagamentiPage() {
  return (
    <AccountLayout>
      <Meta title="Pagamenti - Area Conducente" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Pagamenti</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Gestisci i pagamenti e le fatture.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
