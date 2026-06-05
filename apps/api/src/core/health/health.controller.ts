import { Controller, Get, HttpException } from '@nestjs/common';
import { Public } from '@/common/decorators';
import { PATHS } from '@dpmc/client';
import { PrismaService } from '@/core/prisma';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(PATHS.HEALTH.LIVE)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get(PATHS.HEALTH.READY)
  async ready(): Promise<{ status: 'ok'; db: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      throw new HttpException({ status: 'degraded', db: 'down' }, 503);
    }
  }
}
