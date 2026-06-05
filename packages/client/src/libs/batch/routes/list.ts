import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema } from '../schemas';

export const ListBatchResponse200Schema = ApiResponseSchema.extend({
  data: BatchSchema.array(),
});

export const ListBatchResponse500Schema = Error500Schema;

export type ListBatchResponse200 = z.infer<typeof ListBatchResponse200Schema>;
export type ListBatchResponse500 = z.infer<typeof ListBatchResponse500Schema>;
export type ListBatchResponse = ListBatchResponse200 | ListBatchResponse500;

export const ListBatchRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.LIST,
  responses: {
    200: ListBatchResponse200Schema,
    500: ListBatchResponse500Schema,
  },
};
