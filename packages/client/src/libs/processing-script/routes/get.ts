import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessingScriptDetailSchema } from '../schemas';

export const GetProcessingScriptResponse200Schema = ApiResponseSchema.extend({
  data: ProcessingScriptDetailSchema,
});

export const GetProcessingScriptResponse404Schema = Error404Schema;
export const GetProcessingScriptResponse500Schema = Error500Schema;

export type GetProcessingScriptResponse200 = z.infer<
  typeof GetProcessingScriptResponse200Schema
>;
export type GetProcessingScriptResponse404 = z.infer<
  typeof GetProcessingScriptResponse404Schema
>;
export type GetProcessingScriptResponse500 = z.infer<
  typeof GetProcessingScriptResponse500Schema
>;
export type GetProcessingScriptResponse =
  | GetProcessingScriptResponse200
  | GetProcessingScriptResponse404
  | GetProcessingScriptResponse500;

export const GetProcessingScriptRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSING_SCRIPT.GET,
  responses: {
    200: GetProcessingScriptResponse200Schema,
    404: GetProcessingScriptResponse404Schema,
    500: GetProcessingScriptResponse500Schema,
  },
};
