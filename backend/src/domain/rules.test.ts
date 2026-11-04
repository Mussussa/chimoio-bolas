import { describe, expect, it } from "vitest";
import {
  campaignCosts,
  campaignQuotas,
  canPublishToMeta,
  canTransitionEscrow,
  isUuid,
  isValidPrice,
  shouldPublishBatch,
  subscriptionCosts
} from "./rules.js";

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

  it("publica um lote ao atingir seis anúncios ou trinta minutos", () => {
    const createdAt = new Date(1_000_000);
    expect(shouldPublishBatch(5, createdAt, createdAt.getTime() + 29 * 60 * 1000)).toBe(false);
    expect(shouldPublishBatch(6, createdAt, createdAt.getTime())).toBe(true);
    expect(shouldPublishBatch(1, createdAt, createdAt.getTime() + 30 * 60 * 1000)).toBe(true);
  });

  it("bloqueia Meta Ads sem seis anúncios, receita mínima e publicação Web", () => {
    expect(canPublishToMeta(6, 600, true)).toBe(true);
    expect(canPublishToMeta(5, 600, true)).toBe(false);
    expect(canPublishToMeta(6, 599.99, true)).toBe(false);
    expect(canPublishToMeta(6, 600, false)).toBe(false);
  });

  it("aplica custos e quotas simuladas por plano", () => {
    expect(campaignCosts.basico).toBe(100);
    expect(campaignCosts.premium).toBe(250);
    expect(campaignQuotas.basico).toBe(2);
    expect(campaignQuotas.premium).toBe(4);
    expect(campaignQuotas.empresarial).toBe(0);
    expect(subscriptionCosts.basico).toBe(1000);
    expect(subscriptionCosts.premium).toBe(1500);
  });

  it("não aceita alteração de preço zero, negativo ou não finito", () => {
    expect(isValidPrice(10.5)).toBe(true);
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(Number.NaN)).toBe(false);
  });

  it("permite apenas transições legais para escrow", () => {
    expect(canTransitionEscrow("inactive", "fund", true)).toBe(true);
    expect(canTransitionEscrow("inactive", "fund", false)).toBe(false);
    expect(canTransitionEscrow("active", "dispute", true)).toBe(true);
    expect(canTransitionEscrow("active", "release", true)).toBe(true);
    expect(canTransitionEscrow("completed", "dispute", true)).toBe(false);
  });
});
