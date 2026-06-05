import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { collectDefaultMetrics, Gauge, register } from 'prom-client';

import { PrismaService } from '@/core/prisma';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private readonly co2Gauge = new Gauge({
    name: 'dpmc_co2_grams_total',
    help: 'Cumulative CO2 emitted per project, in grams.',
    labelNames: ['project'] as const,
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

  /**
   * Recompute per-project CO2 totals from the ProjectEnergy view × the
   * average pue × emissionFactor across data centres. Mirrors the v1
   * simplification used by /metrics/co2 (Lot 12.2).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async refreshCo2(): Promise<void> {
    try {
      const factorRow = await this.prisma.$queryRawUnsafe<
        Array<{ avg_factor: number }>
      >(
        `SELECT COALESCE(AVG("pue" * "emissionFactor"), 0) AS avg_factor FROM "data_center"`,
      );
      const avgFactor = Number(factorRow[0]?.avg_factor ?? 0);

      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ project_id: string; energy_wh: number }>
      >(
        `SELECT project_id, energy_wh::float8 AS energy_wh FROM "project_energy"`,
      );

      this.co2Gauge.reset();
      for (const r of rows) {
        const grams = (Number(r.energy_wh) * avgFactor) / 1000;
        this.co2Gauge.set({ project: r.project_id }, grams);
      }
    } catch (err) {
      this.logger.warn(`refreshCo2 failed: ${(err as Error).message}`);
    }
  }
}
