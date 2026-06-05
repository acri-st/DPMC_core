import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PreconditionFailedException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Project } from '@dpmc/prisma';
import type { Request } from 'express';

import { PrismaService } from '@/core/prisma';

@Injectable()
export class ProjectScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.appUser) {
      throw new UnauthorizedException('Session not bound to a user');
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: req.appUser.id },
      select: { lastProjectId: true },
    });

    let project: Project | null = null;
    if (settings?.lastProjectId) {
      project = await this.prisma.project.findFirst({
        where: {
          id: settings.lastProjectId,
          isActive: true,
          deletedAt: null,
        },
      });
    }

    if (!project) {
      project = await this.prisma.project.findFirst({
        where: { isDefault: true, isActive: true, deletedAt: null },
      });
    }

    if (!project) {
      throw new PreconditionFailedException(
        'No active project. Ask an admin to set up a default project.',
      );
    }

    req.project = project;
    return true;
  }
}
