import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { AuxiliaryConfigurationSchema } from '../schemas';

export const ListAuxiliaryConfigurationResponse200Schema =
  ApiResponseSchema.extend({
    data: AuxiliaryConfigurationSchema.array(),
  });

export type ListAuxiliaryConfigurationResponse200 = z.infer<
  typeof ListAuxiliaryConfigurationResponse200Schema
>;

export const ListAuxiliaryConfigurationRoute = {
  method: METHODS.GET,
  path: PATHS.AUXILIARY_CONFIGURATION.LIST,
  responses: {
    200: ListAuxiliaryConfigurationResponse200Schema,
    500: Error500Schema,
  },
};
