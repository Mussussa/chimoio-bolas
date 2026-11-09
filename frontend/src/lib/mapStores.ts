import type { MapStore } from "./types";

export type StoreLocation = { latitude: number; longitude: number; stores: Array<MapStore & { latitude: number; longitude: number }> };

const MAP_STORE_PAGE_SIZE = 1000;

export async function loadAllMapStores(
  fetchPage: (offset: number, limit: number) => Promise<{
    data: MapStore[] | null;
    error: { message: string } | null;
  }>
): Promise<MapStore[]> {
  const stores: MapStore[] = [];

  for (let offset = 0; ; offset += MAP_STORE_PAGE_SIZE) {
    const { data, error } = await fetchPage(offset, MAP_STORE_PAGE_SIZE);
    if (error) throw new Error(`Não foi possível carregar as lojas do mapa: ${error.message}`);
    if (data === null) throw new Error("Não foi possível carregar as lojas do mapa: resposta sem dados.");

    stores.push(...data);
    if (data.length < MAP_STORE_PAGE_SIZE) return stores;
  }
}

export function getStoreLocations(stores: MapStore[]): StoreLocation[] {
  const byCoordinates = new Map<string, StoreLocation>();

  for (const store of stores) {
    if (store.latitude === null || store.longitude === null) continue;

    const latitude = Number(store.latitude);
    const longitude = Number(store.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) continue;

    const key = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
    const location = byCoordinates.get(key) ?? { latitude, longitude, stores: [] };
    location.stores.push({ ...store, latitude, longitude });
    byCoordinates.set(key, location);
  }

  return [...byCoordinates.values()];
}
