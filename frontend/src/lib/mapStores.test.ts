import { describe, expect, it } from "vitest";
import { getStoreLocations, loadAllMapStores } from "./mapStores";
import type { MapStore } from "./types";

function createStore(id: string, latitude: number | string | null = -19.1164, longitude: number | string | null = 33.4833): MapStore {
  return {
    id,
    name: `Loja ${id}`,
    category: ["Alimentação"],
    address: "Centro",
    latitude,
    longitude,
    verified: false
  };
}

describe("map stores", () => {
  it("loads every page, including rows beyond the API page limit", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => createStore(String(index)));
    const lastPage = [createStore("1000", -19.12, 33.48)];
    const offsets: Array<[number, number]> = [];

    const stores = await loadAllMapStores(async (offset, limit) => {
      offsets.push([offset, limit]);
      return { data: offset === 0 ? firstPage : lastPage, error: null };
    });

    expect(stores).toHaveLength(1001);
    expect(offsets).toEqual([[0, 1000], [1000, 1000]]);
  });

  it("reports query failures instead of treating them as an empty map", async () => {
    await expect(loadAllMapStores(async () => ({
      data: null,
      error: { message: "permission denied" }
    }))).rejects.toThrow("permission denied");
  });

  it("creates a pin for every valid store and groups stores at identical coordinates", () => {
    const stores = [
      createStore("first", "-19.1164", "33.4833"),
      createStore("same-location", -19.1164, 33.4833),
      createStore("another-location", -19.12, 33.48),
      createStore("no-location", null, null),
      createStore("invalid-location", 120, 33.48)
    ];

    const locations = getStoreLocations(stores);

    expect(locations).toHaveLength(2);
    expect(locations[0].stores.map((store) => store.id)).toEqual(["first", "same-location"]);
    expect(locations[1].stores.map((store) => store.id)).toEqual(["another-location"]);
  });
});
