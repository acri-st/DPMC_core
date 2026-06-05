export function formatCo2(grams: number): string {
  if (grams === 0) return '0 g';
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(2)} t`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  if (grams >= 1) return `${grams.toFixed(2)} g`;
  if (grams >= 0.001) return `${(grams * 1000).toFixed(2)} mg`;
  return `${(grams * 1_000_000).toFixed(2)} µg`;
}
