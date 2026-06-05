import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  ProductIngestionHookSchema,
  UpdateProductIngestionHookBodySchema,
} from '../schemas';

export const UpdateProductIngestionHookResponse200Schema =
  ApiResponseSchema.extend({
    data: ProductIngestionHookSchema,
  });

export type UpdateProductIngestionHookResponse200 = z.infer<
  typeof UpdateProductIngestionHookResponse200Schema
>;

export const UpdateProductIngestionHookRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCT_INGESTION_HOOK.UPDATE,
  body: UpdateProductIngestionHookBodySchema,
  responses: {
    200: UpdateProductIngestionHookResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
