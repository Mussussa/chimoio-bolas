import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";
import type { MapStore } from "../../lib/types";
import { getNearbyStoreLocations, getStoreLocations, type MapCenter, type StoreLocation } from "../../lib/mapStores";

type Props = {
  stores: MapStore[];
  gps: [number, number] | null;
  loading: boolean;
  error: string | null;
  onLocate?: () => void;
  onClearLocation?: () => void;
  entityLabel?: string;
  categoryLabel?: string;
  popupLinkLabel?: string;
  emptyMessage?: string;
  verificationLabels?: { verified: string; unverified: string };
};

const chimoio: [number, number] = [-19.1164, 33.4833];
const MAP_RADIUS_KM = 3;
const MIN_LOCATION_ZOOM = 15;

function FitMapToLocations({ locations, center }: { locations: StoreLocation[]; center: MapCenter | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      const latitudeDelta = MAP_RADIUS_KM / 111;
      const longitudeDelta = MAP_RADIUS_KM / (111 * Math.max(Math.cos(center[0] * Math.PI / 180), 0.1));
      map.fitBounds([
        [center[0] - latitudeDelta, center[1] - longitudeDelta],
        [center[0] + latitudeDelta, center[1] + longitudeDelta]
      ], { padding: [24, 24], maxZoom: 16 });
      if (map.getZoom() < MIN_LOCATION_ZOOM) {
        map.setZoom(MIN_LOCATION_ZOOM);
      }
      return;
    }

    const points = [
      ...locations.map(({ latitude, longitude }) => [latitude, longitude] as [number, number])
    ];

    if (points.length === 0) {
      map.setView(chimoio, 13);
      return;
    }

    map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
  }, [center, locations, map]);

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

export default function MapExplorer({
  stores,
  gps,
  loading,
  error,
  onLocate,
  onClearLocation,
  entityLabel = "lojas",
  categoryLabel = "Categoria da loja",
  popupLinkLabel = "Ver loja e produtos",
  emptyMessage = "Ainda não há lojas com coordenadas para mostrar. As lojas aparecerão aqui quando tiverem uma localização registada.",
  verificationLabels = { verified: "Verificada", unverified: "Não verificada" }
}: Props) {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const allLocations = useMemo(() => getStoreLocations(stores), [stores]);
  const categories = useMemo(() => [...new Set(
    stores.flatMap((store) => parseCategories(store.category))
  )].sort((first, second) => first.localeCompare(second, "pt-MZ")), [stores]);
  const neighborhood = CHIMOIO_NEIGHBORHOODS.find((item) => item.name === selectedNeighborhood);
  const center: MapCenter | null = useMemo(
    () => neighborhood ? [neighborhood.latitude, neighborhood.longitude] : gps,
    [gps, neighborhood]
  );
  const locations = useMemo(
    () => getNearbyStoreLocations(allLocations, center, selectedCategory, MAP_RADIUS_KM),
    [allLocations, center, selectedCategory]
  );

  const mappedStoreCount = allLocations.reduce((total, location) => total + location.stores.length, 0);
  const missingCoordinates = stores.length - mappedStoreCount;

  return (
    <>
      <div className="mb-[14px] grid grid-cols-1 items-end gap-[10px] min-[561px]:grid-cols-2 min-[851px]:grid-cols-[repeat(2,minmax(180px,1fr))_auto_auto]">
        <label>
          <span className="mb-[7px] block text-[11px] font-bold text-[#506472]">Filtrar por bairro</span>
          <select value={selectedNeighborhood} onChange={(event) => setSelectedNeighborhood(event.target.value)}>
            <option value="">Todos os bairros</option>
            {CHIMOIO_NEIGHBORHOODS.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-[7px] block text-[11px] font-bold text-[#506472]">{categoryLabel}</span>
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        {onLocate && (
          <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" type="button" onClick={onLocate}>Usar a minha localização</button>
        )}
        {(gps || selectedNeighborhood) && (
          <button
            className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]"
            type="button"
            onClick={() => { setSelectedNeighborhood(""); onClearLocation?.(); }}
          >
            Limpar localização
          </button>
        )}
      </div>
      <p className="m-0 text-xs text-[var(--muted)]" role="status">
        {loading && stores.length === 0
          ? `A carregar ${entityLabel} do mapa…`
          : center
            ? `${locations.reduce((total, location) => total + location.stores.length, 0)} ${entityLabel} num raio de ${MAP_RADIUS_KM} km`
            : `${locations.reduce((total, location) => total + location.stores.length, 0)} ${entityLabel} com localização no mapa`}
        {missingCoordinates > 0 && ` · ${missingCoordinates} sem coordenadas`}
      </p>
      <div className="my-[10px] mb-3 h-[360px] overflow-hidden rounded-xl border border-[var(--line)] bg-[#e6edf0]" aria-label={`Mapa de ${entityLabel} de Chimoio`}>
        <MapContainer center={chimoio} zoom={13} scrollWheelZoom className="!h-full !w-full">
          <FitMapToLocations locations={locations} center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {center && (
            <Circle center={center} radius={MAP_RADIUS_KM * 1000} pathOptions={{ color: "#b28b00", fillColor: "#ffd21a", fillOpacity: 0.08 }} />
          )}
          {gps && (
            <CircleMarker center={gps} radius={8} pathOptions={{ color: "#fff", fillColor: "#d8a900", fillOpacity: 1 }}>
              <Popup>A sua localização</Popup>
            </CircleMarker>
          )}
          {locations.map((location) => (
            <CircleMarker
              key={`${location.latitude},${location.longitude}`}
              center={[location.latitude, location.longitude]}
              radius={9}
              pathOptions={{ color: "#fff", fillColor: location.stores.some((store) => store.verified) ? "#d8a900" : "#9e9e9e", fillOpacity: 1 }}
            >
              <Popup>
                <div className="grid min-w-[180px] gap-3">
                  {location.stores.map((store) => (
                    <article key={store.id} className="grid gap-[5px]">
                      <b className="text-[13px] text-[var(--navy)]">{store.name}</b>
                      <span className="text-[11px] text-[var(--muted)]">{store.verified ? verificationLabels.verified : verificationLabels.unverified}</span>
                      <span className="text-[11px] font-semibold text-[var(--blue)]">{parseCategories(store.category).join(" · ")}</span>
                      <span className="text-xs text-[var(--muted)]">{store.address}</span>
                      <Link className="text-xs font-bold text-[var(--blue)]" to={store.href ?? `/lojas/${store.id}`}>{popupLinkLabel}</Link>
                      <a className="text-xs font-bold text-[var(--blue)]" href={directionsUrl(store, gps)} target="_blank" rel="noreferrer">
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
      {error && <p className="mb-6 rounded-[7px] bg-[#f5f9fb] p-3 text-xs text-[var(--muted)]" role="alert">{error}</p>}
      {!loading && !error && locations.length === 0 && (
        <p className="mb-6 rounded-[7px] bg-[#f5f9fb] p-3 text-xs text-[var(--muted)]">
          {center
            ? `Não há ${entityLabel} com coordenadas num raio de ${MAP_RADIUS_KM} km desta localização.`
            : emptyMessage}
        </p>
      )}
    </>
  );
}
