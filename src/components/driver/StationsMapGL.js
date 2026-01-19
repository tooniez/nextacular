import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';

// NOTE: Use a CORS-friendly raster provider.
// Some OSM tile endpoints can fail in WebGL renderers due to missing CORS headers,
// which results in an apparently "blank" basemap for users.
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export default function StationsMapGL({
  mapRef,
  viewState,
  onMove,
  stations,
  onSelect,
  styleMode = 'map',
  onDebug,
  uncontrolled = true,
  userLocation = null, // { lat, lon, accuracy? }
}) {
  const internalRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const styleNonceRef = useRef(0);
  const [styleNonce, setStyleNonce] = useState(0);
  const clickHandlerRef = useRef(null);
  const markersRef = useRef([]);
  const debugOnceRef = useRef({ v1: false });
  const inputOnceRef = useRef({ handlers: false, events: false });
  const onSelectRef = useRef(onSelect);
  const onDebugRef = useRef(onDebug);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onDebugRef.current = onDebug;
  }, [onDebug]);

  function agentLog(hypothesisId, location, message, data) {
    // IMPORTANT: must go through server so it works for remote browsers.
    try {
      // #region agent log
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'stations-map',
          hypothesisId,
          location,
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch {}
  }

  const dbg = (hypothesisId, location, message, data) => {
    try {
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'driver-map', hypothesisId, location, message, data, timestamp: Date.now() }),
      }).catch(() => {});
    } catch {}
  };

  const vs = useMemo(
    () =>
      viewState || {
        longitude: 12.4964,
        latitude: 41.9028,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      },
    [viewState]
  );

  useEffect(() => {
    const raw = internalRef.current || mapRef?.current || null;
    const m = raw ? (raw.getMap ? raw.getMap() : raw) : null;
    if (m && mapRef) mapRef.current = raw;
    const map = mapInstance || m;

    if (!map) {
      onDebugRef.current?.({ map: false });
      return;
    }

    // #region agent log
    if (!debugOnceRef.current.mapErrHook) {
      debugOnceRef.current.mapErrHook = true;
      try {
        map.on?.('error', (e) => {
          dbg('MAP_ERR_1', 'StationsMapGL.js', 'map error', {
            msg: e?.error?.message ? String(e.error.message).slice(0, 160) : null,
            src: e?.sourceId ? String(e.sourceId).slice(0, 40) : null,
            status: e?.error?.status ? Number(e.error.status) : null,
          });
        });
      } catch {}
    }
    // #endregion

    // Force touch gestures to be handled by the map (avoid page scroll/zoom stealing them).
    try {
      const canvas = map.getCanvas?.();
      if (canvas?.style) {
        canvas.style.touchAction = 'none';
        canvas.style.pointerEvents = 'auto';
      }
    } catch {}

    // Always log first map click (helps diagnose "can't click markers")
    if (!debugOnceRef.current.anyClickHook) {
      debugOnceRef.current.anyClickHook = true;
      try {
        map.on?.('click', (e) => {
          try {
            const pt = e?.point || null;
            const oev = e?.originalEvent || null;
            const btn = oev && typeof oev.button === 'number' ? oev.button : null;
            const pointerType = oev && oev.pointerType ? String(oev.pointerType) : null;
            // Try to see if our invisible circle layer has a feature under the click.
            let renderedCount = null;
            try {
              const feats = map.queryRenderedFeatures?.(pt, { layers: ['driver-stations-circles'] });
              renderedCount = Array.isArray(feats) ? feats.length : null;
            } catch {}
            agentLog('CLK_MAP_1', 'StationsMapGL.js', 'map click', {
              pt,
              pointerType,
              btn,
              renderedCount,
            });
          } catch {}
        });
      } catch {}
    }

    // One-shot: log interaction handler states + first input events.
    if (!inputOnceRef.current.handlers) {
      inputOnceRef.current.handlers = true;
      // #region agent log
      try {
        dbg('I1', 'StationsMapGL.js:useEffect', 'interaction handlers', {
          dragPan: map.dragPan?.isEnabled?.() ?? null,
          scrollZoom: map.scrollZoom?.isEnabled?.() ?? null,
          touchZoomRotate: map.touchZoomRotate?.isEnabled?.() ?? null,
          doubleClickZoom: map.doubleClickZoom?.isEnabled?.() ?? null,
          keyboard: map.keyboard?.isEnabled?.() ?? null,
          cooperativeGestures: map.cooperativeGestures?.isEnabled?.() ?? null,
        });
      } catch (e) {
        dbg('I1', 'StationsMapGL.js:useEffect', 'interaction handlers error', { error: e?.message || String(e) });
      }
      // #endregion
    }

    if (!inputOnceRef.current.events) {
      inputOnceRef.current.events = true;
      try {
        const canvas = map.getCanvas?.();
        if (canvas?.addEventListener) {
          const onWheel = () => {
            dbg('I2', 'StationsMapGL.js:canvas', 'wheel event', {});
            canvas.removeEventListener('wheel', onWheel);
          };
          const onPointerDown = () => {
            dbg('I3', 'StationsMapGL.js:canvas', 'pointerdown event', {});
            canvas.removeEventListener('pointerdown', onPointerDown);
          };
          const onTouchStart = () => {
            dbg('I4', 'StationsMapGL.js:canvas', 'touchstart event', {});
            canvas.removeEventListener('touchstart', onTouchStart);
          };
          canvas.addEventListener('wheel', onWheel, { passive: true, capture: true });
          canvas.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
          canvas.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
        }
      } catch {}
    }

    let styleObj = null;
    let styleLoaded = null;
    try {
      styleObj = map.getStyle?.() || null;
    } catch {
      styleObj = null;
    }
    try {
      styleLoaded = map.isStyleLoaded?.() ?? null;
    } catch {
      styleLoaded = null;
    }

    if (!styleObj) {
      onDebugRef.current?.({ map: true, styleLoaded: false });
      const onStyle = () => {
        if (styleNonceRef.current > 20) return;
        styleNonceRef.current += 1;
        setStyleNonce((n) => n + 1);
      };
      try {
        map.on?.('styledata', onStyle);
        map.on?.('load', onStyle);
        map.on?.('idle', onStyle);
      } catch {}
      return () => {
        try {
          map.off?.('styledata', onStyle);
          map.off?.('load', onStyle);
          map.off?.('idle', onStyle);
        } catch {}
      };
    }

    const points = (stations || [])
      .map((s) => {
        const lat = Number(s.latitude);
        const lon = Number(s.longitude);
        const connectors = s.connectors || [];
        const availableCount = connectors.filter((c) => String(c.status || '').toUpperCase() === 'AVAILABLE').length;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: { id: String(s.id), availableCount, total: connectors.length },
        };
      })
      .filter((f) => Number.isFinite(f.geometry.coordinates[0]) && Number.isFinite(f.geometry.coordinates[1]));

    const geojson = { type: 'FeatureCollection', features: points };
    const sourceId = 'driver-stations';
    const layerId = 'driver-stations-circles';

    try {
      // "You are here" dot
      const meSourceId = 'driver-me';
      const meLayerId = 'driver-me-dot';
      const meHaloLayerId = 'driver-me-halo';
      const meLat = Number(userLocation?.lat);
      const meLon = Number(userLocation?.lon);
      const meOk = Number.isFinite(meLat) && Number.isFinite(meLon);

      if (meOk) {
        const meGeo = {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [meLon, meLat] }, properties: {} }],
        };
        const meExisting = map.getSource(meSourceId);
        if (!meExisting) map.addSource(meSourceId, { type: 'geojson', data: meGeo });
        else meExisting.setData?.(meGeo);

        if (!map.getLayer(meHaloLayerId)) {
          map.addLayer({
            id: meHaloLayerId,
            type: 'circle',
            source: meSourceId,
            paint: {
              'circle-radius': 18,
              'circle-color': '#2563eb',
              'circle-opacity': 0.18,
            },
          });
        }
        if (!map.getLayer(meLayerId)) {
          map.addLayer({
            id: meLayerId,
            type: 'circle',
            source: meSourceId,
            paint: {
              'circle-radius': 7,
              'circle-color': '#2563eb',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
          });
        }
      } else {
        // remove if present
        try {
          if (map.getLayer(meLayerId)) map.removeLayer(meLayerId);
          if (map.getLayer(meHaloLayerId)) map.removeLayer(meHaloLayerId);
          if (map.getSource(meSourceId)) map.removeSource(meSourceId);
        } catch {}
      }

      const existing = map.getSource(sourceId);
      if (!existing) map.addSource(sourceId, { type: 'geojson', data: geojson });
      else existing.setData?.(geojson);

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 10,
            'circle-color': ['case', ['>', ['get', 'availableCount'], 0], '#16a34a', '#374151'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            // keep as non-visual hit-area; real marker icons are DOM markers
            'circle-opacity': 0.02,
          },
        });
      }
    } catch (e) {
      onDebugRef.current?.({
        map: true,
        styleLoaded,
        features: points.length,
        source: Boolean(map.getSource?.(sourceId)),
        layer: Boolean(map.getLayer?.(layerId)),
        error: e?.message || String(e),
      });
      dbg('C', 'StationsMapGL.js:useEffect', 'addLayer/addSource error', { error: e?.message || String(e) });
      return;
    }

    onDebugRef.current?.({
      map: true,
      styleLoaded,
      features: points.length,
      source: Boolean(map.getSource?.(sourceId)),
      layer: Boolean(map.getLayer?.(layerId)),
      error: null,
    });

    // DOM marker icons (modern look, reliable across styles)
    try {
      // cleanup old markers
      if (Array.isArray(markersRef.current)) {
        markersRef.current.forEach((mk) => {
          try {
            mk?.remove?.();
          } catch {}
        });
      }
      markersRef.current = [];

      const makeEl = ({ availableCount, total }) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', 'Apri colonnina');
        el.style.width = '44px';
        el.style.height = '52px';
        el.style.border = '0';
        el.style.background = 'transparent';
        el.style.padding = '0';
        el.style.cursor = 'pointer';
        el.style.touchAction = 'manipulation';

        const ok = Number(availableCount) > 0;
        const bg = ok ? '#16a34a' : '#374151';
        const ring = ok ? 'rgba(22,163,74,0.25)' : 'rgba(55,65,81,0.25)';

        el.innerHTML = `
          <div style="
            position:relative;
            width:44px;height:52px;
            display:flex;align-items:center;justify-content:center;
            filter: drop-shadow(0 8px 14px rgba(0,0,0,0.18));
          ">
            <div style="
              position:absolute;inset:0;
              display:flex;align-items:center;justify-content:center;
            ">
              <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 52C22 52 40 34.7 40 22C40 9.85 31.95 0 22 0C12.05 0 4 9.85 4 22C4 34.7 22 52 22 52Z" fill="${bg}"/>
                <path d="M22 29.5C26.6944 29.5 30.5 25.6944 30.5 21C30.5 16.3056 26.6944 12.5 22 12.5C17.3056 12.5 13.5 16.3056 13.5 21C13.5 25.6944 17.3056 29.5 22 29.5Z" fill="white" opacity="0.18"/>
              </svg>
            </div>

            <div style="
              position:relative;
              width:30px;height:30px;border-radius:9999px;
              background:rgba(255,255,255,0.15);
              box-shadow: 0 0 0 6px ${ring};
              display:flex;align-items:center;justify-content:center;
              color:#fff;
              font-weight:800;
              font-size:16px;
              letter-spacing:-0.02em;
            ">⚡</div>

            <div style="
              position:absolute; top:2px; right:-2px;
              min-width:24px; height:20px;
              padding:0 6px;
              border-radius:9999px;
              background:#ffffff;
              color:#111827;
              border:1px solid rgba(17,24,39,0.10);
              font-weight:800;
              font-size:12px;
              display:flex;align-items:center;justify-content:center;
            ">${Number(availableCount)}/${Number(total)}</div>
          </div>
        `;
        return el;
      };

      let createdCount = 0;
      (stations || [])
        .map((s) => {
          const lat = Number(s.latitude);
          const lon = Number(s.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const connectors = s.connectors || [];
          const availableCount = connectors.filter((c) => String(c.status || '').toUpperCase() === 'AVAILABLE').length;
          const el = makeEl({ availableCount, total: connectors.length });
          const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lon, lat]).addTo(map);
          createdCount += 1;

          // Help diagnose: does the marker receive pointer events?
          try {
            const onPD = (ev) => {
              agentLog('MK_PD_1', 'StationsMapGL.js', 'marker pointerdown', {
                stationId: String(s.id),
                pointerType: ev?.pointerType ? String(ev.pointerType) : null,
                btn: typeof ev?.button === 'number' ? ev.button : null,
              });
            };
            el.addEventListener('pointerdown', onPD, { capture: true });
          } catch {}

          el.addEventListener('click', (ev) => {
            try {
              ev.preventDefault();
              ev.stopPropagation();
            } catch {}
            agentLog('MK_CLICK_1', 'StationsMapGL.js', 'marker click -> select', { stationId: String(s.id) });
            onSelectRef.current?.(s);
          });
          return mk;
        })
        .filter(Boolean)
        .forEach((mk) => markersRef.current.push(mk));

      if (!debugOnceRef.current.markerCreateOnce) {
        debugOnceRef.current.markerCreateOnce = true;
        // #region agent log
        agentLog('MK_NEW_1', 'StationsMapGL.js', 'markers created', {
          count: createdCount,
          totalStations: Array.isArray(stations) ? stations.length : null,
        });
        // #endregion
      }
    } catch (e) {
      dbg('MK1', 'StationsMapGL.js:useEffect', 'marker render error', { error: e?.message || String(e) });
    }

    // One-shot visibility diagnostics.
    if (!debugOnceRef.current.v1) {
      debugOnceRef.current.v1 = true;
      try {
        const run = () => {
          try {
            const b = map.getBounds?.();
            const sw = b?.getSouthWest?.();
            const ne = b?.getNorthEast?.();
            const inView = points.reduce((acc, f) => {
              const [lon, lat] = f.geometry.coordinates || [];
              if (!Number.isFinite(lon) || !Number.isFinite(lat) || !sw || !ne) return acc;
              return acc + (lon >= sw.lng && lon <= ne.lng && lat >= sw.lat && lat <= ne.lat ? 1 : 0);
            }, 0);
            const rendered = map.queryRenderedFeatures ? map.queryRenderedFeatures({ layers: [layerId] }) : null;
            dbg('V1', 'StationsMapGL.js:useEffect', 'visibility diagnostics', {
              points: points.length,
              inView,
              renderedCount: Array.isArray(rendered) ? rendered.length : null,
              zoom: map.getZoom ? map.getZoom() : null,
            });
          } catch (e) {
            dbg('V1', 'StationsMapGL.js:useEffect', 'visibility diagnostics error', { error: e?.message || String(e) });
          }
        };
        map.once?.('idle', run);
        map.once?.('render', run);
      } catch (e) {
        dbg('V1', 'StationsMapGL.js:useEffect', 'visibility diagnostics setup error', { error: e?.message || String(e) });
      }
    }

    // Click -> select station
    if (clickHandlerRef.current) {
      try {
        map.off('click', layerId, clickHandlerRef.current);
      } catch {}
    }
    const handler = (e) => {
      const feat = e?.features?.[0];
      const id = feat?.properties?.id;
      agentLog('CLK_LAYER_1', 'StationsMapGL.js', 'layer click', {
        hasFeatures: Array.isArray(e?.features) ? e.features.length : null,
        id: id ? String(id) : null,
      });
      if (!id) return;
      const station = (stations || []).find((s) => String(s.id) === String(id));
      if (station) onSelectRef.current?.(station);
    };
    clickHandlerRef.current = handler;
    try {
      map.on('click', layerId, handler);
      map.getCanvas().style.cursor = 'pointer';
    } catch {}

    return () => {
      if (clickHandlerRef.current) {
        try {
          map.off('click', layerId, clickHandlerRef.current);
        } catch {}
      }
    };
  }, [mapInstance, styleNonce, stations, mapRef, userLocation]);

  return (
    <Map
      mapLib={maplibregl}
      ref={internalRef}
      {...(uncontrolled ? { initialViewState: vs } : { viewState: vs })}
      onMove={onMove}
      interactive
      dragPan
      scrollZoom
      doubleClickZoom
      keyboard
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onLoad={(evt) => {
        const raw = internalRef.current || evt?.target;
        const m = raw ? (raw.getMap ? raw.getMap() : raw) : null;
        if (raw && mapRef) mapRef.current = raw;
        if (m) setMapInstance(m);

        // #region agent log
        dbg('U1', 'StationsMapGL.js:onLoad', 'map mounted', {
          uncontrolled,
          dragPan: m?.dragPan?.isEnabled?.() ?? null,
          scrollZoom: m?.scrollZoom?.isEnabled?.() ?? null,
          touchZoomRotate: m?.touchZoomRotate?.isEnabled?.() ?? null,
        });
        // #endregion
      }}
      mapStyle={OSM_STYLE}
      attributionControl
      dragRotate
      touchZoomRotate
      touchPitch={false}
      cooperativeGestures={false}
    />
  );
}

