import { describe, expect, it } from "vitest";
import { SERVICE_CATEGORY_IMAGES, STORE_CATEGORY_IMAGES, FALLBACK_IMAGE } from "./categoryPlaceholders";
import { STORE_CATEGORIES } from "../components/merchant/merchantTypes";
import { PROVIDER_CATEGORIES } from "../components/provider/providerTypes";

describe("category placeholder images", () => {
  it("maps every store category to a local default image", () => {
    expect(Object.keys(STORE_CATEGORY_IMAGES).sort()).toEqual([...STORE_CATEGORIES].sort());
    for (const imagePath of Object.values(STORE_CATEGORY_IMAGES)) {
      expect(imagePath).toMatch(/^\/images\/defaults\/stores\/[a-z0-9-]+\.jpg$/);
    }
  });

  it("maps every service category to a local default image", () => {
    expect(Object.keys(SERVICE_CATEGORY_IMAGES).sort()).toEqual([...PROVIDER_CATEGORIES].sort());
    for (const imagePath of Object.values(SERVICE_CATEGORY_IMAGES)) {
      expect(imagePath).toMatch(/^\/images\/defaults\/services\/[a-z0-9-]+\.jpg$/);
    }
  });

  it("defines the general fallback image", () => {
    expect(FALLBACK_IMAGE).toBe("/images/defaults/fallback.jpg");
  });
});
