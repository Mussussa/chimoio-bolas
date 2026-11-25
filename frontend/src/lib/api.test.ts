import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API response handling", () => {
  it("reports an HTTP status when the server returns an empty error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

    await expect(api("/stores/example")).rejects.toThrow("Pedido falhou (502).");
  });

  it("reports invalid JSON instead of leaking a JSON parse exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>")));

    await expect(api("/stores/example")).rejects.toThrow("A API devolveu uma resposta inválida.");
  });

  it("reports an invalid response when a successful response has no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await expect(api("/stores/example")).rejects.toThrow("A API devolveu uma resposta inválida.");
  });

  it("uses the error message from a valid API error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      message: "Loja não encontrada."
    }), { status: 404 })));

    await expect(api("/stores/example")).rejects.toThrow("Loja não encontrada.");
  });

  it("returns data from a valid API success response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: "store-1" }
    }))));

    await expect(api<{ id: string }>("/stores/example")).resolves.toEqual({ id: "store-1" });
  });
});
