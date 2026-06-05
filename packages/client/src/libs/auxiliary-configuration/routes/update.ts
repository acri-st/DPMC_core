import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  AuxiliaryConfigurationSchema,
  UpdateAuxiliaryConfigurationBodySchema,
} from '../schemas';

export const UpdateAuxiliaryConfigurationResponse200Schema =
  ApiResponseSchema.extend({
    data: AuxiliaryConfigurationSchema,
  });

export type UpdateAuxiliaryConfigurationResponse200 = z.infer<
  typeof UpdateAuxiliaryConfigurationResponse200Schema
>;

export const UpdateAuxiliaryConfigurationRoute = {
  method: METHODS.PATCH,
  path: PATHS.AUXILIARY_CONFIGURATION.UPDATE,
  body: UpdateAuxiliaryConfigurationBodySchema,
  responses: {
    200: UpdateAuxiliaryConfigurationResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
