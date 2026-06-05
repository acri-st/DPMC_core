import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductionChainSchema } from '../schemas';

export const ListProductionChainResponse200Schema = ApiResponseSchema.extend({
  data: ProductionChainSchema.array(),
});

export const ListProductionChainResponse500Schema = Error500Schema;

export type ListProductionChainResponse200 = z.infer<
  typeof ListProductionChainResponse200Schema
>;
export type ListProductionChainResponse500 = z.infer<
  typeof ListProductionChainResponse500Schema
>;
export type ListProductionChainResponse =
  | ListProductionChainResponse200
  | ListProductionChainResponse500;

export const ListProductionChainRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCTION_CHAIN.LIST,
  responses: {
    200: ListProductionChainResponse200Schema,
    500: ListProductionChainResponse500Schema,
  },
};
