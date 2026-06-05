import { z } from 'zod';
import { IdSchema } from '../../_shared';

/** Storage backend a MediaCatalogEntry lives on (Prisma `MediaType` enum). */
export const MediaTypeSchema = z.enum(['S3', 'HTTP', 'HTTPS', 'NFS']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const InputMediaSchema = z.object({
  type: MediaTypeSchema,
  name: z.string(),
});

export const InputMediaCatalogSchema = z.object({
  name: z.string(),
  media: InputMediaSchema,
});

export const InputMediaCatalogEntrySchema = z.object({
  path: z.string(),
  /** Byte size, serialized as a decimal string (Prisma BigInt). */
  size: z.string().nullable(),
  mediaCatalog: InputMediaCatalogSchema,
});

/** Junction-shaped wrapper mirroring Prisma's ProductMediaCatalogEntry. */
export const InputProductMediaCatalogEntrySchema = z.object({
  mediaCatalogEntry: InputMediaCatalogEntrySchema,
});

export const InputProductSchema = z.object({
  id: IdSchema,
  name: z.string(),
  productType: z.object({ acronym: z.string() }),
  mediaCatalogEntries: InputProductMediaCatalogEntrySchema.array(),
});
export type InputProduct = z.infer<typeof InputProductSchema>;

export const BatchInputSchema = z.object({
  role: z.string(),
  product: InputProductSchema,
});
export type BatchInput = z.infer<typeof BatchInputSchema>;

export const BatchInputsSchema = z.object({
  batchId: IdSchema,
  parametersIn: z.record(z.string(), z.unknown()).nullable(),
  inputs: BatchInputSchema.array(),
});
export type BatchInputs = z.infer<typeof BatchInputsSchema>;
