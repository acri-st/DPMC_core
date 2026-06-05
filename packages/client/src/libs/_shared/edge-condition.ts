import { z } from 'zod';
import { IdSchema } from './id';
import { ProductionModeSchema } from './production-mode';

export const EdgeConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }),
  z.object({
    kind: z.literal('param'),
    path: z.string().min(1),
    op: z.enum(['eq', 'neq', 'gt', 'lt']),
    value: z.unknown(),
  }),
  z.object({
    kind: z.literal('mode'),
    in: ProductionModeSchema.array().min(1),
  }),
  z.object({
    kind: z.literal('dataAvailable'),
    productTypeId: IdSchema,
    timeoutMs: z.number().int().min(0),
  }),
]);

export type EdgeCondition = z.infer<typeof EdgeConditionSchema>;
