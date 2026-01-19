import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';

export default function DriverSettingsPage() {
  const { data, mutate } = useSWR('/api/driver/profile/settings', fetcher, { revalidateOnFocus: false });
  const s = data?.data || null;
  const { data: uploadsData, mutate: mutateUploads } = useSWR('/api/driver/uploads', fetcher, { revalidateOnFocus: false });
  const uploads = uploadsData?.data?.files || [];

  const [language, setLanguage] = useState('it');
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [push, setPush] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [connectorType, setConnectorType] = useState('ANY');
  const [minPower, setMinPower] = useState(0);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const defaults = useMemo(
    () => ({
      language: 'it',
      notifications: { emailReceipts: true, push: false },
      mapDefaults: { onlyAvailable: false, favoritesOnly: false, connectorType: 'ANY', minPower: 0 },
    }),
    []
  );

  useEffect(() => {
    if (!s) return;
    setLanguage(s.language || defaults.language);
    setEmailReceipts(Boolean(s.notifications?.emailReceipts));
    setPush(Boolean(s.notifications?.push));
    setOnlyAvailable(Boolean(s.mapDefaults?.onlyAvailable));
    setFavoritesOnly(Boolean(s.mapDefaults?.favoritesOnly));
    setConnectorType(String(s.mapDefaults?.connectorType || defaults.mapDefaults.connectorType));
    setMinPower(Number(s.mapDefaults?.minPower || 0));
  }, [s, defaults]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Impostazioni - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Impostazioni</h1>

        <Card>
          <Card.Body>
            <div className="text-sm text-gray-600">Personalizza l’app: mappa, notifiche e sicurezza.</div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="text-lg font-semibold">App</div>

            <div className="mt-3 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lingua</label>
                <select className="w-full px-3 py-2 border rounded" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Notifiche</div>
                <label className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-gray-800">Ricevute via email</span>
                  <input
                    type="checkbox"
                    checked={emailReceipts}
                    onChange={(e) => setEmailReceipts(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-gray-800">Notifiche push (beta)</span>
                  <input
                    type="checkbox"
                    checked={push}
                    onChange={(e) => setPush(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <div className="text-xs text-gray-500">Le push vengono salvate come preferenza (attivazione tecnica in step successivo).</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="text-lg font-semibold">Mappa (default)</div>
            <div className="mt-3 space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800">Solo colonnine disponibili</span>
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800">Solo preferiti</span>
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo presa</label>
                  <select className="w-full px-3 py-2 border rounded" value={connectorType} onChange={(e) => setConnectorType(e.target.value)}>
                    <option value="ANY">Qualsiasi</option>
                    <option value="Type2">Type2</option>
                    <option value="CCS">CCS</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Potenza min (kW)</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={String(minPower)}
                    onChange={(e) => setMinPower(Number(e.target.value))}
                  >
                    <option value="0">0+</option>
                    <option value="11">11+</option>
                    <option value="22">22+</option>
                    <option value="50">50+</option>
                  </select>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="text-lg font-semibold">Upload documenti</div>
            <div className="text-sm text-gray-600 mt-1">
              Carica immagini o PDF associati al tuo profilo (visibili solo a te).
            </div>

            <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={uploadBusy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  try {
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) return toast.error('File troppo grande (max 8MB)');
                    const okMime = /^(image\/png|image\/jpeg|image\/webp|application\/pdf)$/i.test(file.type);
                    if (!okMime) return toast.error('Formato non supportato (PNG/JPG/WEBP/PDF)');

                    setUploadBusy(true);
                    const dataUrl = await new Promise((resolve, reject) => {
                      const r = new FileReader();
                      r.onerror = () => reject(new Error('read error'));
                      r.onload = () => resolve(r.result);
                      r.readAsDataURL(file);
                    });

                    const resp = await api('/api/driver/uploads', {
                      method: 'POST',
                      body: { dataUrl, fileName: file.name },
                    });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('File caricato');
                    mutateUploads();
                    try { e.target.value = ''; } catch {}
                  } catch (err) {
                    toast.error(err?.message || 'Errore upload');
                  } finally {
                    setUploadBusy(false);
                  }
                }}
              />
              {uploadBusy ? <span className="text-sm text-gray-500">Caricamento…</span> : null}
            </div>

            <div className="mt-4">
              {uploads.length === 0 ? (
                <div className="text-sm text-gray-500">Nessun file caricato.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aggiornato</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dimensione</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploads.map((f) => (
                        <tr key={f.name}>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{f.name}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{f.updatedAt ? new Date(f.updatedAt).toLocaleString('it-IT') : '—'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{Number.isFinite(Number(f.size)) ? `${Math.round(Number(f.size) / 1024)} KB` : '—'}</td>
                          <td className="px-3 py-2 text-sm">
                            {f.url ? (
                              <a className="text-blue-600 hover:underline" href={f.url} target="_blank" rel="noreferrer">
                                Apri
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="bg-gray-200 hover:bg-gray-300 text-gray-900"
            disabled={saving}
            onClick={() => {
              setLanguage(defaults.language);
              setEmailReceipts(defaults.notifications.emailReceipts);
              setPush(defaults.notifications.push);
              setOnlyAvailable(defaults.mapDefaults.onlyAvailable);
              setFavoritesOnly(defaults.mapDefaults.favoritesOnly);
              setConnectorType(defaults.mapDefaults.connectorType);
              setMinPower(defaults.mapDefaults.minPower);
              toast.success('Ripristinati');
            }}
          >
            Ripristina
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const payload = {
                  settings: {
                    language,
                    notifications: { emailReceipts, push },
                    mapDefaults: { onlyAvailable, favoritesOnly, connectorType, minPower },
                  },
                };
                const resp = await api('/api/driver/profile/settings', { method: 'PATCH', body: payload });
                if (resp?.errors) {
                  Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                  return;
                }
                toast.success('Salvato');
                mutate();
              } catch (e) {
                toast.error(e?.message || 'Errore salvataggio');
              } finally {
                setSaving(false);
              }
            }}
          >
            Salva
          </Button>
        </div>

        <Card>
          <Card.Body>
            <div className="text-lg font-semibold">Sicurezza</div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Password attuale</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuova password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">Min 8 caratteri, almeno 1 lettera e 1 numero.</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Conferma nuova password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-gray-900 hover:bg-black text-white"
                disabled={pwBusy}
                onClick={async () => {
                  if (!currentPassword || !newPassword) return toast.error('Compila i campi password');
                  if (newPassword !== newPassword2) return toast.error('Le nuove password non coincidono');
                  setPwBusy(true);
                  try {
                    const resp = await api('/api/driver/profile/password', {
                      method: 'POST',
                      body: { currentPassword, newPassword },
                    });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    toast.success('Password aggiornata');
                    setCurrentPassword('');
                    setNewPassword('');
                    setNewPassword2('');
                  } catch (e) {
                    toast.error(e?.message || 'Errore password');
                  } finally {
                    setPwBusy(false);
                  }
                }}
              >
                Aggiorna password
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

