import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useDriverMe from '@/hooks/useDriverMe';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

export default function DriverPaymentMethodProfilePage() {
  const { me, mutate } = useDriverMe();
  const [isSaving, setIsSaving] = useState(false);
  const [brand, setBrand] = useState('visa');
  const [last4, setLast4] = useState('');
  const [stripeState, setStripeState] = useState({
    loading: true,
    enabled: false,
    publishableKey: '',
    clientSecret: '',
  });

  const current = me?.paymentProfile?.stripePaymentMethodId || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api('/api/driver/stripe/setup-intent', { method: 'POST', body: {} });
        if (cancelled) return;
        if (resp?.errors) {
          setStripeState({ loading: false, enabled: false, publishableKey: '', clientSecret: '' });
          return;
        }
        setStripeState({
          loading: false,
          enabled: true,
          publishableKey: resp?.data?.publishableKey || '',
          clientSecret: resp?.data?.clientSecret || '',
        });
      } catch (e) {
        if (cancelled) return;
        setStripeState({ loading: false, enabled: false, publishableKey: '', clientSecret: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stripePromise = useMemo(() => {
    if (!stripeState.enabled || !stripeState.publishableKey) return null;
    return loadStripe(stripeState.publishableKey);
  }, [stripeState.enabled, stripeState.publishableKey]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Metodo di pagamento - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Metodo di pagamento</h1>

        <Card>
          <Card.Body>
            <div className="text-sm text-gray-600 mb-4">Aggiungi una carta in modo sicuro (Stripe).</div>

            {current && (
              <div className="p-3 rounded bg-green-50 text-green-800 text-sm mb-4">
                Metodo attuale: <span className="font-mono">{String(current).slice(0, 12)}…</span>
              </div>
            )}

            {stripeState.loading ? (
              <div className="text-sm text-gray-600">Caricamento…</div>
            ) : stripeState.enabled && stripePromise && stripeState.clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: stripeState.clientSecret,
                  appearance: { theme: 'stripe' },
                  locale: 'it',
                }}
              >
                <StripeSetupForm
                  disabled={isSaving}
                  onStart={() => setIsSaving(true)}
                  onDone={() => setIsSaving(false)}
                  onSaved={() => mutate()}
                />
              </Elements>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Stripe non è configurato: qui sotto puoi usare la modalità demo (solo per test).
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Circuito</label>
                    <select className="w-full px-3 py-2 border rounded" value={brand} onChange={(e) => setBrand(e.target.value)}>
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">Amex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ultime 4 cifre</label>
                    <input
                      className="w-full px-3 py-2 border rounded"
                      value={last4}
                      onChange={(e) => setLast4(e.target.value)}
                      placeholder="1234"
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const resp = await api('/api/driver/payment-method', {
                        method: 'POST',
                        body: { brand, last4 },
                      });
                      if (resp?.errors) {
                        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                        return;
                      }
                      toast.success('Metodo di pagamento salvato (demo)');
                      mutate();
                    } catch (e) {
                      toast.error(e?.message || 'Errore salvataggio');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? 'Salvataggio...' : 'Salva metodo (demo)'}
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

function StripeSetupForm({ disabled, onStart, onDone, onSaved }) {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        onStart?.();
        try {
          const result = await stripe.confirmSetup({
            elements,
            redirect: 'if_required',
          });

          if (result.error) {
            toast.error(result.error.message || 'Errore pagamento');
            return;
          }

          const pmId = result.setupIntent?.payment_method;
          if (!pmId) {
            toast.error('Metodo non valido');
            return;
          }

          const resp = await api('/api/driver/payment-method', {
            method: 'POST',
            body: { stripePaymentMethodId: pmId },
          });
          if (resp?.errors) {
            Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
            return;
          }
          toast.success('Metodo di pagamento salvato');
          onSaved?.();
        } catch (err) {
          toast.error(err?.message || 'Errore salvataggio');
        } finally {
          onDone?.();
        }
      }}
      className="space-y-4"
    >
      <PaymentElement />
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={disabled || !stripe || !elements}>
        {disabled ? 'Salvataggio...' : 'Salva carta'}
      </Button>
      <div className="text-xs text-gray-500">
        I dati carta sono gestiti da Stripe; la piattaforma salva solo un riferimento al metodo di pagamento.
      </div>
    </form>
  );
}

