import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error403Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  ImportTaskTableBodySchema,
  ImportTaskTablePlanSchema,
} from '../schemas';

export const ImportTaskTableResponse201Schema = ApiResponseSchema.extend({
  data: ImportTaskTablePlanSchema,
});

export type ImportTaskTableResponse201 = z.infer<
  typeof ImportTaskTableResponse201Schema
>;

export const ImportTaskTableRoute = {
  method: METHODS.POST,
  path: PATHS.TASK_TABLE.IMPORT,
  body: ImportTaskTableBodySchema,
  responses: {
    201: ImportTaskTableResponse201Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    500: Error500Schema,
  },
};
