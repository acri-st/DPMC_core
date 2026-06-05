import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema } from '../schemas';

export const GetBatchResponse200Schema = ApiResponseSchema.extend({
  data: BatchSchema,
});

export const GetBatchResponse404Schema = Error404Schema;
export const GetBatchResponse500Schema = Error500Schema;

export type GetBatchResponse200 = z.infer<typeof GetBatchResponse200Schema>;
export type GetBatchResponse404 = z.infer<typeof GetBatchResponse404Schema>;
export type GetBatchResponse500 = z.infer<typeof GetBatchResponse500Schema>;
export type GetBatchResponse =
  | GetBatchResponse200
  | GetBatchResponse404
  | GetBatchResponse500;

export const GetBatchRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.GET,
  responses: {
    200: GetBatchResponse200Schema,
    404: GetBatchResponse404Schema,
    500: GetBatchResponse500Schema,
  },
};
