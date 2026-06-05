import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { SchedulerStatusSchema } from '../schemas';

export const SchedulerStatusResponse200Schema = ApiResponseSchema.extend({
  data: SchedulerStatusSchema.nullable(),
});
export type SchedulerStatusResponse200 = z.infer<
  typeof SchedulerStatusResponse200Schema
>;

export const SchedulerStatusRoute = {
  method: METHODS.GET,
  path: PATHS.SCHEDULER.STATUS,
  responses: { 200: SchedulerStatusResponse200Schema, 500: Error500Schema },
};
