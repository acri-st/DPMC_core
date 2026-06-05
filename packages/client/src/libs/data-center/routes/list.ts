import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { DataCenterSchema } from '../schemas';

export const ListDataCenterResponse200Schema = ApiResponseSchema.extend({
  data: DataCenterSchema.array(),
});

export const ListDataCenterResponse500Schema = Error500Schema;

export type ListDataCenterResponse200 = z.infer<
  typeof ListDataCenterResponse200Schema
>;
export type ListDataCenterResponse500 = z.infer<
  typeof ListDataCenterResponse500Schema
>;
export type ListDataCenterResponse =
  | ListDataCenterResponse200
  | ListDataCenterResponse500;

export const ListDataCenterRoute = {
  method: METHODS.GET,
  path: PATHS.DATA_CENTER.LIST,
  responses: {
    200: ListDataCenterResponse200Schema,
    500: ListDataCenterResponse500Schema,
  },
};
