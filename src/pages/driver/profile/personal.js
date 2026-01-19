import { useState } from 'react';
import Link from 'next/link';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useDriverMe from '@/hooks/useDriverMe';

export default function DriverPersonalPage() {
  const { me, mutate } = useDriverMe();
  const [name, setName] = useState(me?.name || '');
  const [phone, setPhone] = useState(me?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <DriverLayout requireAuth>
      <Meta title="Dati personali - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Dati personali</h1>
        <Card>
          <Card.Body>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input className="w-full px-3 py-2 border rounded" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input className="w-full px-3 py-2 border rounded" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="text-sm text-gray-600">Email: {me?.email}</div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const resp = await api('/api/driver/profile/personal', { method: 'PATCH', body: { name, phone } });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('Salvato');
                    mutate();
                  } catch (e) {
                    toast.error(e?.message || 'Errore');
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

