import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema } from '../schemas';

export const ReplayBatchRequestSchema = z.object({
  // Empty body for now: replay reuses parent inputs/parameters by default.
  // Future: allow overriding parameters or selecting which tasks to re-run.
});

export const ReplayBatchResponse201Schema = ApiResponseSchema.extend({
  data: BatchSchema,
});
export const ReplayBatchResponse400Schema = Error400Schema;
export const ReplayBatchResponse404Schema = Error404Schema;
export const ReplayBatchResponse500Schema = Error500Schema;

export type ReplayBatchResponse201 = z.infer<
  typeof ReplayBatchResponse201Schema
>;
export type ReplayBatchResponse =
  | ReplayBatchResponse201
  | z.infer<typeof ReplayBatchResponse400Schema>
  | z.infer<typeof ReplayBatchResponse404Schema>
  | z.infer<typeof ReplayBatchResponse500Schema>;

export const ReplayBatchRoute = {
  method: METHODS.POST,
  path: PATHS.BATCH.REPLAY,
  body: ReplayBatchRequestSchema,
  responses: {
    201: ReplayBatchResponse201Schema,
    400: ReplayBatchResponse400Schema,
    404: ReplayBatchResponse404Schema,
    500: ReplayBatchResponse500Schema,
  },
};
