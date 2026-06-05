import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { AuxiliaryConfigurationSchema } from '../schemas';

export const GetAuxiliaryConfigurationResponse200Schema =
  ApiResponseSchema.extend({
    data: AuxiliaryConfigurationSchema,
  });

export type GetAuxiliaryConfigurationResponse200 = z.infer<
  typeof GetAuxiliaryConfigurationResponse200Schema
>;

export const GetAuxiliaryConfigurationRoute = {
  method: METHODS.GET,
  path: PATHS.AUXILIARY_CONFIGURATION.GET,
  responses: {
    200: GetAuxiliaryConfigurationResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
