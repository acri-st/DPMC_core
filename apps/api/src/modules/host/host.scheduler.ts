import { ConfigService } from '@/core/config';
import { PrismaService } from '@/core/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Periodically marks hosts as `Off` when their last heartbeat is older than
 * the configured threshold. Workers send a heartbeat every
 * `DPMC_HEARTBEAT_INTERVAL_S` seconds; if a worker dies or loses network the
 * server has no other way of detecting it.
 */
@Injectable()
export class HostScheduler {
  private readonly logger = new Logger(HostScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async markStaleHostsOffline(): Promise<number> {
    const thresholdSeconds = this.config.get('WORKER_OFFLINE_THRESHOLD_S');
    const cutoff = new Date(Date.now() - thresholdSeconds * 1000);

    const result = await this.prisma.host.updateMany({
      where: {
        status: { not: 'Off' },
        OR: [{ lastHeartbeatAt: { lt: cutoff } }, { lastHeartbeatAt: null }],
      },
      data: { status: 'Off' },
    });

    if (result.count > 0) {
      this.logger.log(
        `Marked ${result.count} stale host(s) as Off (cutoff=${cutoff.toISOString()}, thresholdSeconds=${thresholdSeconds})`,
      );
    }
    return result.count;
  }
}
