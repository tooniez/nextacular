import { useEffect, useState } from 'react';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useDriverMe from '@/hooks/useDriverMe';
import Link from 'next/link';

export default function DriverBillingProfilePage() {
  const { me, mutate } = useDriverMe();
  const [form, setForm] = useState({
    type: 'private', // private | company
    fullName: '',
    taxCode: '',
    vatNumber: '',
    companyName: '',
    address: '',
    city: '',
    zip: '',
    country: 'IT',
    pec: '',
    sdi: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const bp = me?.billingProfile || {};
    setForm((p) => ({
      ...p,
      ...bp,
      fullName: bp.fullName || me?.name || '',
    }));
  }, [me]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Fatturazione - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Dati di fatturazione</h1>

        <Card>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={form.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setForm((p) => ({
                      ...p,
                      type: nextType,
                      // reset fields not applicable to avoid “mixing”
                      ...(nextType === 'private'
                        ? { companyName: '', vatNumber: '', pec: '', sdi: '' }
                        : { taxCode: '' }),
                    }));
                  }}
                >
                  <option value="private">Privato</option>
                  <option value="company">Azienda</option>
                </select>
              </div>
              {form.type === 'private' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Nome e cognome *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Referente *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Nome e cognome"
                  />
                </div>
              )}

              {form.type === 'company' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Ragione sociale *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={form.companyName}
                    onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  />
                </div>
              )}
              {form.type === 'private' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Codice fiscale *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={form.taxCode}
                    onChange={(e) => setForm((p) => ({ ...p, taxCode: e.target.value }))}
                    placeholder="RSSMRA80A01F205X"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Partita IVA *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={form.vatNumber}
                    onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))}
                    placeholder="IT12345678901"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Indirizzo *</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Città *</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CAP *</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={form.zip}
                  onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paese *</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                />
              </div>
              {form.type === 'company' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">PEC</label>
                    <input
                      className="w-full px-3 py-2 border rounded"
                      value={form.pec}
                      onChange={(e) => setForm((p) => ({ ...p, pec: e.target.value }))}
                      placeholder="azienda@pec.it"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Codice SDI</label>
                    <input
                      className="w-full px-3 py-2 border rounded"
                      value={form.sdi}
                      onChange={(e) => setForm((p) => ({ ...p, sdi: e.target.value }))}
                      placeholder="ABC1234"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">(*) obbligatorio</div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const resp = await api('/api/driver/profile/billing', {
                      method: 'PATCH',
                      body: { billingProfile: form },
                    });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('Dati salvati');
                    mutate();
                  } catch (e) {
                    toast.error(e?.message || 'Errore salvataggio');
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

