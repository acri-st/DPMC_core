import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CapacitySummarySchema } from '../schemas';

export const CapacitySummaryHostResponse200Schema = ApiResponseSchema.extend({
  data: CapacitySummarySchema,
});
export type CapacitySummaryHostResponse200 = z.infer<
  typeof CapacitySummaryHostResponse200Schema
>;

export const CapacitySummaryHostRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.CAPACITY_SUMMARY,
  responses: {
    200: CapacitySummaryHostResponse200Schema,
    500: Error500Schema,
  },
};
