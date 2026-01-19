import { useEffect, useState } from 'react';
import Link from 'next/link';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useDriverMe from '@/hooks/useDriverMe';

export default function DriverConsentsPage() {
  const { me, mutate } = useDriverMe();
  const [consents, setConsents] = useState({
    privacy: false,
    terms: false,
    marketing: false,
    profiling: false,
    updatedAt: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConsents((p) => ({ ...p, ...(me?.consents || {}) }));
  }, [me]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Consensi - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Documenti e consensi</h1>

        <Card>
          <Card.Body>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(consents.privacy)}
                  onChange={(e) => setConsents((p) => ({ ...p, privacy: e.target.checked }))}
                />
                <span>Ho preso visione dell’informativa privacy *</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(consents.terms)}
                  onChange={(e) => setConsents((p) => ({ ...p, terms: e.target.checked }))}
                />
                <span>Accetto termini e condizioni *</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(consents.marketing)}
                  onChange={(e) => setConsents((p) => ({ ...p, marketing: e.target.checked }))}
                />
                <span>Consenso marketing</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(consents.profiling)}
                  onChange={(e) => setConsents((p) => ({ ...p, profiling: e.target.checked }))}
                />
                <span>Consenso profilazione</span>
              </label>

              <div className="text-xs text-gray-500">(*) obbligatorio</div>

              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = { ...consents, updatedAt: new Date().toISOString() };
                    const resp = await api('/api/driver/profile/consents', { method: 'PATCH', body: { consents: payload } });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('Consensi salvati');
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

