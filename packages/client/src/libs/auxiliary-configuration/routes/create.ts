import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  AuxiliaryConfigurationSchema,
  CreateAuxiliaryConfigurationBodySchema,
} from '../schemas';

export const CreateAuxiliaryConfigurationResponse201Schema =
  ApiResponseSchema.extend({
    data: AuxiliaryConfigurationSchema,
  });

export type CreateAuxiliaryConfigurationResponse201 = z.infer<
  typeof CreateAuxiliaryConfigurationResponse201Schema
>;

export const CreateAuxiliaryConfigurationRoute = {
  method: METHODS.POST,
  path: PATHS.AUXILIARY_CONFIGURATION.CREATE,
  body: CreateAuxiliaryConfigurationBodySchema,
  responses: {
    201: CreateAuxiliaryConfigurationResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
