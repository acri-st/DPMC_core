import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { DatasetSchema } from '../schemas';

export const GetDatasetResponse200Schema = ApiResponseSchema.extend({
  data: DatasetSchema,
});
export const GetDatasetResponse404Schema = Error404Schema;
export const GetDatasetResponse500Schema = Error500Schema;

export type GetDatasetResponse200 = z.infer<typeof GetDatasetResponse200Schema>;
export type GetDatasetResponse404 = z.infer<typeof GetDatasetResponse404Schema>;
export type GetDatasetResponse500 = z.infer<typeof GetDatasetResponse500Schema>;
export type GetDatasetResponse =
  | GetDatasetResponse200
  | GetDatasetResponse404
  | GetDatasetResponse500;

export const GetDatasetRoute = {
  method: METHODS.GET,
  path: PATHS.DATASET.GET,
  responses: {
    200: GetDatasetResponse200Schema,
    404: GetDatasetResponse404Schema,
    500: GetDatasetResponse500Schema,
  },
};
