import { describe, expect, it } from "vitest";
import { isUuid, isValidPrice } from "./rules.js";

describe("regras do marketplace", () => {
  it("valida preços finitos e estritamente positivos", () => {
    expect(isValidPrice(1)).toBe(true);
    expect(isValidPrice(0)).toBe(false);
    expect(isValidPrice(Number.NaN)).toBe(false);
    expect(isValidPrice(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("valida UUIDs recebidos nas rotas críticas", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("../negotiations")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("não aceita alteração de preço zero, negativo ou não finito", () => {
    expect(isValidPrice(10.5)).toBe(true);
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(Number.NaN)).toBe(false);
  });
});
