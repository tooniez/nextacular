import { useState } from 'react';
import Link from 'next/link';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import DriverPublicLayout from '@/layouts/DriverPublicLayout';
import api from '@/lib/common/api';
import { useRouter } from 'next/router';

export default function DriverRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '', phone: '' });
  const [consents, setConsents] = useState({ privacy: false, terms: false, marketing: false, profiling: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pw = form.password || '';
  const policy = {
    minLength: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  };

  return (
    <DriverPublicLayout>
      <Meta title="Registrazione - Area Conducente" />
      <Card>
        <Card.Body>
          <h1 className="text-2xl font-bold mb-2">Crea account Conducente</h1>
          <p className="text-sm text-gray-600 mb-6">Registrati per poter caricare la tua vettura.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefono</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                type="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                type="password"
              />
              <div className="mt-2 text-sm">
                <div className="font-semibold mb-1">La password deve avere:</div>
                <div className={`${policy.minLength ? 'text-green-700' : 'text-red-600'}`}>- almeno 8 caratteri</div>
                <div className={`${policy.lower ? 'text-green-700' : 'text-red-600'}`}>- almeno 1 carattere minuscolo</div>
                <div className={`${policy.upper ? 'text-green-700' : 'text-red-600'}`}>- almeno 1 carattere maiuscolo</div>
                <div className={`${policy.number ? 'text-green-700' : 'text-red-600'}`}>- almeno 1 numero</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Conferma password *</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                type="password"
              />
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consents.privacy}
                  onChange={(e) => setConsents((p) => ({ ...p, privacy: e.target.checked }))}
                />
                <span>
                  Presa visione dell’<span className="underline">Informativa sulla privacy</span>*
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consents.terms}
                  onChange={(e) => setConsents((p) => ({ ...p, terms: e.target.checked }))}
                />
                <span>
                  Dichiaro di aver preso visione del <span className="underline">Regolamento</span> e dell’<span className="underline">Informativa</span>*
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consents.marketing}
                  onChange={(e) => setConsents((p) => ({ ...p, marketing: e.target.checked }))}
                />
                <span>Consenso per finalità di marketing</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consents.profiling}
                  onChange={(e) => setConsents((p) => ({ ...p, profiling: e.target.checked }))}
                />
                <span>Consenso per identificare abitudini al consumo</span>
              </label>
              <div className="text-xs text-gray-500">(*) obbligatorio</div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  if (form.password !== form.confirmPassword) {
                    toast.error('Le password non coincidono');
                    return;
                  }
                  const resp = await api('/api/driver/auth/register', {
                    method: 'POST',
                    body: { ...form, consents },
                  });
                  if (resp?.errors) {
                    Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                    return;
                  }
                  const cb = router?.query?.callbackUrl ? String(router.query.callbackUrl) : '/driver/map';
                  window.location.href = String(cb);
                } catch (e) {
                  toast.error(e?.message || 'Errore registrazione');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? 'Creazione...' : 'Registrati'}
            </Button>

            <div className="text-sm text-gray-600">
              Hai già un account?{' '}
              <Link className="text-blue-600 hover:underline" href="/driver/login">
                Login
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>
    </DriverPublicLayout>
  );
}

