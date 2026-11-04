import type { PackageType, SubscriptionTier } from "../models/index.js";

export const campaignCosts: Record<PackageType, number> = {
  standard: 150,
  premium: 250,
  basico: 100,
  destaque: 150
};

export const campaignQuotas: Record<SubscriptionTier, number> = {
  basico: 2,
  premium: 4,
  empresarial: 0
};

export const subscriptionCosts: Record<Exclude<SubscriptionTier, "empresarial">, number> = {
  basico: 1000,
  premium: 1500
};

export const adBatchSize = 6;
export const metaMinimumRevenue = 600;
export const batchMaxAgeMs = 30 * 60 * 1000;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 9_999_999_999.99 &&
    Math.round(value * 100) > 0;
}

export function shouldPublishBatch(adCount: number, createdAt: Date, now = Date.now()): boolean {
  return adCount >= adBatchSize || now - createdAt.getTime() >= batchMaxAgeMs;
}

export function canPublishToMeta(adCount: number, revenue: number, publishedToWeb: boolean): boolean {
  return adCount >= adBatchSize && revenue >= metaMinimumRevenue && publishedToWeb;
}

export function canTransitionEscrow(
  current: "inactive" | "active" | "disputed" | "completed",
  action: "fund" | "dispute" | "release",
  negotiationAccepted: boolean
): boolean {
  if (action === "fund") return current === "inactive" && negotiationAccepted;
  if (action === "dispute") return current === "active";
  return action === "release" && current === "active";
}
