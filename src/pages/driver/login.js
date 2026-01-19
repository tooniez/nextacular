import { useState } from 'react';
import Link from 'next/link';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import DriverPublicLayout from '@/layouts/DriverPublicLayout';
import api from '@/lib/common/api';

export default function DriverLoginPage() {
  // This page is kept for backwards compatibility.
  // The new unified login is /auth/login.
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(String(window.location.search || ''));
    const cb = sp.get('callbackUrl') || '/driver/map';
    window.location.replace(`/auth/login?callbackUrl=${encodeURIComponent(String(cb))}`);
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <DriverPublicLayout>
      <Meta title="Login - Area Conducente" />
      <Card>
        <Card.Body>
          <h1 className="text-2xl font-bold mb-2">Login Conducente</h1>
          <p className="text-sm text-gray-600 mb-6">Accedi per vedere la mappa e avviare una ricarica.</p>

          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                const resp = await api('/api/driver/auth/login', {
                  method: 'POST',
                  body: { email, password },
                });
                if (resp?.errors) {
                  Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                  return;
                }
                window.location.href = '/driver/map';
              } catch (err) {
                toast.error(err?.message || 'Errore login');
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Accesso...' : 'Accedi'}
            </Button>

            <div className="text-sm text-gray-600">
              Non hai un account?{' '}
              <Link className="text-blue-600 hover:underline" href="/driver/register">
                Registrati
              </Link>
            </div>
          </form>
        </Card.Body>
      </Card>
    </DriverPublicLayout>
  );
}

