import { z } from 'zod';

export const PRIORITY_CLASSES = [
  'Test',
  'OnDemand',
  'Reprocessing',
  'NRT',
  'Super',
  'Ultra',
] as const;

export const PriorityClassSchema = z.enum(PRIORITY_CLASSES);
export type PriorityClass = z.infer<typeof PriorityClassSchema>;
