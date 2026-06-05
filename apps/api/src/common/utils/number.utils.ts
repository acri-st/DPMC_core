export const parseSize = (
  value: number | bigint | string | null | undefined,
): bigint | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return BigInt(Math.trunc(value));
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid size value: ${value}`);
  }
  return BigInt(trimmed);
};

export const toBigInt = (value: string | number | bigint): bigint => {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error('negative');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error('invalid');
    return BigInt(Math.trunc(value));
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error('invalid');
  return BigInt(trimmed);
};
