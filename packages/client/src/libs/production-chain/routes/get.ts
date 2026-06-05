import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductionChainGraphSchema } from '../schemas';

export const GetProductionChainResponse200Schema = ApiResponseSchema.extend({
  data: ProductionChainGraphSchema,
});

export const GetProductionChainResponse404Schema = Error404Schema;
export const GetProductionChainResponse500Schema = Error500Schema;

export type GetProductionChainResponse200 = z.infer<
  typeof GetProductionChainResponse200Schema
>;
export type GetProductionChainResponse404 = z.infer<
  typeof GetProductionChainResponse404Schema
>;
export type GetProductionChainResponse500 = z.infer<
  typeof GetProductionChainResponse500Schema
>;
export type GetProductionChainResponse =
  | GetProductionChainResponse200
  | GetProductionChainResponse404
  | GetProductionChainResponse500;

export const GetProductionChainRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCTION_CHAIN.GET,
  responses: {
    200: GetProductionChainResponse200Schema,
    404: GetProductionChainResponse404Schema,
    500: GetProductionChainResponse500Schema,
  },
};
