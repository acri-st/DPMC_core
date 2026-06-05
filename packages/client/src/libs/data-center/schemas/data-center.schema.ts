import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { HostSchema } from '../../host/schemas/host.schema';

export const DataCenterSchema = z.object({
  id: IdSchema,
  name: z.string(),
  code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  emissionFactor: z.number(),
  energyIntensity: z.number(),
  pue: z.number(),
});

export type DataCenter = z.infer<typeof DataCenterSchema>;

export const DataCenterDetailSchema = DataCenterSchema.extend({
  hosts: HostSchema.array(),
});

export type DataCenterDetail = z.infer<typeof DataCenterDetailSchema>;
