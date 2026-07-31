import { Injectable } from '@nestjs/common';
import { Prisma } from '@dpmc/prisma';

import { PrismaService } from '@/core/prisma';
import type { Co2Aggregate, Co2GroupBy } from '@dpmc/client';

interface AggregateRow {
  bucket: number;
  bucket_name: string | null;
  energy_wh: number;
  co2_grams: number;
  cpu_seconds: number;
  cpu_wh: number;
  gpu_wh: number;
  ingress_wh: number;
  egress_wh: number;
  cpu_co2_grams: number;
  gpu_co2_grams: number;
  ingress_co2_grams: number;
  egress_co2_grams: number;
}

const DIMENSIONS: Record<
  Co2GroupBy,
  { column: Prisma.Sql; labelTable: Prisma.Sql; labelColumn: Prisma.Sql }
> = {
  project: {
    column: Prisma.sql`je.project_id`,
    labelTable: Prisma.sql`"project"`,
    labelColumn: Prisma.sql`"name"`,
  },
  task: {
    column: Prisma.sql`je.task_id`,
    labelTable: Prisma.sql`"task"`,
    labelColumn: Prisma.sql`"executionTag"`,
  },
  chain: {
    column: Prisma.sql`je.processing_chain_id`,
    labelTable: Prisma.sql`"processing_chain"`,
    labelColumn: Prisma.sql`"name"`,
  },
};

@Injectable()
export class MetricsCo2Service {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate(opts: {
    groupBy: Co2GroupBy;
    from?: Date;
    to?: Date;
  }): Promise<Co2Aggregate[]> {
    const dimension = DIMENSIONS[opts.groupBy];

    // ended_at, not created_at: the footprint belongs to when it burned power.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`${dimension.column} IS NOT NULL`,
    ];

    if (opts.from) {
      conditions.push(Prisma.sql`je.ended_at >= ${opts.from}`);
    }
    if (opts.to) {
      conditions.push(Prisma.sql`je.ended_at <= ${opts.to}`);
    }

    const rows = await this.prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      SELECT
        ${dimension.column}                              AS bucket,
        MAX(lbl.${dimension.labelColumn})                AS bucket_name,
        SUM(je.energy_wh)::float8                        AS energy_wh,
        SUM(je.co2_grams)::float8                        AS co2_grams,
        SUM(je.cpu_seconds)::float8                      AS cpu_seconds,
        SUM(je.cpu_wh)::float8                           AS cpu_wh,
        SUM(je.gpu_wh)::float8                           AS gpu_wh,
        SUM(je.ingress_wh)::float8                       AS ingress_wh,
        SUM(je.egress_wh)::float8                        AS egress_wh,
        SUM(je.cpu_co2_grams)::float8                    AS cpu_co2_grams,
        SUM(je.gpu_co2_grams)::float8                    AS gpu_co2_grams,
        SUM(je.ingress_co2_grams)::float8                AS ingress_co2_grams,
        SUM(je.egress_co2_grams)::float8                 AS egress_co2_grams
      FROM "job_energy" je
      LEFT JOIN ${dimension.labelTable} lbl ON lbl."id" = ${dimension.column}
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY ${dimension.column}
      ORDER BY SUM(je.co2_grams) DESC
    `);

    return rows.map((r) => ({
      groupBy: opts.groupBy,
      bucket: Number(r.bucket),
      bucketName: r.bucket_name,
      energyWh: Number(r.energy_wh),
      co2Grams: Number(r.co2_grams),
      cpuSeconds: Number(r.cpu_seconds),
      energyWhByConcern: {
        cpu: Number(r.cpu_wh),
        gpu: Number(r.gpu_wh),
        ingress: Number(r.ingress_wh),
        egress: Number(r.egress_wh),
      },
      co2GramsByConcern: {
        cpu: Number(r.cpu_co2_grams),
        gpu: Number(r.gpu_co2_grams),
        ingress: Number(r.ingress_co2_grams),
        egress: Number(r.egress_co2_grams),
      },
    }));
  }
}
