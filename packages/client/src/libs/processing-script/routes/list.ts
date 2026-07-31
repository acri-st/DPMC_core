import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessingScriptListItemSchema } from '../schemas';

export const ListProcessingScriptResponse200Schema = ApiResponseSchema.extend({
  data: ProcessingScriptListItemSchema.array(),
});

export const ListProcessingScriptResponse500Schema = Error500Schema;

export type ListProcessingScriptResponse200 = z.infer<
  typeof ListProcessingScriptResponse200Schema
>;
export type ListProcessingScriptResponse500 = z.infer<
  typeof ListProcessingScriptResponse500Schema
>;
export type ListProcessingScriptResponse =
  | ListProcessingScriptResponse200
  | ListProcessingScriptResponse500;

export const ListProcessingScriptRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSING_SCRIPT.LIST,
  responses: {
    200: ListProcessingScriptResponse200Schema,
    500: ListProcessingScriptResponse500Schema,
  },
};
