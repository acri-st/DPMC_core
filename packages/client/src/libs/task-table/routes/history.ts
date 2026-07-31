import { z } from 'zod';
import {
  ApiResponseSchema,
  Error401Schema,
  Error403Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  TaskTableImportDetailSchema,
  TaskTableImportHistorySchema,
} from '../schemas';

export const ListTaskTableImportResponse200Schema = ApiResponseSchema.extend({
  data: TaskTableImportHistorySchema.array(),
});
export type ListTaskTableImportResponse200 = z.infer<
  typeof ListTaskTableImportResponse200Schema
>;

export const GetTaskTableImportResponse200Schema = ApiResponseSchema.extend({
  data: TaskTableImportDetailSchema,
});
export type GetTaskTableImportResponse200 = z.infer<
  typeof GetTaskTableImportResponse200Schema
>;

export const ListTaskTableImportRoute = {
  method: METHODS.GET,
  path: PATHS.TASK_TABLE.HISTORY,
  responses: {
    200: ListTaskTableImportResponse200Schema,
    401: Error401Schema,
    403: Error403Schema,
    500: Error500Schema,
  },
};

export const GetTaskTableImportRoute = {
  method: METHODS.GET,
  path: PATHS.TASK_TABLE.HISTORY_GET,
  responses: {
    200: GetTaskTableImportResponse200Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
