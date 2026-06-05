import { Injectable } from '@nestjs/common';
import { ApiService, ApiStatus, Status } from '@dpmc/client';
import { PrismaService } from '@/core/prisma/prisma.service';
import { formatUptime } from '@/common/utils/time.utils';
import { KeycloakService } from '@/core/keycloak/keycloak.service';
import { SchedulerService } from '@/modules/scheduler/scheduler.service';

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakService,
    private readonly scheduler: SchedulerService,
  ) {}

  async getStatus(): Promise<ApiStatus> {
    const services = await this.fetchServicesStatus();

    return {
      status: this.resolveStatus(services),
      version: process.env.npm_package_version || 'Unknown',
      uptime: formatUptime(process.uptime()),
      services,
    };
  }

  private async fetchServicesStatus(): Promise<ApiService[]> {
    const promises = [this.prisma.getStatus(), this.keycloak.getStatus()];
    const asyncServices = await Promise.all(promises);
    return [...asyncServices, this.scheduler.getStatus()];
  }

  private resolveStatus(services: ApiService[]): Status {
    const hasFailedService = services.some(
      (service) => service.status === 'KO',
    );

    if (!hasFailedService) {
      return 'OK';
    }

    const allServicesFailed = services.every(
      (service) => service.status === 'KO',
    );

    return allServicesFailed ? 'KO' : 'DEGRADED';
  }
}
