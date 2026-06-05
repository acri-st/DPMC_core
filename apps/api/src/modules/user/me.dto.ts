import {
  GetMeSettingsResponse200Schema,
  PatchMeSettingsBodySchema,
  PatchMeSettingsResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const GetMeSettingsResponseSchema = GetMeSettingsResponse200Schema;
export class GetMeSettingsResponse extends createZodDto(
  GetMeSettingsResponseSchema,
) {}

export const PatchMeSettingsResponseSchema = PatchMeSettingsResponse200Schema;
export class PatchMeSettingsResponse extends createZodDto(
  PatchMeSettingsResponseSchema,
) {}

export class PatchMeSettingsBody extends createZodDto(
  PatchMeSettingsBodySchema,
) {}
