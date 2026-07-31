import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@dpmc/prisma';

import { ConfigService } from '@/core/config';
import { PrismaService } from '@/core/prisma';

import { EnergyService, type EnergyBreakdown } from './energy.service';

/**
 * Fills in per-concern energy for terminal jobs, out of band.
 *
 * This deliberately does not run inside reportResult: at the instant a job
 * reports, its last cAdvisor scrape has not happened yet, so the tail of its
 * network traffic is not in Prometheus. Reading the counters a minute later
 * captures the whole run — and keeps job completion independent of whether
 * the monitoring stack is up.
 */
@Injectable()
export class EnergyReconcilerService {
  private readonly logger = new Logger(EnergyReconcilerService.name);

  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly energy: EnergyService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcile(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    try {
      await this.runOnce();
    } catch (error) {
      this.logger.warn(
        `energy reconciliation failed: ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<void> {
    const now = Date.now();
    const settledBefore = new Date(
      now - this.config.get('ENERGY_RECONCILE_DELAY_S') * 1000,
    );
    const forceBefore = new Date(
      now - this.config.get('ENERGY_RECONCILE_MAX_AGE_S') * 1000,
    );

    const jobs = await this.prisma.job.findMany({
      where: {
        energyMeasuredAt: null,
        endedAt: { not: null, lte: settledBefore },
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        metrics: true,
        host: { select: { tdpW: true, nbCores: true } },
      },
      orderBy: { endedAt: 'asc' },
      take: this.config.get('ENERGY_RECONCILE_BATCH_SIZE'),
    });

    if (jobs.length === 0) {
      return;
    }

    let measured = 0;
    let deferred = 0;

    for (const job of jobs) {
      const breakdown = await this.energy.measure(job);

      // Past max age, take what we have — an outage must not starve the queue.
      const expired = job.endedAt !== null && job.endedAt < forceBefore;

      if (!breakdown.complete && !expired) {
        deferred += 1;
        continue;
      }

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          energyCpuWh: breakdown.cpuWh,
          energyGpuWh: breakdown.gpuWh,
          energyMeasuredAt: new Date(),
          metrics: this.mergeTransferMetrics(job.metrics, breakdown),
        },
      });

      measured += 1;
    }

    if (measured > 0 || deferred > 0) {
      this.logger.debug(
        `energy reconciliation: ${measured} measured, ${deferred} deferred`,
      );
    }
  }

  // Neutral keys, source keys untouched: the view reads one pair whatever
  // the source, and transferSource records which one won.
  private mergeTransferMetrics(
    current: Prisma.JsonValue,
    breakdown: EnergyBreakdown,
  ): Prisma.InputJsonValue {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {};

    if (breakdown.ingressBytes !== null) {
      base.ingressBytes = Math.round(breakdown.ingressBytes).toString();
    }
    if (breakdown.egressBytes !== null) {
      base.egressBytes = Math.round(breakdown.egressBytes).toString();
    }
    base.transferSource = breakdown.transferSource;

    return base as Prisma.InputJsonValue;
  }
}
