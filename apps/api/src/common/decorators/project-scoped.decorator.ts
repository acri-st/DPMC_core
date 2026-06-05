import { applyDecorators, UseGuards } from '@nestjs/common';

import { ProjectScopeGuard } from '@/common/guards/project-scope.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';

import { Roles, type AppRole } from './roles.decorator';

export function ProjectScoped(...roles: AppRole[]) {
  return applyDecorators(
    UseGuards(SessionGuard, RolesGuard, ProjectScopeGuard),
    Roles(...roles),
  );
}
