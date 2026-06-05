import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import type { PrismaService } from '@/core/prisma';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().min(1).max(200).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** NestJS DTO class for use with `@Query()` in controllers. */
export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}

/** Lenient parse that never throws — clamps invalid values to safe defaults. */
export function parsePagination(input: {
  page?: unknown;
  pageSize?: unknown;
  q?: unknown;
}): PaginationQuery {
  const result = PaginationQuerySchema.safeParse(input);
  if (result.success) return result.data;
  // Fall back to clamped values when Zod rejects (e.g. "abc" → NaN).
  const rawPage = Number(input.page);
  const rawPageSize = Number(input.pageSize);
  return {
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
    pageSize: Number.isFinite(rawPageSize)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawPageSize)))
      : DEFAULT_PAGE_SIZE,
  };
}

export function paginationSkipTake(opts: PaginationQuery): {
  skip: number;
  take: number;
} {
  return { skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

/**
 * Build a Prisma where fragment that performs case-insensitive ILIKE matching
 * across the given string fields. Returns undefined when no query is provided
 * (so the caller can spread it into a where clause without changing the shape).
 */
export function buildSearchWhere(
  fields: readonly string[],
  q: string | undefined,
): { OR: Array<Record<string, unknown>> } | undefined {
  if (!q || !fields.length) return undefined;
  return {
    OR: fields.map((field) => ({
      [field]: { contains: q, mode: 'insensitive' as const },
    })),
  };
}

/**
 * Accepts `"true"` / `"false"` strings (URLSearchParams) or native booleans
 * and coerces them to a real boolean. Returns `undefined` when the param is
 * absent, so callers can safely spread into a Prisma where clause.
 */
export const optionalBoolean = () =>
  z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional();

/**
 * Returns Postgres' rough row-count estimate for a table from `pg_class.reltuples`.
 * Cheap (single index lookup) but only accurate when the table has been ANALYZE'd recently
 * and only useful when no WHERE clause is applied.
 *
 * Reserved for future opt-in use on very large tables (e.g. /product). Not used by the
 * baseline pagination across the 13 endpoints in this spec.
 */
export async function estimateRowCount(
  prisma: PrismaService,
  tableName: string,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ reltuples: bigint | number }[]>(
    `SELECT reltuples::bigint AS reltuples FROM pg_class WHERE relname = $1`,
    tableName,
  );
  return Number(rows[0]?.reltuples ?? 0);
}
