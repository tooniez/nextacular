import { useMemo, useState } from 'react';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

export default function WhiteListTab({ stationId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCards, setSelectedCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUid, setNewUid] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Digitale');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiRoute = stationId ? `/api/admin/stations/${stationId}/whitelist` : null;
  const { data, error, mutate } = useSWR(apiRoute, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  const whitelistCards = Array.isArray(data) ? data : [];

  const filteredCards = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return whitelistCards.filter((card) => {
      const uid = String(card?.uid || '').toLowerCase();
      const name = String(card?.name || '').toLowerCase();
      return uid.includes(q) || name.includes(q);
    });
  }, [whitelistCards, searchTerm]);

  const handleAddCard = async () => {
    setIsAdding(true);
    setIsSubmitting(true);
    try {
      const uid = newUid.trim();
      if (!uid) {
        toast.error('Inserisci UID');
        return;
      }

      const resp = await api(apiRoute, {
        method: 'POST',
        body: { uid, name: newName.trim(), type: newType },
      });

      if (resp?.errors) {
        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
        return;
      }

      toast.success('Carta aggiunta');
      setNewUid('');
      setNewName('');
      setNewType('Digitale');
      setSelectedCards([]);
      await mutate();
    } catch (e) {
      toast.error(e?.message || 'Errore aggiunta carta');
    } finally {
      setIsSubmitting(false);
      setIsAdding(false);
    }
  };

  const handleRemoveCard = async (cardId) => {
    if (!cardId) return;
    if (!confirm('Rimuovere questa carta dalla white list?')) return;
    try {
      const resp = await api(apiRoute, {
        method: 'DELETE',
        body: { id: cardId },
      });
      if (resp?.errors) {
        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
        return;
      }
      toast.success('Carta rimossa');
      setSelectedCards((prev) => prev.filter((id) => id !== cardId));
      await mutate();
    } catch (e) {
      toast.error(e?.message || 'Errore rimozione carta');
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedCards.length === 0) return;
    if (!confirm(`Rimuovere ${selectedCards.length} carte dalla white list?`)) return;
    try {
      const resp = await api(apiRoute, {
        method: 'DELETE',
        body: { ids: selectedCards },
      });
      if (resp?.errors) {
        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
        return;
      }
      toast.success('Carte rimosse');
      setSelectedCards([]);
      await mutate();
    } catch (e) {
      toast.error(e?.message || 'Errore rimozione carte');
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                White List Carte RFID
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Gestisci le carte RFID autorizzate per questa stazione
              </p>
            </div>
            <Button
              onClick={() => setIsAdding(true)}
              disabled={!stationId}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Aggiungi Carta</span>
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
              Errore caricamento whitelist
            </div>
          )}

          {isAdding && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">UID *</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    placeholder="Es. RFID123456"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nome</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Es. Mario Rossi"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="Digitale">Digitale</option>
                    <option value="Fisica">Fisica</option>
                    <option value="Virtuale">Virtuale</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                  onClick={() => setIsAdding(false)}
                  disabled={isSubmitting}
                >
                  Annulla
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAddCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvataggio...' : 'Salva'}
                </Button>
              </div>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Cerca per UID o nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
            {selectedCards.length > 0 && (
              <Button
                onClick={handleRemoveSelected}
                className="flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Rimuovi Selezionate ({selectedCards.length})</span>
              </Button>
            )}
          </div>

          {/* Cards Table */}
          {filteredCards.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedCards.length === filteredCards.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCards(filteredCards.map((c) => c.id));
                          } else {
                            setSelectedCards([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Aggiunta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCards.includes(card.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCards((prev) => [...prev, card.id]);
                            } else {
                              setSelectedCards((prev) => prev.filter((id) => id !== card.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {card.uid || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {card.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.addedAt ? format(new Date(card.addedAt), 'dd/MM/yyyy HH:mm', { locale: it }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRemoveCard(card.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Nessuna carta in white list
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Aggiungi carte RFID alla white list per autorizzarle su questa stazione.
              </p>
              <div className="mt-6">
                <Button
                  onClick={handleAddCard}
                  className="flex items-center space-x-2 mx-auto"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Aggiungi Carta</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
