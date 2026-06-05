import {
  PATHS,
  UserSettingsSchema,
  type UserSettings,
  type UserSettingsPatch,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch } from '@/shared/libs/api-client';

const ResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: UserSettingsSchema,
});

export async function fetchMeSettings(): Promise<UserSettings> {
  const raw = await apiFetch<unknown>(PATHS.USER.ME_SETTINGS);
  return ResponseSchema.parse(raw).data;
}

export async function patchMeSettings(
  patch: UserSettingsPatch,
): Promise<UserSettings> {
  const raw = await apiFetch<unknown>(PATHS.USER.ME_SETTINGS, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return ResponseSchema.parse(raw).data;
}
