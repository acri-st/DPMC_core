import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { collectDefaultMetrics, Gauge, register } from 'prom-client';

import { PrismaService } from '@/core/prisma';

interface ProjectEnergyRow {
  project_id: number;
  cpu_wh: number;
  gpu_wh: number;
  ingress_wh: number;
  egress_wh: number;
  cpu_co2_grams: number;
  gpu_co2_grams: number;
  ingress_co2_grams: number;
  egress_co2_grams: number;
}

const CONCERNS = ['cpu', 'gpu', 'ingress', 'egress'] as const;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // No _total suffix: reserved for counters.
  private readonly co2Gauge = new Gauge({
    name: 'dpmc_co2_grams',
    help: 'Cumulative CO2 emitted, in grams, by project and concern.',
    labelNames: ['project', 'concern'] as const,
    registers: [register],
  });

  private readonly energyGauge = new Gauge({
    name: 'dpmc_energy_wh',
    help: 'Cumulative energy consumed, in Wh, by project and concern.',
    labelNames: ['project', 'concern'] as const,
    registers: [register],
  });

  constructor(private readonly prisma: PrismaService) {
    collectDefaultMetrics();
  }

  render(): Promise<string> {
    return register.metrics();
  }

  contentType(): string {
    return register.contentType;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshCo2(): Promise<void> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<ProjectEnergyRow[]>(
        `SELECT project_id,
                cpu_wh::float8            AS cpu_wh,
                gpu_wh::float8            AS gpu_wh,
                ingress_wh::float8        AS ingress_wh,
                egress_wh::float8         AS egress_wh,
                cpu_co2_grams::float8     AS cpu_co2_grams,
                gpu_co2_grams::float8     AS gpu_co2_grams,
                ingress_co2_grams::float8 AS ingress_co2_grams,
                egress_co2_grams::float8  AS egress_co2_grams
         FROM "project_energy"`,
      );

      this.co2Gauge.reset();
      this.energyGauge.reset();

      for (const row of rows) {
        const project = String(row.project_id);

        for (const concern of CONCERNS) {
          this.energyGauge.set(
            { project, concern },
            Number(row[`${concern}_wh`]),
          );
          this.co2Gauge.set(
            { project, concern },
            Number(row[`${concern}_co2_grams`]),
          );
        }
      }
    } catch (err) {
      this.logger.warn(`refreshCo2 failed: ${(err as Error).message}`);
    }
  }
}
