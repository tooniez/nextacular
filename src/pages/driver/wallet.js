import { useEffect, useState } from 'react';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import { useRouter } from 'next/router';

function eur(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export default function DriverWalletPage() {
  const router = useRouter();
  const { data, mutate } = useSWR('/api/driver/wallet', fetcher, { revalidateOnFocus: false });
  const wallet = data?.data || null;
  const [topup, setTopup] = useState(10);
  const [code, setCode] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);

  useEffect(() => {
    const status = String(router.query?.topup || '');
    const sessionId = String(router.query?.session_id || '');
    if (status !== 'success' || !sessionId) return;

    let cancelled = false;
    (async () => {
      setTopupBusy(true);
      try {
        const resp = await api('/api/driver/wallet/topup/confirm', { method: 'POST', body: { sessionId } });
        if (cancelled) return;
        if (resp?.errors) {
          Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
          return;
        }
        toast.success('Wallet ricaricato');
        mutate();
        router.replace('/driver/wallet');
      } catch (e) {
        if (cancelled) return;
        toast.error(e?.message || 'Errore conferma pagamento');
      } finally {
        if (!cancelled) setTopupBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, mutate]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Wallet - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Wallet</h1>

        <Card>
          <Card.Body>
            <div className="text-sm text-gray-600">Saldo</div>
            <div className="text-3xl font-bold">{eur(wallet?.balanceEur || 0)}</div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-2">Aggiungi credito</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded"
                type="number"
                step="1"
                min="1"
                value={topup}
                onChange={(e) => setTopup(parseInt(e.target.value, 10) || 0)}
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={topupBusy}
                onClick={async () => {
                  setTopupBusy(true);
                  try {
                    const resp = await api('/api/driver/wallet/topup', { method: 'POST', body: { amountEur: topup } });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    const checkoutUrl = resp?.data?.checkoutUrl;
                    if (checkoutUrl) {
                      window.location.href = checkoutUrl;
                      return;
                    }
                    toast.error('Checkout non disponibile');
                  } catch (e) {
                    toast.error(e?.message || 'Errore top-up');
                  } finally {
                    setTopupBusy(false);
                  }
                }}
              >
                {topupBusy ? 'Attendi…' : 'Aggiungi'}
              </Button>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-2">Riscatta un buono</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded"
                placeholder="CODICE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                onClick={async () => {
                  const resp = await api('/api/driver/wallet/redeem', { method: 'POST', body: { code } });
                  if (resp?.errors) {
                    Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                    return;
                  }
                  toast.success('Buono riscattato');
                  setCode('');
                  mutate();
                }}
              >
                Riscatta
              </Button>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-2">Movimenti recenti</h2>
            <div className="space-y-2">
              {(wallet?.recharges || []).map((r) => (
                <div key={r.id} className="flex justify-between text-sm">
                  <div>{new Date(r.createdAt).toLocaleString('it-IT')}</div>
                  <div className="font-medium">{eur(r.amountEur)}</div>
                </div>
              ))}
              {(wallet?.vouchers || []).map((v) => (
                <div key={v.id} className="flex justify-between text-sm">
                  <div>Voucher {v.code}</div>
                  <div className="font-medium">{eur(v.amountEur)}</div>
                </div>
              ))}
              {((wallet?.recharges || []).length + (wallet?.vouchers || []).length) === 0 && (
                <div className="text-sm text-gray-600">Nessun movimento.</div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

