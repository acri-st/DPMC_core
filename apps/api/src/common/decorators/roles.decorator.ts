import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'auth.roles';

export type AppRole =
  | 'internal-viewer'
  | 'external-viewer'
  | 'operator'
  | 'admin';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
