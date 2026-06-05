import {
  CreatedResponse,
  NoContentResponse,
  Response,
  SuccessResponse,
} from '@/common';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { ProjectScoped } from '@/common/decorators/project-scoped.decorator';
import { HttpCode, PATHS } from '@dpmc/client';
import type { Project } from '@dpmc/prisma';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode as HttpCodeDec,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import type { CreateTaskBody } from './task.dto';
import {
  CreateTaskBodyZodSchema,
  CreateTaskResponse,
  TaskListQueryDto,
  CreateTaskResponseSchema,
  ExecutionTreeResponse,
  ExecutionTreeResponseSchema,
  ExpandTaskResponse,
  ExpandTaskResponseSchema,
  GetTaskResponse,
  GetTaskResponseSchema,
  ListTaskResponse,
  ListTaskResponseSchema,
  TaskBatchesResponse,
  TaskBatchesResponseSchema,
  TaskHistoryResponse,
  TaskHistoryResponseSchema,
  TaskStatusSummaryResponse,
  TaskStatusSummaryResponseSchema,
  TriggerTaskResponse,
  TriggerTaskResponseSchema,
  UpdateTaskBody,
  UpdateTaskPriorityBody,
  UpdateTaskPriorityResponse,
  UpdateTaskPriorityResponseSchema,
  UpdateTaskResponse,
  UpdateTaskResponseSchema,
} from './task.dto';
import { TaskService } from './task.service';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListTaskResponseSchema)
  @Get(PATHS.TASK.LIST)
  async list(
    @Query() query: TaskListQueryDto,
    @CurrentProject() project: Project,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListTaskResponse> {
    const { items, total } = await this.taskService.list(project.id, query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  // IMPORTANT: statusSummary must be declared BEFORE getById to prevent
  // Nest from matching /task/status-summary against the :id param route.
  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(TaskStatusSummaryResponseSchema)
  @Get(PATHS.TASK.STATUS_SUMMARY)
  async statusSummary(
    @CurrentProject() project: Project,
  ): Promise<TaskStatusSummaryResponse> {
    const response = await this.taskService.statusSummary(project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(GetTaskResponseSchema)
  @Get(PATHS.TASK.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<GetTaskResponse> {
    const response = await this.taskService.getById(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(CreateTaskResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.TASK.CREATE)
  async create(
    @Body(new ZodValidationPipe(CreateTaskBodyZodSchema))
    body: CreateTaskBody,
    @CurrentProject() project: Project,
  ): Promise<CreateTaskResponse> {
    const response = await this.taskService.create(project.id, body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateTaskResponseSchema)
  @Patch(PATHS.TASK.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskBody,
    @CurrentProject() project: Project,
  ): Promise<UpdateTaskResponse> {
    const response = await this.taskService.update(id, project.id, body);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.TASK.DELETE)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<void> {
    await this.taskService.delete(id, project.id);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(TriggerTaskResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.TASK.TRIGGER)
  async trigger(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<TriggerTaskResponse> {
    const response = await this.taskService.trigger(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(ExpandTaskResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.TASK.EXPAND)
  async expand(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ExpandTaskResponse> {
    const response = await this.taskService.expand(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateTaskPriorityResponseSchema)
  @Patch(PATHS.TASK.UPDATE_PRIORITY)
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskPriorityBody,
    @CurrentProject() project: Project,
  ): Promise<UpdateTaskPriorityResponse> {
    const response = await this.taskService.updatePriority(
      id,
      project.id,
      body,
    );
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ExecutionTreeResponseSchema)
  @Get(PATHS.TASK.EXECUTION_TREE)
  async executionTree(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ExecutionTreeResponse> {
    const response = await this.taskService.executionTree(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(TaskBatchesResponseSchema)
  @Get(PATHS.TASK.BATCHES)
  async listBatches(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<TaskBatchesResponse> {
    const response = await this.taskService.listBatches(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(TaskHistoryResponseSchema)
  @Get(PATHS.TASK.HISTORY)
  async listHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<TaskHistoryResponse> {
    const response = await this.taskService.listHistory(id, project.id);
    return Response.success(response);
  }
}
