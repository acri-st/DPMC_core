import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const CurrentUserSchema = z.object({
  id: IdSchema,
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  roles: z.string().array(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
