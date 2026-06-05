import { z } from 'zod';

export const PRODUCTION_CHAIN_KINDS = ['Standard', 'Watcher'] as const;

export const ProductionChainKindSchema = z.enum(PRODUCTION_CHAIN_KINDS);
export type ProductionChainKind = z.infer<typeof ProductionChainKindSchema>;
