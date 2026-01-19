import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function ContactPage() {
  return (
    <AccountLayout>
      <Meta title="Scrivici - MSolution" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Scrivici</h1>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">Pagina di contatto in fase di sviluppo.</p>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
