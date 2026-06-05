import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const AppUserSchema = z.object({
  id: IdSchema,
  keycloakSub: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  /** Most recent session.lastSeenAt, null if the user has never started a session. */
  lastSeenAt: z.coerce.date().nullable(),
});

export type AppUser = z.infer<typeof AppUserSchema>;
