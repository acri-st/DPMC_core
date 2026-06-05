import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const StageOutResultSchema = z.object({
  role: z.string().nullable().optional(),
  localName: z.string(),
  key: z.string(),
  size: z.number().int().nonnegative(),
  content: z.unknown().optional(),
});
export type StageOutResult = z.infer<typeof StageOutResultSchema>;

export const JobOutputsBodySchema = z.object({
  outputs: z.array(StageOutResultSchema),
});
export type JobOutputsBody = z.infer<typeof JobOutputsBodySchema>;

export const RecordedProductSchema = z.object({
  id: IdSchema,
  role: z.string().nullable().optional(),
  name: z.string(),
  url: z.string(),
});
export type RecordedProduct = z.infer<typeof RecordedProductSchema>;
