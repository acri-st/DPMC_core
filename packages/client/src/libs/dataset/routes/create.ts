import { z } from 'zod';
import { ApiResponseSchema, Error400Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateDatasetBodySchema, DatasetSchema } from '../schemas';

export const CreateDatasetResponse200Schema = ApiResponseSchema.extend({
  data: DatasetSchema,
});
export const CreateDatasetResponse400Schema = Error400Schema;
export const CreateDatasetResponse500Schema = Error500Schema;

export type CreateDatasetResponse200 = z.infer<
  typeof CreateDatasetResponse200Schema
>;
export type CreateDatasetResponse400 = z.infer<
  typeof CreateDatasetResponse400Schema
>;
export type CreateDatasetResponse500 = z.infer<
  typeof CreateDatasetResponse500Schema
>;
export type CreateDatasetResponse =
  | CreateDatasetResponse200
  | CreateDatasetResponse400
  | CreateDatasetResponse500;

export const CreateDatasetRoute = {
  method: METHODS.POST,
  path: PATHS.DATASET.CREATE,
  body: CreateDatasetBodySchema,
  responses: {
    200: CreateDatasetResponse200Schema,
    400: CreateDatasetResponse400Schema,
    500: CreateDatasetResponse500Schema,
  },
};
