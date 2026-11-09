import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

type Store = { id: string; name: string; category: string | string[]; address: string; latitude: number | null; longitude: number | null };
type Props = { stores: Store[]; gps: [number, number] | null };
const chimoio: [number, number] = [-19.1164, 33.4833];

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapExplorer({ stores, gps }: Props) {
  const center: [number, number] = gps ?? chimoio;
  const mappedStores = useMemo(() => stores
    .filter((store) => store.latitude !== null && store.longitude !== null)
    .map((store) => ({
      ...store,
      latitude: Number(store.latitude),
      longitude: Number(store.longitude)
    }))
    .filter((store) => Number.isFinite(store.latitude) && Number.isFinite(store.longitude)), [stores]);

  return (
    <div className="map-frame" aria-label="Mapa de lojas de Chimoio">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="leaflet-map">
        <Recenter center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {gps && <CircleMarker center={gps} radius={8} pathOptions={{ color: "#fff", fillColor: "#17629b", fillOpacity: 1 }}>
          <Popup>A sua localização</Popup>
        </CircleMarker>}
        {mappedStores.map((store) => <CircleMarker
          key={store.id}
          center={[store.latitude, store.longitude]}
          radius={9}
          pathOptions={{ color: "#fff", fillColor: "#df8150", fillOpacity: 1 }}
        ><Popup><b>{store.name}</b><br />{Array.isArray(store.category) ? store.category.join(" · ") : store.category}<br />{store.address}</Popup></CircleMarker>)}
      </MapContainer>
    </div>
  );
}
