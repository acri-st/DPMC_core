import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema, CreateBatchRequestSchema } from '../schemas';

export const CreateBatchResponse201Schema = ApiResponseSchema.extend({
  data: BatchSchema,
});
export const CreateBatchResponse400Schema = Error400Schema;
export const CreateBatchResponse404Schema = Error404Schema;
export const CreateBatchResponse500Schema = Error500Schema;

export type CreateBatchResponse201 = z.infer<
  typeof CreateBatchResponse201Schema
>;
export type CreateBatchResponse400 = z.infer<
  typeof CreateBatchResponse400Schema
>;
export type CreateBatchResponse404 = z.infer<
  typeof CreateBatchResponse404Schema
>;
export type CreateBatchResponse500 = z.infer<
  typeof CreateBatchResponse500Schema
>;
export type CreateBatchResponse =
  | CreateBatchResponse201
  | CreateBatchResponse400
  | CreateBatchResponse404
  | CreateBatchResponse500;

export const CreateBatchRoute = {
  method: METHODS.POST,
  path: PATHS.BATCH.CREATE,
  body: CreateBatchRequestSchema,
  responses: {
    201: CreateBatchResponse201Schema,
    400: CreateBatchResponse400Schema,
    404: CreateBatchResponse404Schema,
    500: CreateBatchResponse500Schema,
  },
};
