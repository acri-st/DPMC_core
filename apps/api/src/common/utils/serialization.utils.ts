/**
 * Recursively walks `input` and converts every BigInt to its string
 * representation so the result is JSON-safe. Dates, null, and undefined
 * are preserved as-is.
 */
export const serializeBigInt = (input: unknown): unknown => {
  if (typeof input === 'bigint') return input.toString();
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(serializeBigInt);
  if (input instanceof Date) return input;
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = serializeBigInt(v);
    }
    return out;
  }
  return input;
};
