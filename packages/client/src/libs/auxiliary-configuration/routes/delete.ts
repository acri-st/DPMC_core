import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteAuxiliaryConfigurationResponse204Schema = ApiResponseSchema;

export type DeleteAuxiliaryConfigurationResponse204 = z.infer<
  typeof DeleteAuxiliaryConfigurationResponse204Schema
>;

export const DeleteAuxiliaryConfigurationRoute = {
  method: METHODS.DELETE,
  path: PATHS.AUXILIARY_CONFIGURATION.DELETE,
  responses: {
    204: DeleteAuxiliaryConfigurationResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
