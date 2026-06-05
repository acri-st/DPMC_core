import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { HostSchema } from '../../host/schemas/host.schema';

export const PoolSchema = z.object({
  id: IdSchema,
  name: z.string(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  hostCount: z.number().int().optional(),
  dataCenterCount: z.number().int().optional(),
});

export type Pool = z.infer<typeof PoolSchema>;

export const CreatePoolBodySchema = z.object({
  name: z.string().min(1).max(120),
  comment: z.string().max(2000).nullable().optional(),
});

export type CreatePoolBody = z.infer<typeof CreatePoolBodySchema>;

export const UpdatePoolBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export type UpdatePoolBody = z.infer<typeof UpdatePoolBodySchema>;

export const PoolDetailSchema = PoolSchema.extend({
  hosts: HostSchema.array(),
});

export type PoolDetail = z.infer<typeof PoolDetailSchema>;
