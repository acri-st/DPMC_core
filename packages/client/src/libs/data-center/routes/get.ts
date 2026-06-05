import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { DataCenterDetailSchema } from '../schemas';

export const GetDataCenterResponse200Schema = ApiResponseSchema.extend({
  data: DataCenterDetailSchema,
});

export const GetDataCenterResponse404Schema = Error404Schema;
export const GetDataCenterResponse500Schema = Error500Schema;

export type GetDataCenterResponse200 = z.infer<
  typeof GetDataCenterResponse200Schema
>;
export type GetDataCenterResponse404 = z.infer<
  typeof GetDataCenterResponse404Schema
>;
export type GetDataCenterResponse500 = z.infer<
  typeof GetDataCenterResponse500Schema
>;
export type GetDataCenterResponse =
  | GetDataCenterResponse200
  | GetDataCenterResponse404
  | GetDataCenterResponse500;

export const GetDataCenterRoute = {
  method: METHODS.GET,
  path: PATHS.DATA_CENTER.GET,
  responses: {
    200: GetDataCenterResponse200Schema,
    404: GetDataCenterResponse404Schema,
    500: GetDataCenterResponse500Schema,
  },
};
