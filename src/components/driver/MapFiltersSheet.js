import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';

const POWER_OPTIONS = [
  { key: 'ALL', label: 'Qualsiasi' },
  { key: '22', label: '≥ 22 kW' },
  { key: '50', label: '≥ 50 kW' },
  { key: '100', label: '≥ 100 kW' },
  { key: '150', label: '≥ 150 kW' },
];

export default function MapFiltersSheet({
  open,
  onClose,
  draft,
  setDraft,
  connectorTypes,
  onApply,
  onReset,
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="min-h-full flex items-end justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-6"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-6"
            >
              <Dialog.Panel className="w-full max-w-md bg-white rounded-t-2xl p-5">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-bold">Filtri</Dialog.Title>
                  <button className="text-gray-500 text-xl" onClick={onClose}>
                    ✕
                  </button>
                </div>

                <div className="mt-5 space-y-6">
                  <section>
                    <div className="text-sm font-semibold text-gray-900 mb-3">FILTRI VELOCI</div>
                    <div className="flex gap-3">
                      <button
                        className={`flex-1 border rounded-xl px-3 py-3 flex items-center justify-center gap-2 ${
                          draft.onlyFavorites ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setDraft((p) => ({ ...p, onlyFavorites: !p.onlyFavorites }))}
                      >
                        <HeartIcon className="w-5 h-5" />
                        <span className="font-semibold">Preferiti</span>
                      </button>
                      <button
                        className={`flex-1 border rounded-xl px-3 py-3 flex items-center justify-center gap-2 ${
                          draft.renewable ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setDraft((p) => ({ ...p, renewable: !p.renewable }))}
                        title="Demo: dato non ancora disponibile"
                      >
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-semibold">Fonte rinnovabile</span>
                      </button>
                    </div>
                    {draft.renewable && (
                      <div className="text-xs text-gray-500 mt-2">
                        Nota: “Fonte rinnovabile” è UI pronta; serve aggiungere il dato a stazione per renderlo reale.
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="text-sm font-semibold text-gray-900 mb-3">ACCESSIBILITÀ</div>
                    <ToggleRow
                      label="Disponibili"
                      value={draft.availableOnly}
                      onChange={(v) => setDraft((p) => ({ ...p, availableOnly: v }))}
                    />
                    <ToggleRow
                      label="Prenotabili"
                      value={draft.reservableOnly}
                      onChange={(v) => setDraft((p) => ({ ...p, reservableOnly: v }))}
                    />
                    <ToggleRow
                      label="Aperte h24"
                      value={draft.open24Only}
                      onChange={(v) => setDraft((p) => ({ ...p, open24Only: v }))}
                    />
                    {(draft.reservableOnly || draft.open24Only) && (
                      <div className="text-xs text-gray-500 mt-2">
                        Nota: “Prenotabili” e “Aperte h24” richiedono dati aggiuntivi per essere 100% accurati.
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="text-sm font-semibold text-gray-900 mb-3">PRESA</div>
                    <div className="grid grid-cols-3 gap-3">
                      {connectorTypes.map((t) => {
                        const active = (draft.connectorTypes || []).includes(t);
                        return (
                          <button
                            key={t}
                            className={`border rounded-xl px-2 py-3 text-center ${
                              active ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                            }`}
                            onClick={() => {
                              setDraft((p) => {
                                const cur = new Set(p.connectorTypes || []);
                                if (cur.has(t)) cur.delete(t);
                                else cur.add(t);
                                return { ...p, connectorTypes: Array.from(cur) };
                              });
                            }}
                          >
                            <div className="text-sm font-semibold">{t}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="text-sm font-semibold text-gray-900 mb-3">POTENZA</div>
                    <div className="grid grid-cols-2 gap-3">
                      {POWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          className={`border rounded-xl px-3 py-3 text-center ${
                            draft.minPower === opt.key ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                          }`}
                          onClick={() => setDraft((p) => ({ ...p, minPower: opt.key }))}
                        >
                          <div className="font-semibold">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold"
                    onClick={onReset}
                  >
                    Cancella
                  </button>
                  <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold" onClick={onApply}>
                    Applica filtri
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-gray-900">{label}</div>
      <button
        className={`w-12 h-7 rounded-full p-1 transition-colors ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
        onClick={() => onChange(!value)}
        type="button"
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

