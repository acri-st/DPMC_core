import { CreatedResponse, Response, SuccessResponse } from '@/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';
import { HttpCode, PATHS } from '@dpmc/client';
import {
  Body,
  Controller,
  HttpCode as HttpCodeDec,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CommitTaskTableResponse,
  CommitTaskTableResponseSchema,
  ImportTaskTableBodyDto,
  ImportTaskTableBodyValidationSchema,
  ImportTaskTableResponse,
  ImportTaskTableResponseSchema,
} from './task-table.dto';
import { TaskTableService } from './task-table.service';

@Controller()
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'operator')
export class TaskTableController {
  constructor(private readonly taskTableService: TaskTableService) {}

  @CreatedResponse(ImportTaskTableResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.TASK_TABLE.IMPORT)
  async import(
    @Body(new ZodValidationPipe(ImportTaskTableBodyValidationSchema))
    body: ImportTaskTableBodyDto,
  ): Promise<ImportTaskTableResponse> {
    const result = await this.taskTableService.plan(body.adapter, body.content);
    return Response.success(
      { planId: result.planId, summary: result.summary },
      { status: HttpCode.CREATED },
    );
  }

  @SuccessResponse(CommitTaskTableResponseSchema)
  @Post(PATHS.TASK_TABLE.COMMIT)
  async commit(
    @Param('planId', ParseIntPipe) planId: number,
  ): Promise<CommitTaskTableResponse> {
    const result = await this.taskTableService.commit(planId);
    return Response.success(result);
  }
}
