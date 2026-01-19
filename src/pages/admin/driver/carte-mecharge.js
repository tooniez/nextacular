import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import { useMemo, useState } from 'react';
import Link from 'next/link';

export default function AdminDriverCarteMeChargePage() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const router = useRouter();
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const { data: wsData } = useSWR(
    isSuperAdmin ? '/api/admin/workspaces?page=1&pageSize=200' : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const workspaces = useMemo(() => wsData?.data?.data || wsData?.data?.workspaces || [], [wsData]);
  const effectiveSlug = workspaceSlug || workspaces?.[0]?.slug || '';

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
      <Meta title="Carte MeCharge - Super Admin" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Carte MeCharge</h1>
            <p className="text-gray-600 mt-2">Gestisci le carte MeCharge</p>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="text-sm text-gray-600">Seleziona organizzazione:</div>
                <select
                  className="px-3 py-2 border rounded w-full md:w-64"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                >
                  <option value="">(prima disponibile)</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.slug}>
                      {w.name} ({w.slug})
                    </option>
                  ))}
                </select>
              </div>
              {effectiveSlug ? (
                <div className="flex flex-col gap-2">
                  <Link className="text-blue-600 hover:underline" href={`/account/${effectiveSlug}/driver/carte-mecharge`}>
                    Apri Carte MeCharge driver per {effectiveSlug}
                  </Link>
                  <Link className="text-blue-600 hover:underline" href={`/admin/rfid-cards`}>
                    Apri gestione RFID (super-admin)
                  </Link>
                </div>
              ) : (
                <div className="text-gray-500">Nessuna organizzazione disponibile.</div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
