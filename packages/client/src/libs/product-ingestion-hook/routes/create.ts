import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  CreateProductIngestionHookBodySchema,
  ProductIngestionHookSchema,
} from '../schemas';

export const CreateProductIngestionHookResponse201Schema =
  ApiResponseSchema.extend({
    data: ProductIngestionHookSchema,
  });

export type CreateProductIngestionHookResponse201 = z.infer<
  typeof CreateProductIngestionHookResponse201Schema
>;

export const CreateProductIngestionHookRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCT_INGESTION_HOOK.CREATE,
  body: CreateProductIngestionHookBodySchema,
  responses: {
    201: CreateProductIngestionHookResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
