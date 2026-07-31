import { CreatedResponse, Response, SuccessResponse } from '@/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';
import { HttpCode, PATHS } from '@dpmc/client';
import {
  Body,
  Controller,
  Get,
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
  GetTaskTableImportResponse,
  GetTaskTableImportResponseSchema,
  ListTaskTableImportResponse,
  ListTaskTableImportResponseSchema,
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
    const result = await this.taskTableService.plan(
      body.adapter,
      body.content,
      body.sourceName,
    );
    return Response.success(
      { planId: result.planId, summary: result.summary },
      { status: HttpCode.CREATED },
    );
  }

  @SuccessResponse(ListTaskTableImportResponseSchema)
  @Get(PATHS.TASK_TABLE.HISTORY)
  async history(): Promise<ListTaskTableImportResponse> {
    return Response.success(await this.taskTableService.history());
  }

  @SuccessResponse(GetTaskTableImportResponseSchema)
  @Get(PATHS.TASK_TABLE.HISTORY_GET)
  async historyGet(
    @Param('planId', ParseIntPipe) planId: number,
  ): Promise<GetTaskTableImportResponse> {
    return Response.success(await this.taskTableService.historyGet(planId));
  }

  // Nest defaults POST to 201; the published contract declares 200.
  @SuccessResponse(CommitTaskTableResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.TASK_TABLE.COMMIT)
  async commit(
    @Param('planId', ParseIntPipe) planId: number,
  ): Promise<CommitTaskTableResponse> {
    const result = await this.taskTableService.commit(planId);
    return Response.success(result);
  }
}
