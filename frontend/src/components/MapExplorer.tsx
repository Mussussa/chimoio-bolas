import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { MapStore } from "../lib/types";
import { getStoreLocations, type StoreLocation } from "../lib/mapStores";

type Props = {
  stores: MapStore[];
  gps: [number, number] | null;
  loading: boolean;
  error: string | null;
};

const chimoio: [number, number] = [-19.1164, 33.4833];

function FitMapToLocations({ locations, gps }: { locations: StoreLocation[]; gps: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...locations.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
      ...(gps ? [gps] : [])
    ];

    if (points.length === 0) {
      map.setView(chimoio, 13);
      return;
    }

    map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
  }, [gps, locations, map]);

  return null;
}

function parseCategories(category: string | string[]): string[] {
  if (Array.isArray(category)) return category;
  return category
    .replace(/^\{|\}$/g, "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}

function directionsUrl(store: MapStore & { latitude: number; longitude: number }, gps: [number, number] | null): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${store.latitude},${store.longitude}`,
    travelmode: "driving"
  });
  if (gps) params.set("origin", `${gps[0]},${gps[1]}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function MapExplorer({ stores, gps, loading, error }: Props) {
  const locations = useMemo(() => getStoreLocations(stores), [stores]);

  const missingCoordinates = stores.length - locations.reduce((total, location) => total + location.stores.length, 0);

  return (
    <>
      <p className="map-summary" role="status">
        {loading && stores.length === 0
          ? "A carregar lojas do mapa…"
          : `${locations.reduce((total, location) => total + location.stores.length, 0)} lojas com localização no mapa`}
        {missingCoordinates > 0 && ` · ${missingCoordinates} sem coordenadas`}
      </p>
      <div className="map-frame" aria-label="Mapa de lojas de Chimoio">
        <MapContainer center={chimoio} zoom={13} scrollWheelZoom className="leaflet-map">
          <FitMapToLocations locations={locations} gps={gps} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {gps && (
            <CircleMarker center={gps} radius={8} pathOptions={{ color: "#fff", fillColor: "#17629b", fillOpacity: 1 }}>
              <Popup>A sua localização</Popup>
            </CircleMarker>
          )}
          {locations.map((location) => (
            <CircleMarker
              key={`${location.latitude},${location.longitude}`}
              center={[location.latitude, location.longitude]}
              radius={9}
              pathOptions={{ color: "#fff", fillColor: location.stores.some((store) => store.verified) ? "#df8150" : "#9e9e9e", fillOpacity: 1 }}
            >
              <Popup>
                <div className="map-popup">
                  {location.stores.map((store) => (
                    <article key={store.id} className="map-popup-store">
                      <b>{store.name}</b>
                      <span>{store.verified ? "Verificada" : "Pendente de verificação"}</span>
                      <span className="map-popup-category">{parseCategories(store.category).join(" · ")}</span>
                      <span>{store.address}</span>
                      <a href={directionsUrl(store, gps)} target="_blank" rel="noreferrer">
                        Abrir rota no Google Maps
                      </a>
                    </article>
                  ))}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {error && <p className="map-empty" role="alert">{error}</p>}
      {!loading && !error && locations.length === 0 && (
        <p className="map-empty">
          Ainda não há lojas com coordenadas para mostrar. As lojas aparecerão aqui quando tiverem uma localização registada.
        </p>
      )}
    </>
  );
}
