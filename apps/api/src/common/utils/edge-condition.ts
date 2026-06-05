import type { EdgeCondition } from '@dpmc/client';
import type { ProductionMode } from '@dpmc/prisma';

export interface EdgeContext {
  params: Record<string, unknown>;
  mode: ProductionMode;
  /** Returns true when the named ProductType has at least one matching product
   * available (the dispatcher computes this against the DB; the API uses a
   * caller-supplied predicate so this module stays pure). */
  dataAvailable: (productTypeId: number) => boolean;
}

export function evaluateEdgeCondition(
  c: EdgeCondition,
  ctx: EdgeContext,
): boolean {
  switch (c.kind) {
    case 'always':
      return true;
    case 'param': {
      const v = ctx.params[c.path];
      switch (c.op) {
        case 'eq':
          return v === c.value;
        case 'neq':
          return v !== c.value;
        case 'gt':
          return (
            typeof v === 'number' && typeof c.value === 'number' && v > c.value
          );
        case 'lt':
          return (
            typeof v === 'number' && typeof c.value === 'number' && v < c.value
          );
      }
      return false;
    }
    case 'mode':
      return c.in.includes(ctx.mode);
    case 'dataAvailable':
      return ctx.dataAvailable(c.productTypeId);
  }
}
