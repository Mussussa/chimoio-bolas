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
