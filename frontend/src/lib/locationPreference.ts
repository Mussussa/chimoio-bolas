import { CHIMOIO_NEIGHBORHOODS } from "./chimoioNeighborhoods";

export const DEFAULT_NEIGHBORHOOD = "Centro / Comércio";
export const LOCATION_PREFERENCE_STORAGE_KEY = "yellow-preferred-neighborhood";

export function resolvePreferredNeighborhood(savedNeighborhood: string | null): string {
  return CHIMOIO_NEIGHBORHOODS.find((item) => item.name === savedNeighborhood)?.name
    ?? DEFAULT_NEIGHBORHOOD;
}

export function readPreferredNeighborhood(): string {
  try {
    return resolvePreferredNeighborhood(window.localStorage.getItem(LOCATION_PREFERENCE_STORAGE_KEY));
  } catch (error) {
    console.warn("Could not read the saved neighborhood preference.", error);
    return DEFAULT_NEIGHBORHOOD;
  }
}

export function savePreferredNeighborhood(neighborhood: string): void {
  try {
    window.localStorage.setItem(LOCATION_PREFERENCE_STORAGE_KEY, neighborhood);
  } catch (error) {
    console.warn("Could not save the neighborhood preference.", error);
  }
}
