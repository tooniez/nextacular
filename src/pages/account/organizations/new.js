import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import { useOrganizationsPermission } from '@/hooks/data/useOrganizationsPermission';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';

export default function NewOrganizationPage() {
  const router = useRouter();
  const { hasPermission, isLoading: isAuthLoading } = useOrganizationsPermission();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if no permission
  if (!isAuthLoading && !hasPermission) {
    router.replace('/');
    return null;
  }

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Nuova Organizzazione - MSolution" />
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title="Nuova Organizzazione - MSolution" />
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => router.push('/account/organizations')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Torna alle Organizzazioni
          </button>
          <h1 className="text-3xl font-bold">Nuova Organizzazione</h1>
        </div>

        <Card>
          <Card.Body>
            <div className="max-w-xl">
              <p className="text-gray-600 mb-6">
                Crea una nuova organizzazione (workspace). Verrà usata per stazioni, sessioni, pagamenti e rendicontazioni.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome organizzazione <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Es. Azienda Demo Srl"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="bg-gray-600 hover:bg-gray-500 text-white"
                    onClick={() => router.push('/account/organizations')}
                    disabled={isSubmitting}
                  >
                    Annulla
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    disabled={isSubmitting || !name.trim()}
                    onClick={async () => {
                      const trimmed = name.trim();
                      if (!trimmed) {
                        toast.error('Inserisci un nome valido');
                        return;
                      }

                      setIsSubmitting(true);
                      try {
                        const resp = await api('/api/workspace', {
                          method: 'POST',
                          body: { name: trimmed },
                        });

                        if (resp?.errors) {
                          Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                          return;
                        }

                        toast.success('Organizzazione creata');
                        router.push('/account/organizations');
                      } catch (e) {
                        toast.error(e?.message || 'Errore durante la creazione');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    {isSubmitting ? 'Creazione...' : 'Crea'}
                  </Button>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
