import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Project } from '@dpmc/prisma';

export const CurrentProject = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Project => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.project) {
      throw new InternalServerErrorException(
        '@CurrentProject() used without ProjectScopeGuard. Add @ProjectScoped(...) on the controller method.',
      );
    }
    return req.project as Project;
  },
);
