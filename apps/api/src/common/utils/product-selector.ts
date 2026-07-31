export interface ProductSelector {
  productTypeId?: number;
  version: 'latest' | 'default' | string;
  filters?: Record<string, unknown>;
}

export interface ProductCandidate {
  id: number;
  productTypeId: number;
  version: string;
  isDefault: boolean;
  generatedAt: Date | null;
}

export function selectProducts<T extends ProductCandidate>(
  candidates: ReadonlyArray<T>,
  selector: ProductSelector,
): T[] {
  let filtered = candidates;
  if (selector.productTypeId) {
    filtered = filtered.filter(
      (c) => c.productTypeId === selector.productTypeId,
    );
  }
  if (filtered.length === 0) return [];

  if (selector.version === 'latest') {
    let winner: T | null = null;
    for (const c of filtered) {
      if (winner === null) {
        winner = c;
        continue;
      }
      const wTime = winner.generatedAt?.getTime() ?? -Infinity;
      const cTime = c.generatedAt?.getTime() ?? -Infinity;
      if (cTime > wTime) winner = c;
    }
    return winner ? [winner] : [];
  }

  if (selector.version === 'default') {
    return filtered.filter((c) => c.isDefault);
  }

  return filtered.filter((c) => c.version === selector.version);
}
