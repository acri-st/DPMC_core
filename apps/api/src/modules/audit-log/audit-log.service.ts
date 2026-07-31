import { Injectable, Logger } from '@nestjs/common';
import type { AuditLogAction, AuditLogActorType } from '@dpmc/prisma';

import { PrismaService } from '@/core/prisma';

export interface AuditEntry {
  actorId: string | null;
  actorType: AuditLogActorType;
  action: AuditLogAction;
  aggregateType: string;
  aggregateId: string;
  after?: unknown;
  metadata?: unknown;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record one security-relevant event.
   *
   * Never throws: an audit write must not turn a successful request into a
   * failed one. A write that cannot be persisted is reported on the API log so
   * the gap is visible rather than silent.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          actorType: entry.actorType,
          action: entry.action,
          aggregateType: entry.aggregateType,
          aggregateId: entry.aggregateId,
          after: (entry.after ?? null) as never,
          metadata: (entry.metadata ?? null) as never,
        },
      });
    } catch (err) {
      this.logger.error(
        `failed to record audit entry for ${entry.aggregateType}/${entry.aggregateId}`,
        err as Error,
      );
    }
  }

  async list(page: number, pageSize: number) {
    return this.prisma.auditLog.findMany({
      // Newest first by event time. Recording is fire-and-forget, so two
      // concurrent writes can take their ids in the opposite order to their
      // timestamps — ordering by id alone would not be chronological.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}
