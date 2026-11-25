import type { MapStore } from "./types";

export type StoreLocation = { latitude: number; longitude: number; stores: Array<MapStore & { latitude: number; longitude: number }> };
export type MapCenter = [number, number];

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

export function getNearbyStoreLocations(
  locations: StoreLocation[],
  center: MapCenter | null,
  category: string,
  radiusKm = 3
): StoreLocation[] {
  return locations.flatMap((location) => {
    const distance = center
      ? distanceInKm(center[0], center[1], location.latitude, location.longitude)
      : null;
    if (distance !== null && distance > radiusKm) return [];

    const stores = category
      ? location.stores.filter((store) => parseStoreCategories(store.category).includes(category))
      : location.stores;
    return stores.length ? [{ ...location, stores }] : [];
  });
}

export function distanceInKm(latitude1: number, longitude1: number, latitude2: number, longitude2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLatitude = radians(latitude2 - latitude1);
  const deltaLongitude = radians(longitude2 - longitude1);
  const arc = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function parseStoreCategories(category: string | string[]): string[] {
  if (Array.isArray(category)) return category;
  return category
    .replace(/^\{|\}$/g, "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}
