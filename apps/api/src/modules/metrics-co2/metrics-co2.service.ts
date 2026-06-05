import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma';
import type { Co2GroupBy } from '@dpmc/client';

interface Aggregate {
  groupBy: Co2GroupBy;
  bucket: string;
  bucketName: string | null;
  energyWh: number;
  co2Grams: number;
  cpuSeconds: number;
}

@Injectable()
export class MetricsCo2Service {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate(opts: {
    groupBy: Co2GroupBy;
    from?: Date;
    to?: Date;
  }): Promise<Aggregate[]> {
    // v1 simplification: from/to filters are ignored because the Lot 1.2 views
    // (ProjectEnergy) do not carry per-batch timestamps.
    // groupBy 'chain' and 'task' fall back to the same project-level rollup;
    // finer granularity is deferred to a later lot.
    // The emission factor is a global average of pue × emissionFactor across all
    // DataCenter rows, rather than a per-host weighted average, which would require
    // joining job execution history to host-to-datacenter assignments.
    const factorRow = await this.prisma.$queryRawUnsafe<
      Array<{ avg_factor: number }>
    >(
      `SELECT COALESCE(AVG("pue" * "emissionFactor"), 0) AS avg_factor FROM "data_center"`,
    );
    const avgFactor = factorRow[0]?.avg_factor ?? 0;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        project_id: string;
        project_name: string | null;
        energy_wh: number;
        cpu_seconds: number;
      }>
    >(
      `SELECT pe.project_id,
              p.name AS project_name,
              pe.energy_wh::float8 AS energy_wh,
              pe.cpu_seconds::float8 AS cpu_seconds
       FROM "project_energy" pe
       LEFT JOIN "project" p ON p.id = pe.project_id
       ORDER BY pe.energy_wh DESC`,
    );

    return rows.map((r) => ({
      groupBy: opts.groupBy,
      bucket: r.project_id,
      bucketName: r.project_name,
      energyWh: Number(r.energy_wh),
      co2Grams: (Number(r.energy_wh) * avgFactor) / 1000,
      cpuSeconds: Number(r.cpu_seconds),
    }));
  }
}
