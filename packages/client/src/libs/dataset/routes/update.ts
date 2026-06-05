import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { DatasetSchema, UpdateDatasetBodySchema } from '../schemas';

export const UpdateDatasetResponse200Schema = ApiResponseSchema.extend({
  data: DatasetSchema,
});
export const UpdateDatasetResponse400Schema = Error400Schema;
export const UpdateDatasetResponse404Schema = Error404Schema;
export const UpdateDatasetResponse409Schema = Error409Schema;
export const UpdateDatasetResponse500Schema = Error500Schema;

export type UpdateDatasetResponse =
  | z.infer<typeof UpdateDatasetResponse200Schema>
  | z.infer<typeof UpdateDatasetResponse400Schema>
  | z.infer<typeof UpdateDatasetResponse404Schema>
  | z.infer<typeof UpdateDatasetResponse409Schema>
  | z.infer<typeof UpdateDatasetResponse500Schema>;

export const UpdateDatasetRoute = {
  method: METHODS.PATCH,
  path: PATHS.DATASET.UPDATE,
  body: UpdateDatasetBodySchema,
  responses: {
    200: UpdateDatasetResponse200Schema,
    400: UpdateDatasetResponse400Schema,
    404: UpdateDatasetResponse404Schema,
    409: UpdateDatasetResponse409Schema,
    500: UpdateDatasetResponse500Schema,
  },
};
