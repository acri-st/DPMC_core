import { Response, SuccessResponse } from '@/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';
import { PATHS } from '@dpmc/client';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import {
  ListAuditLogQueryDto,
  ListAuditLogQueryValidationSchema,
  ListAuditLogResponse,
  ListAuditLogResponseSchema,
} from './audit-log.dto';
import { AuditLogService } from './audit-log.service';

// The audit trail records who did what; reading it is an administrator action.
@Controller()
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @SuccessResponse(ListAuditLogResponseSchema)
  @Get(PATHS.AUDIT_LOG.LIST)
  async list(
    @Query(new ZodValidationPipe(ListAuditLogQueryValidationSchema))
    query: ListAuditLogQueryDto,
  ): Promise<ListAuditLogResponse> {
    const rows = await this.auditLogService.list(query.page, query.pageSize);
    return Response.success(rows);
  }
}
