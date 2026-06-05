import { z } from 'zod';
import { ApiResponseSchema, Error401Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { UserSettingsPatchSchema, UserSettingsSchema } from '../schemas';

export const GetMeSettingsResponse200Schema = ApiResponseSchema.extend({
  data: UserSettingsSchema,
});

export const PatchMeSettingsBodySchema = UserSettingsPatchSchema;

export const PatchMeSettingsResponse200Schema = ApiResponseSchema.extend({
  data: UserSettingsSchema,
});

export const MeSettingsResponse401Schema = Error401Schema;
export const MeSettingsResponse500Schema = Error500Schema;

export type GetMeSettingsResponse200 = z.infer<
  typeof GetMeSettingsResponse200Schema
>;
export type PatchMeSettingsResponse200 = z.infer<
  typeof PatchMeSettingsResponse200Schema
>;
export type PatchMeSettingsBody = z.infer<typeof PatchMeSettingsBodySchema>;

export const GetMeSettingsRoute = {
  method: METHODS.GET,
  path: PATHS.USER.ME_SETTINGS,
  responses: {
    200: GetMeSettingsResponse200Schema,
    401: MeSettingsResponse401Schema,
    500: MeSettingsResponse500Schema,
  },
};

export const PatchMeSettingsRoute = {
  method: METHODS.PATCH,
  path: PATHS.USER.ME_SETTINGS,
  body: PatchMeSettingsBodySchema,
  responses: {
    200: PatchMeSettingsResponse200Schema,
    401: MeSettingsResponse401Schema,
    500: MeSettingsResponse500Schema,
  },
};
