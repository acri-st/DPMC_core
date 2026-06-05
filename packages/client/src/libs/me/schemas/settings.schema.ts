import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ThemeSchema = z.enum(['light', 'dark', 'system']);
export type Theme = z.infer<typeof ThemeSchema>;

export const ContainerSizeSchema = z.enum(['constrained', 'full']);
export type ContainerSize = z.infer<typeof ContainerSizeSchema>;

export const UserSettingsSchema = z.object({
  theme: ThemeSchema,
  containerSize: ContainerSizeSchema,
  lastProjectId: IdSchema.nullable(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsPatchSchema = UserSettingsSchema.partial();
export type UserSettingsPatch = z.infer<typeof UserSettingsPatchSchema>;
