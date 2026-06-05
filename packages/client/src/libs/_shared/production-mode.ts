import { z } from 'zod';

export const PRODUCTION_MODES = [
  'Nominal',
  'Test',
  'Reprocessing',
  'OnDemand',
  'OnTheFly',
  'HPC',
  'Generic',
] as const;

export const ProductionModeSchema = z.enum(PRODUCTION_MODES);
export type ProductionMode = z.infer<typeof ProductionModeSchema>;
