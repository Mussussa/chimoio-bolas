import { describe, expect, it } from "vitest";
import { DEFAULT_NEIGHBORHOOD, resolvePreferredNeighborhood } from "./locationPreference";

describe("preferred neighborhood", () => {
  it("uses the central Chimoio neighborhood when no valid preference is saved", () => {
    expect(resolvePreferredNeighborhood(null)).toBe(DEFAULT_NEIGHBORHOOD);
    expect(resolvePreferredNeighborhood("neighborhood does not exist")).toBe(DEFAULT_NEIGHBORHOOD);
  });

  it("keeps a valid saved neighborhood", () => {
    expect(resolvePreferredNeighborhood("Bairro Nhamaonha")).toBe("Bairro Nhamaonha");
  });
});
