import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function StationsMap({ center, stations, onSelect }) {
  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {stations
        .filter((s) => s.latitude && s.longitude)
        .map((s) => (
          <Marker
            key={s.id}
            position={[s.latitude, s.longitude]}
            eventHandlers={{
              click: () => onSelect(s),
            }}
          >
            <Popup>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs">{s.location || '—'}</div>
              <button className="text-blue-600 text-sm mt-2" onClick={() => onSelect(s)}>
                Apri
              </button>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

