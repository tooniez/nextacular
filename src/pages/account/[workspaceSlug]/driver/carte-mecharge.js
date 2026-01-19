import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function CarteMeChargePage() {
  return (
    <AccountLayout>
      <Meta title="Carte MeCharge - Area Conducente" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Carte MeCharge</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Gestisci le tue carte MeCharge.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
