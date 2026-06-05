import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const StageInEntrySchema = z.object({
  url: z.string().optional(),
  content: z.string().optional(),
  localName: z.string(),
  role: z.string().nullable().optional(),
});
export type StageInEntry = z.infer<typeof StageInEntrySchema>;

export const StageOutEntrySchema = z.object({
  key: z.string(),
  localName: z.string(),
  role: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
});
export type StageOutEntry = z.infer<typeof StageOutEntrySchema>;

export const WorkerDispatchSchema = z.object({
  jobId: IdSchema,
  image: z.string().nullable(),
  runtime: z.enum(['Docker', 'Apptainer', 'None']),
  command: z.array(z.string()),
  env: z.record(z.string()),
  mounts: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      readOnly: z.boolean().optional(),
    }),
  ),
  resources: z.object({
    cpus: z.number(),
    memoryBytes: z.string(),
    gpus: z.array(z.number().int()),
  }),
  stageIn: z.array(StageInEntrySchema).optional(),
  stageOut: z.array(StageOutEntrySchema).optional(),
});
export type WorkerDispatch = z.infer<typeof WorkerDispatchSchema>;
