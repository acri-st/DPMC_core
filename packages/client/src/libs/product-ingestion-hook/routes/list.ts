import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductIngestionHookSchema } from '../schemas';

export const ListProductIngestionHookResponse200Schema =
  ApiResponseSchema.extend({
    data: ProductIngestionHookSchema.array(),
  });

export type ListProductIngestionHookResponse200 = z.infer<
  typeof ListProductIngestionHookResponse200Schema
>;

export const ListProductIngestionHookRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT_INGESTION_HOOK.LIST,
  responses: {
    200: ListProductIngestionHookResponse200Schema,
    500: Error500Schema,
  },
};
