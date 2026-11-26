import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuid } from "./uuid";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createUuid", () => {
  it("uses the browser UUID implementation when available", () => {
    const uuid = "00000000-0000-4000-8000-000000000000";
    vi.stubGlobal("crypto", { randomUUID: () => uuid });

    expect(createUuid()).toBe(uuid);
  });

  it("creates a secure version 4 UUID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0);
        return bytes;
      }
    });

    expect(createUuid()).toBe("00000000-0000-4000-8000-000000000000");
  });
});
