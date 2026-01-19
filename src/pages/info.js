import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function InfoPage() {
  return (
    <AccountLayout>
      <Meta title="Info - MSolution" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Info</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Informazioni sulla piattaforma MSolution.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
