import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProductIngestionHookResponse204Schema = ApiResponseSchema;

export type DeleteProductIngestionHookResponse204 = z.infer<
  typeof DeleteProductIngestionHookResponse204Schema
>;

export const DeleteProductIngestionHookRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCT_INGESTION_HOOK.DELETE,
  responses: {
    204: DeleteProductIngestionHookResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
