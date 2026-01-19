import { useState } from 'react';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useDriverMe from '@/hooks/useDriverMe';

const FAQ = [
  { q: "Cos'è l'app?", a: "Ti permette di trovare stazioni, prenotare e avviare/terminare ricariche con pagamento automatico." },
  { q: "Posso ricaricare senza registrarmi?", a: "No: per pagamenti e ricevute è richiesta registrazione e login." },
  { q: "Come contattare l'assistenza?", a: "Apri un ticket qui sotto: ti risponderemo via email." },
];

export default function DriverSupportPage() {
  const { me } = useDriverMe();
  const isAuthed = Boolean(me);
  const { data, mutate } = useSWR(isAuthed ? '/api/driver/support/tickets' : null, fetcher, { revalidateOnFocus: false });
  const tickets = data?.data || [];
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <DriverLayout>
      <Meta title="Assistenza - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Assistenza</h1>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-3">Domande frequenti</h2>
            <div className="space-y-3">
              {FAQ.map((f, i) => (
                <details key={i} className="border rounded p-3 bg-white">
                  <summary className="font-medium cursor-pointer">{f.q}</summary>
                  <div className="text-sm text-gray-700 mt-2">{f.a}</div>
                </details>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-3">Contattaci</h2>
            <div className="space-y-3">
              <input
                className="w-full px-3 py-2 border rounded"
                placeholder="Oggetto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                className="w-full px-3 py-2 border rounded"
                placeholder="Descrivi il problema"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
                onClick={async () => {
                  if (!isAuthed) {
                    toast('Accedi per contattare l’assistenza.');
                    window.location.href = `/auth/login?callbackUrl=${encodeURIComponent('/driver/support')}`;
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    const resp = await api('/api/driver/support/tickets', { method: 'POST', body: { subject, message } });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('Ticket inviato');
                    setSubject('');
                    setMessage('');
                    mutate();
                  } catch (e) {
                    toast.error(e?.message || 'Errore invio');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Invia
              </Button>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="font-semibold mb-3">I tuoi ticket</h2>
            {!isAuthed ? (
              <div className="text-sm text-gray-600">Accedi per vedere i tuoi ticket.</div>
            ) : tickets.length === 0 ? (
              <div className="text-sm text-gray-600">Nessun ticket.</div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="p-3 border rounded">
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-sm text-gray-600">{t.status}</div>
                    <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString('it-IT')}</div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

