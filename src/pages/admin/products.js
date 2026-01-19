import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAdminProducts } from '@/hooks/data';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';

export default function AdminProductsPage() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', page: 1, pageSize: 20 });
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    planCode: '',
    name: '',
    monthlyFeePerStation: '',
    currency: 'EUR',
    description: '',
  });

  const { products, pagination, isLoading: isLoadingData, mutate } = useAdminProducts(
    filters,
    !isLoading && isSuperAdmin
  );

  if (isLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    router.push('/account');
    return null;
  }

  return (
    <AccountLayout>
      <Meta title="Prodotti - Super Admin" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Prodotti</h1>
            <p className="text-gray-600 mt-2">Gestisci i prodotti</p>
          </Card.Header>
          <Card.Body>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between mb-4">
              <input
                className="px-3 py-2 border rounded w-full md:w-80"
                placeholder="Cerca (codice o nome)"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsCreating((v) => !v)}
              >
                {isCreating ? 'Chiudi' : 'Nuovo Prodotto'}
              </Button>
            </div>

            {isCreating && (
              <div className="p-4 border rounded mb-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    className="px-3 py-2 border rounded"
                    placeholder="planCode (es. basic-monthly)"
                    value={newPlan.planCode}
                    onChange={(e) => setNewPlan((p) => ({ ...p, planCode: e.target.value }))}
                  />
                  <input
                    className="px-3 py-2 border rounded"
                    placeholder="Nome"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="px-3 py-2 border rounded"
                    placeholder="Fee/mese per stazione (es. 29.99)"
                    value={newPlan.monthlyFeePerStation}
                    onChange={(e) => setNewPlan((p) => ({ ...p, monthlyFeePerStation: e.target.value }))}
                  />
                  <input
                    className="px-3 py-2 border rounded"
                    placeholder="Valuta (EUR)"
                    value={newPlan.currency}
                    onChange={(e) => setNewPlan((p) => ({ ...p, currency: e.target.value }))}
                  />
                </div>
                <textarea
                  className="mt-3 w-full px-3 py-2 border rounded"
                  placeholder="Descrizione (opzionale)"
                  rows={2}
                  value={newPlan.description}
                  onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))}
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                    onClick={() => setIsCreating(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      try {
                        const resp = await api('/api/admin/products', {
                          method: 'POST',
                          body: {
                            planCode: newPlan.planCode,
                            name: newPlan.name,
                            monthlyFeePerStation: newPlan.monthlyFeePerStation,
                            currency: newPlan.currency,
                            description: newPlan.description,
                          },
                        });
                        if (resp?.errors) {
                          Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                          return;
                        }
                        toast.success('Prodotto creato');
                        setNewPlan({ planCode: '', name: '', monthlyFeePerStation: '', currency: 'EUR', description: '' });
                        setIsCreating(false);
                        mutate();
                      } catch (e) {
                        toast.error(e?.message || 'Errore creazione');
                      }
                    }}
                    disabled={!newPlan.planCode.trim() || !newPlan.name.trim() || !newPlan.monthlyFeePerStation}
                  >
                    Salva
                  </Button>
                </div>
              </div>
            )}

            {isLoadingData ? (
              <div className="p-6 text-center text-gray-500">Caricamento...</div>
            ) : products.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Nessun prodotto trovato.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Codice</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Fee/mese</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Valuta</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Attivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{p.planCode}</td>
                        <td className="px-4 py-3 text-sm">{p.name}</td>
                        <td className="px-4 py-3 text-sm">{p.monthlyFeePerStation}</td>
                        <td className="px-4 py-3 text-sm">{p.currency}</td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(p.isActive)}
                            onChange={async (e) => {
                              try {
                                const resp = await api('/api/admin/products', {
                                  method: 'PATCH',
                                  body: { id: p.id, isActive: e.target.checked },
                                });
                                if (resp?.errors) {
                                  Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                                  return;
                                }
                                mutate();
                              } catch (err) {
                                toast.error(err?.message || 'Errore aggiornamento');
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination?.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                    disabled={pagination.page === 1}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Indietro
                  </Button>
                  <Button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Avanti
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
