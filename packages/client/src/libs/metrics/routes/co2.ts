import { z } from 'zod';
import { ApiResponseSchema, Error400Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { Co2AggregateSchema, Co2QuerySchema } from '../schemas';

export const Co2Response200Schema = ApiResponseSchema.extend({
  data: Co2AggregateSchema.array(),
});
export type Co2Response200 = z.infer<typeof Co2Response200Schema>;

export const Co2Route = {
  method: METHODS.GET,
  path: PATHS.METRICS.CO2,
  query: Co2QuerySchema,
  responses: {
    200: Co2Response200Schema,
    400: Error400Schema,
    500: Error500Schema,
  },
};
