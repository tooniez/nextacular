import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import useDriverMe from '@/hooks/useDriverMe';

const StationsMap = dynamic(() => import('@/components/driver/StationsMapGL'), { ssr: false });

export default function DriverMapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const searchGateRef = useRef({ t: 0, q: '' });
  const searchAbortRef = useRef(null);
  const ctxOnceRef = useRef(false);
  const didInitFiltersRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const dbg = (hypothesisId, location, message, data) => {
    try {
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'driver-map', hypothesisId, location, message, data, timestamp: Date.now() }),
      }).catch(() => {});
    } catch {}
  };

  const pageCtx = useMemo(() => {
    if (typeof window === 'undefined') return { secure: null, proto: '', host: '', port: '' };
    return {
      secure: Boolean(window.isSecureContext),
      proto: String(window.location?.protocol || ''),
      host: String(window.location?.hostname || ''),
      port: String(window.location?.port || ''),
    };
  }, []);

  // Avoid hydration mismatch with Map (client-only heavy DOM).
  useEffect(() => {
    setMounted(true);
    // #region agent log
    try {
      const hideFoucCount = document.querySelectorAll?.('style[data-next-hide-fouc]')?.length ?? null;
      const bodyDisplay = document.body ? String(getComputedStyle(document.body)?.display || '') : null;
      const hasNext = Boolean(document.getElementById('__next'));
      dbg('HYD_1', 'driver/map.js', 'mounted', {
        asPath: String(router.asPath || '').slice(0, 120),
        bodyDisplay,
        hideFoucCount,
        hasNext,
      });
    } catch {
      dbg('HYD_1', 'driver/map.js', 'mounted', { asPath: String(router.asPath || '').slice(0, 120) });
    }
    // #endregion
  }, []);

  const [viewState, setViewState] = useState({
    longitude: 12.4964,
    latitude: 41.9028,
    zoom: 12,
    bearing: 0,
    pitch: 0,
  });
  const [userMoved, setUserMoved] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mapDebug, setMapDebug] = useState({ map: false });
  const [showConnectorSheet, setShowConnectorSheet] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    onlyAvailable: false,
    favoritesOnly: false,
    connectorType: 'ANY', // ANY | Type2 | CCS | CHAdeMO
    minPower: 0, // kW
  });
  const [searchQ, setSearchQ] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const { me } = useDriverMe();
  const isAuthed = Boolean(me);

  const { data: stationsData, error: stationsError, isLoading: stationsLoading } = useSWR('/api/driver/stations', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const stations = stationsData?.data || [];
  const showDebug = String(router.query?.debug || '') === '1';

  const { data: favoritesData, mutate: mutateFavorites } = useSWR(isAuthed ? '/api/driver/favorites' : null, fetcher, {
    revalidateOnFocus: false,
  });
  const favorites = favoritesData?.data || [];

  const { data: settingsData } = useSWR(isAuthed ? '/api/driver/profile/settings' : null, fetcher, { revalidateOnFocus: false });
  const settings = settingsData?.data || null;

  const favoriteSet = useMemo(() => new Set(favorites.map((s) => String(s.id))), [favorites]);

  const visibleStations = useMemo(() => {
    const t = String(filters.connectorType || 'ANY');
    const minPower = Number(filters.minPower) || 0;
    return (stations || []).filter((s) => {
      if (filters.favoritesOnly && !favoriteSet.has(String(s.id))) return false;

      const connectors = s.connectors || [];
      const anyAvailable = connectors.some((c) => String(c.status || '').toUpperCase() === 'AVAILABLE');
      if (filters.onlyAvailable && !anyAvailable) return false;

      const typeOk =
        t === 'ANY' ? true : connectors.some((c) => String(c.connectorType || '').toLowerCase() === String(t).toLowerCase());
      if (!typeOk) return false;

      const powerOk = minPower <= 0 ? true : connectors.some((c) => Number(c.maxPower) >= minPower);
      if (!powerOk) return false;

      return true;
    });
  }, [stations, filters, favoriteSet]);

  const center = useMemo(() => {
    const s = stations.find((x) => x.latitude && x.longitude);
    return s ? [Number(s.latitude), Number(s.longitude)] : [41.9028, 12.4964];
  }, [stations]);

  const { data: reservationData, mutate: mutateReservation } = useSWR(isAuthed ? '/api/driver/reservations' : null, fetcher, {
    revalidateOnFocus: false,
  });
  const reservation = reservationData?.data || null;

  const { data: currentSessionData } = useSWR(isAuthed ? '/api/driver/sessions/current' : null, fetcher, { revalidateOnFocus: false });
  const currentSession = currentSessionData?.data || null;

  const selectedIsFavorited = useMemo(() => {
    if (!selected?.id) return false;
    return favorites.some((s) => String(s.id) === String(selected.id));
  }, [favorites, selected]);

  const selectedAvailable = useMemo(() => {
    const cs = selected?.connectors || [];
    const avail = cs.filter((c) => String(c.status || '').toUpperCase() === 'AVAILABLE').length;
    return { avail, total: cs.length };
  }, [selected]);

  useEffect(() => {
    if (userMoved) return;
    const lat = center[0];
    const lon = center[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setViewState((p) => ({ ...p, latitude: lat, longitude: lon }));
  }, [center, userMoved]);

  useEffect(() => setSelectedConnectorId(null), [selected?.id]);

  useEffect(() => {
    if (ctxOnceRef.current) return;
    ctxOnceRef.current = true;
    // #region agent log
    dbg('CTX_1', 'driver/map.js', 'page context', { secure: pageCtx.secure, proto: pageCtx.proto, port: pageCtx.port });
    // #endregion
  }, [pageCtx]);

  useEffect(() => {
    if (didInitFiltersRef.current) return;
    if (!settings?.mapDefaults) return;
    didInitFiltersRef.current = true;

    // Apply saved defaults only if user hasn't changed filters yet (still at base defaults).
    setFilters((p) => {
      const isBase =
        p.onlyAvailable === false && p.favoritesOnly === false && String(p.connectorType) === 'ANY' && Number(p.minPower) === 0;
      if (!isBase) return p;
      return {
        ...p,
        onlyAvailable: Boolean(settings.mapDefaults.onlyAvailable),
        favoritesOnly: Boolean(settings.mapDefaults.favoritesOnly),
        connectorType: String(settings.mapDefaults.connectorType || 'ANY'),
        minPower: Number(settings.mapDefaults.minPower || 0),
      };
    });
  }, [settings]);

  const runSearch = async (q, reason) => {
    const trimmed = String(q || '').trim();
    if (trimmed.length < 3) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    try {
      if (searchAbortRef.current) searchAbortRef.current.abort();
    } catch {}
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    searchAbortRef.current = ac;

    setSearchBusy(true);
    // #region agent log
    dbg('S_UI_2', 'driver/map.js', 'search auto', { qLen: trimmed.length, reason: String(reason || '').slice(0, 16) });
    // #endregion

    try {
      const resp = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`, { method: 'GET', signal: ac?.signal });
      const json = await resp.json().catch(() => ({}));
      const list = json?.data || [];
      setSearchResults(Array.isArray(list) ? list : []);
      setSearchOpen(true);
    } catch (err) {
      if (String(err?.name || '') === 'AbortError') return;
      setSearchResults([]);
      setSearchOpen(false);
    } finally {
      setSearchBusy(false);
    }
  };

  const getMap = () => {
    const raw = mapRef.current;
    return raw ? (raw.getMap ? raw.getMap() : raw) : null;
  };

  const flyTo = (reason, { lon, lat, zoom = 15 }) => {
    const map = getMap();
    const L = Number(lat);
    const O = Number(lon);
    if (!map || !Number.isFinite(L) || !Number.isFinite(O)) return;
    // #region agent log
    dbg('MAP_FLY_1', 'driver/map.js', 'flyTo', { reason: String(reason).slice(0, 40), lat: Math.round(L * 1000) / 1000, lon: Math.round(O * 1000) / 1000, zoom });
    // #endregion
    try {
      map.flyTo({ center: [O, L], zoom, duration: 900 });
    } catch {}
    if (!userMoved) setUserMoved(true);
  };

  const handleSelectStation = useCallback((s) => {
    setSelected(s);
    setShowConnectorSheet(false);
    setSearchOpen(false);
  }, []);

  const handleMapDebug = useCallback((d) => {
    setMapDebug(d);
  }, []);

  return (
    <DriverLayout hideHeader fullBleed>
      <Meta title="Mappa - Area Conducente" />

      <div className="relative h-[calc(100vh-5rem)]">
        <div className="absolute inset-0 bg-white">
          {mounted ? (
            <StationsMap
              mapRef={mapRef}
              viewState={viewState}
              uncontrolled
              stations={visibleStations}
              userLocation={userLocation}
              onSelect={handleSelectStation}
              onMove={() => {
                // keep a flag for initial auto-centering only
                if (!userMoved) setUserMoved(true);
              }}
              onDebug={showDebug ? handleMapDebug : undefined}
            />
          ) : null}
        </div>

        {/* Search bar on top (like screenshot) */}
        <div className="absolute top-4 left-4 right-4 z-50">
          <div className="mx-auto max-w-xl">
            <div className="relative">
              <div className="bg-white/95 backdrop-blur border rounded-2xl shadow flex items-center gap-2 px-4 py-3">
                <span className="text-gray-400 select-none">⌕</span>
                <form
                  className="flex-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const q = String(searchQ || '').trim();
                    if (q.length < 3) {
                      toast.error('Scrivi almeno 3 caratteri');
                      return;
                    }
                    // #region agent log
                    dbg('S_UI_1', 'driver/map.js', 'search submit', { qLen: q.length });
                    // #endregion
                    try {
                      await runSearch(q, 'submit');
                    } catch (err) {
                      toast.error(err?.message || 'Errore ricerca');
                      setSearchResults([]);
                      setSearchOpen(false);
                    }
                  }}
                >
                  <input
                    className="w-full bg-transparent outline-none text-sm py-1"
                    placeholder="Cerca un indirizzo"
                    value={searchQ}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSearchQ(next);

                      const q = String(next || '').trim();
                      if (q.length < 3) {
                        setSearchOpen(false);
                        setSearchResults([]);
                        return;
                      }

                      const now = Date.now();
                      const last = searchGateRef.current || { t: 0, q: '' };
                      const gateMs = 350;
                      if (now - last.t < gateMs && q !== last.q) return;
                      searchGateRef.current = { t: now, q };
                      runSearch(q, 'type');
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setSearchOpen(true);
                      const q = String(searchQ || '').trim();
                      if (q.length >= 3 && searchResults.length === 0) runSearch(q, 'focus');
                    }}
                  />
                </form>

                <button
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 text-sm font-semibold"
                  onClick={() => {
                    setFiltersOpen(true);
                    // #region agent log
                    dbg('F_UI_1', 'driver/map.js', 'open filters', {});
                    // #endregion
                  }}
                  aria-label="Filtri"
                  type="button"
                >
                  ☰
                </button>
              </div>

              {searchOpen && searchResults.length > 0 ? (
                <div className="absolute left-0 right-0 mt-2 bg-white border rounded-2xl shadow overflow-hidden">
                  {searchResults.slice(0, 6).map((r, idx) => (
                    <button
                      key={`${idx}-${r.lat}-${r.lon}`}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchResults([]);
                        flyTo('search', { lat: r.lat, lon: r.lon, zoom: 15 });
                      }}
                      type="button"
                    >
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{r.displayName}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {mounted && (!pageCtx.secure || pageCtx.proto !== 'https:') ? (
                <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">GPS richiede HTTPS</div>
                    <div className="text-xs text-amber-800 truncate">Apri la versione HTTPS per abilitare la posizione.</div>
                  </div>
                  <button
                    className="shrink-0 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-2 text-sm font-semibold"
                    onClick={() => {
                      try {
                        const h = typeof window !== 'undefined' ? window.location.hostname : '89.46.70.101';
                        window.location.href = `https://${h}:3443/driver/map`;
                      } catch {}
                    }}
                    type="button"
                  >
                    Apri HTTPS
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* GPS button bottom-right (raised ~10px) */}
        <div className="absolute bottom-7 right-4 z-50">
          <button
            className="h-12 w-12 rounded-full bg-white/95 backdrop-blur border shadow flex items-center justify-center text-gray-900 text-lg"
            disabled={searchBusy}
            onClick={() => {
              const secure = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : null;
              const proto = typeof window !== 'undefined' ? String(window.location?.protocol || '') : '';

              if (!navigator?.geolocation) {
                toast.error('GPS non disponibile');
                return;
              }

              // #region agent log
              dbg('G_UI_0', 'driver/map.js', 'gps context', { secure, proto });
              // #endregion

              // #region agent log
              dbg('G_UI_1', 'driver/map.js', 'gps request', {});
              // #endregion

              try {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const lat = Number(pos?.coords?.latitude);
                    const lon = Number(pos?.coords?.longitude);
                    const acc = Number(pos?.coords?.accuracy);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                      toast.error('Posizione non valida');
                      return;
                    }
                    setUserLocation({ lat, lon, accuracy: Number.isFinite(acc) ? acc : null });
                    // #region agent log
                    dbg('G_UI_2', 'driver/map.js', 'gps success', {
                      lat: Math.round(lat * 1000) / 1000,
                      lon: Math.round(lon * 1000) / 1000,
                      acc: Math.round((acc || 0) * 10) / 10,
                    });
                    // #endregion
                    flyTo('gps', { lat, lon, zoom: 15 });
                    toast.success('Posizione aggiornata');
                  },
                  (err) => {
                    const code = err?.code ?? null;
                    // #region agent log
                    dbg('G_UI_3', 'driver/map.js', 'gps error', { code, secure, proto });
                    // #endregion

                    if (code === 1 && proto !== 'https:' && secure === false) {
                      toast.error('GPS richiede HTTPS: usa la ricerca indirizzo o apri la versione HTTPS.');
                      return;
                    }
                    if (code === 1) return toast.error('Permesso GPS negato. Abilitalo nelle impostazioni del browser.');
                    if (code === 2) return toast.error('Posizione non disponibile. Attiva la localizzazione del telefono.');
                    if (code === 3) return toast.error('Timeout GPS. Riprova.');
                    toast.error('Errore GPS.');
                  },
                  { enableHighAccuracy: true, timeout: 9000, maximumAge: 10000 }
                );
              } catch {
                toast.error('Errore GPS');
              }
            }}
            aria-label="Posizione"
            type="button"
            title="Posizione"
          >
            ⊕
          </button>
        </div>

        {/* Current session quick access */}
        {currentSession ? (
          <div className="absolute top-20 left-4 right-4 z-50">
            <div className="mx-auto max-w-xl">
              <div className="bg-white/95 backdrop-blur border rounded-2xl shadow px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-gray-500">Ricarica in corso</div>
                  <div className="font-semibold truncate">{currentSession?.station?.name || '—'}</div>
                </div>
                <button
                  className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2"
                  onClick={() => router.push(`/driver/charging?sessionId=${encodeURIComponent(String(currentSession.id))}`)}
                >
                  Apri
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showDebug ? (
          <div className="absolute bottom-4 left-4 z-50">
            {stationsLoading ? (
              <div className="text-xs bg-white/90 border rounded-full px-3 py-2 shadow">Caricamento colonnine…</div>
            ) : stationsError ? (
              <div className="text-xs bg-white/95 border rounded-xl px-3 py-2 shadow max-w-[70vw]">
                <div className="font-semibold text-red-700">Errore colonnine</div>
                <div className="text-gray-700">{stationsError?.message || 'Errore nel caricamento'}</div>
              </div>
            ) : (
              <div className="text-xs bg-white/90 border rounded-xl px-3 py-2 shadow max-w-[80vw]">
                <div>
                  Stazioni: <span className="font-semibold">{stations.length}</span> • Visibili:{' '}
                  <span className="font-semibold">{visibleStations.length}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-700">
                  Map: <span className="font-semibold">{String(mapDebug?.map ?? '—')}</span> • Style:{' '}
                  <span className="font-semibold">{String(mapDebug?.styleLoaded ?? '—')}</span> • Source:{' '}
                  <span className="font-semibold">{String(mapDebug?.source ?? '—')}</span> • Layer:{' '}
                  <span className="font-semibold">{String(mapDebug?.layer ?? '—')}</span> • Features:{' '}
                  <span className="font-semibold">{String(mapDebug?.features ?? '—')}</span>
                  {mapDebug?.error ? <div className="text-red-700">err: {String(mapDebug.error).slice(0, 120)}</div> : null}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="absolute inset-0 z-[60]">
            <button
              className="absolute inset-0 bg-black/40"
              onClick={() => setFiltersOpen(false)}
              aria-label="Chiudi filtri"
              type="button"
            />
            <div className="absolute inset-x-0 bottom-0">
              <div className="mx-auto max-w-xl">
                <div className="rounded-t-3xl border bg-white shadow-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Filtri</div>
                    <button
                      className="rounded-xl bg-gray-100 hover:bg-gray-200 px-3 py-2 text-sm font-semibold"
                      onClick={() => setFiltersOpen(false)}
                      type="button"
                    >
                      Chiudi
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">Solo disponibili</span>
                      <input
                        type="checkbox"
                        checked={filters.onlyAvailable}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setFilters((p) => ({ ...p, onlyAvailable: v }));
                          // #region agent log
                          dbg('F_UI_2', 'driver/map.js', 'toggle onlyAvailable', { v });
                          // #endregion
                        }}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">Solo preferiti</span>
                      <input
                        type="checkbox"
                        checked={filters.favoritesOnly}
                        onChange={(e) => {
                          const v = e.target.checked;
                          if (v && !isAuthed) {
                            toast('Accedi per usare i preferiti.');
                            router.push(`/auth/login?callbackUrl=${encodeURIComponent(String(router.asPath || '/driver/map'))}`);
                            return;
                          }
                          setFilters((p) => ({ ...p, favoritesOnly: v }));
                          // #region agent log
                          dbg('F_UI_3', 'driver/map.js', 'toggle favoritesOnly', { v });
                          // #endregion
                        }}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">Tipo presa</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {['ANY', 'Type2', 'CCS', 'CHAdeMO'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={[
                              'rounded-xl border px-3 py-2 text-sm font-semibold',
                              filters.connectorType === t
                                ? 'border-blue-600 bg-blue-50 text-blue-800'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-900',
                            ].join(' ')}
                            onClick={() => {
                              setFilters((p) => ({ ...p, connectorType: t }));
                              // #region agent log
                              dbg('F_UI_4', 'driver/map.js', 'set connectorType', { t });
                              // #endregion
                            }}
                          >
                            {t === 'ANY' ? 'Qualsiasi' : t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">Potenza minima</div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {[0, 11, 22, 50].map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            className={[
                              'rounded-xl border px-2 py-2 text-sm font-semibold',
                              Number(filters.minPower) === kw
                                ? 'border-blue-600 bg-blue-50 text-blue-800'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-900',
                            ].join(' ')}
                            onClick={() => {
                              setFilters((p) => ({ ...p, minPower: kw }));
                              // #region agent log
                              dbg('F_UI_5', 'driver/map.js', 'set minPower', { kw });
                              // #endregion
                            }}
                          >
                            {kw === 0 ? '0+' : `${kw}+`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs text-gray-500">
                        Risultati: <span className="font-semibold text-gray-900">{visibleStations.length}</span>
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                        onClick={() => setFiltersOpen(false)}
                      >
                        Applica
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {selected ? (
          <div className="absolute inset-x-0 bottom-0 z-50">
            <div className="mx-auto max-w-xl">
              <div className="rounded-t-3xl border bg-white shadow-2xl">
                <div className="px-5 pt-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{selected?.workspace?.name || 'Colonnina'}</div>
                      <div className="text-lg font-bold leading-tight truncate">{selected.name}</div>
                      <div className="text-sm text-gray-600 truncate">{selected.location || '—'}</div>
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-100 px-2 py-1">
                          Disponibili {selectedAvailable.avail}/{selectedAvailable.total}
                        </span>
                        {reservation ? (
                          <span className="text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1">
                            Prenotazione attiva
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 text-sm font-semibold"
                      onClick={() => {
                        setSelected(null);
                        setShowConnectorSheet(false);
                      }}
                    >
                      Chiudi
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                      onClick={() => {
                        setShowConnectorSheet(true);
                      }}
                    >
                      Avvia ricarica
                    </button>

                    <button
                      className="rounded-2xl bg-white border hover:bg-gray-50 text-gray-900 font-semibold py-3"
                      disabled={busy}
                      onClick={async () => {
                        if (!selected?.id) return;
                        setBusy(true);
                        try {
                          const isFav = selectedIsFavorited;
                          const resp = await api('/api/driver/favorites', {
                            method: isFav ? 'DELETE' : 'POST',
                            body: { stationId: String(selected.id) },
                          });
                          if (resp?.errors) {
                            Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                            return;
                          }
                          toast.success(isFav ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti');
                          mutateFavorites();
                        } catch (e) {
                          toast.error(e?.message || 'Errore preferiti');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {selectedIsFavorited ? '★ Preferito' : '☆ Preferito'}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      className="rounded-2xl bg-white border hover:bg-gray-50 text-gray-900 font-semibold py-3 disabled:opacity-60"
                      disabled={busy}
                      onClick={async () => {
                        if (!selected?.id) return;
                        setBusy(true);
                        try {
                          if (reservation?.id) {
                            const resp = await api('/api/driver/reservations', {
                              method: 'DELETE',
                              body: { reservationId: String(reservation.id) },
                            });
                            if (resp?.errors) {
                              Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                              return;
                            }
                            toast.success('Prenotazione annullata');
                            mutateReservation();
                            return;
                          }
                          const resp = await api('/api/driver/reservations', {
                            method: 'POST',
                            body: { stationId: String(selected.id), minutes: 15 },
                          });
                          if (resp?.errors) {
                            Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                            return;
                          }
                          toast.success('Prenotazione attivata (15 min)');
                          mutateReservation();
                        } catch (e) {
                          toast.error(e?.message || 'Errore prenotazione');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {reservation?.id ? 'Annulla prenotazione' : 'Prenota 15 min'}
                    </button>

                    <button
                      className="rounded-2xl bg-white border hover:bg-gray-50 text-gray-900 font-semibold py-3"
                      onClick={() => {
                        const lat = Number(selected.latitude);
                        const lon = Number(selected.longitude);
                        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                        const q = encodeURIComponent(`${lat},${lon}`);
                        window.open(`https://www.google.com/maps?q=${q}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Naviga
                    </button>
                  </div>
                </div>

                {showConnectorSheet ? (
                  <div className="border-t bg-gray-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Scegli la presa</div>
                      <button
                        className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                        onClick={() => setShowConnectorSheet(false)}
                      >
                        Chiudi
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(selected.connectors || []).map((c) => {
                        const available = String(c.status || '').toUpperCase() === 'AVAILABLE';
                        const active = String(selectedConnectorId) === String(c.id);
                        return (
                          <button
                            key={c.id}
                            className={[
                              'w-full text-left rounded-2xl border px-4 py-3',
                              active ? 'border-blue-600 bg-white' : 'border-gray-200 bg-white hover:bg-gray-50',
                              !available ? 'opacity-60' : '',
                            ].join(' ')}
                            onClick={() => setSelectedConnectorId(String(c.id))}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold">
                                  {c.connectorType || 'Presa'} (#{c.connectorId})
                                </div>
                                <div className="text-xs text-gray-600">
                                  {c.maxPower ? `${Number(c.maxPower).toFixed(0)} kW` : '—'} • {String(c.status || '').toUpperCase()}
                                </div>
                              </div>
                              <div
                                className={[
                                  'text-xs font-semibold rounded-full px-2 py-1 border',
                                  available ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-200',
                                ].join(' ')}
                              >
                                {available ? 'Disponibile' : 'Occupata'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <button
                        className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 disabled:opacity-60"
                        disabled={!selectedConnectorId}
                        onClick={() => {
                          router.push(
                            `/driver/charge/confirm?stationId=${encodeURIComponent(String(selected.id))}&connectorId=${encodeURIComponent(
                              String(selectedConnectorId)
                            )}`
                          );
                        }}
                      >
                        Continua
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DriverLayout>
  );
}

// Force this page to be treated as SSR (prevents "autoExport/nextExport" HTML that can omit page bundle scripts)
// and ensures correct hydration in browse-mode.
export async function getServerSideProps(ctx) {
  // #region agent log
  try {
    const xfHostRaw = ctx?.req?.headers?.['x-forwarded-host'];
    const hostRaw = ctx?.req?.headers?.host;
    const xfProtoRaw = ctx?.req?.headers?.['x-forwarded-proto'];
    const uaRaw = ctx?.req?.headers?.['user-agent'];
    const host = (Array.isArray(xfHostRaw) ? xfHostRaw[0] : xfHostRaw) || (Array.isArray(hostRaw) ? hostRaw[0] : hostRaw) || null;
    const proto = (Array.isArray(xfProtoRaw) ? xfProtoRaw[0] : xfProtoRaw) || null;
    const ua = Array.isArray(uaRaw) ? uaRaw[0] : uaRaw;

    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-map-ssr',
        hypothesisId: 'DM_SSR_1',
        location: 'src/pages/driver/map.js:getServerSideProps',
        message: 'driver map SSR hit',
        data: {
          host: host ? String(host).slice(0, 120) : null,
          proto: proto ? String(proto).slice(0, 20) : null,
          url: ctx?.req?.url ? String(ctx.req.url).slice(0, 200) : null,
          uaPrefix: ua ? String(ua).slice(0, 40) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion
  return { props: {} };
}

