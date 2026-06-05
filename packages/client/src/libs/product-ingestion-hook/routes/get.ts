import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductIngestionHookSchema } from '../schemas';

export const GetProductIngestionHookResponse200Schema =
  ApiResponseSchema.extend({
    data: ProductIngestionHookSchema,
  });

export type GetProductIngestionHookResponse200 = z.infer<
  typeof GetProductIngestionHookResponse200Schema
>;

export const GetProductIngestionHookRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT_INGESTION_HOOK.GET,
  responses: {
    200: GetProductIngestionHookResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
