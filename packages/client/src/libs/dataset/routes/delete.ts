import { z } from 'zod';
import { Error404Schema, Error409Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteDatasetResponse204Schema = z.object({}).strict();
export const DeleteDatasetResponse404Schema = Error404Schema;
export const DeleteDatasetResponse409Schema = Error409Schema;
export const DeleteDatasetResponse500Schema = Error500Schema;

export type DeleteDatasetResponse =
  | z.infer<typeof DeleteDatasetResponse204Schema>
  | z.infer<typeof DeleteDatasetResponse404Schema>
  | z.infer<typeof DeleteDatasetResponse409Schema>
  | z.infer<typeof DeleteDatasetResponse500Schema>;

export const DeleteDatasetRoute = {
  method: METHODS.DELETE,
  path: PATHS.DATASET.DELETE,
  responses: {
    204: DeleteDatasetResponse204Schema,
    404: DeleteDatasetResponse404Schema,
    409: DeleteDatasetResponse409Schema,
    500: DeleteDatasetResponse500Schema,
  },
};
