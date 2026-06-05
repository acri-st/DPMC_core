import type { Project } from '@dpmc/prisma';
import type { AppUser, AuthUser, SessionContext } from '../auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: SessionContext | null;
      appUser?: AppUser;
      project?: Project;
    }
  }
}

export {};
