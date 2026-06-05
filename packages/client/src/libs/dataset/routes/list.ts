import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { DatasetSchema } from '../schemas';

export const ListDatasetResponse200Schema = ApiResponseSchema.extend({
  data: DatasetSchema.array(),
});
export const ListDatasetResponse500Schema = Error500Schema;

export type ListDatasetResponse200 = z.infer<
  typeof ListDatasetResponse200Schema
>;
export type ListDatasetResponse500 = z.infer<
  typeof ListDatasetResponse500Schema
>;
export type ListDatasetResponse =
  | ListDatasetResponse200
  | ListDatasetResponse500;

export const ListDatasetRoute = {
  method: METHODS.GET,
  path: PATHS.DATASET.LIST,
  responses: {
    200: ListDatasetResponse200Schema,
    500: ListDatasetResponse500Schema,
  },
};
