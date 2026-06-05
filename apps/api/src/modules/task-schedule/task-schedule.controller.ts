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
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import type { CreateTaskScheduleBody } from './task-schedule.dto';
import {
  CreateTaskScheduleBodyZodSchema,
  CreateTaskScheduleResponse,
  CreateTaskScheduleResponseSchema,
  GetTaskScheduleResponse,
  GetTaskScheduleResponseSchema,
  ListTaskScheduleResponse,
  ListTaskScheduleResponseSchema,
  UpdateTaskScheduleBody,
  UpdateTaskScheduleResponse,
  UpdateTaskScheduleResponseSchema,
} from './task-schedule.dto';
import { TaskScheduleService } from './task-schedule.service';

@Controller()
export class TaskScheduleController {
  constructor(private readonly service: TaskScheduleService) {}

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(ListTaskScheduleResponseSchema)
  @Get(PATHS.TASK_SCHEDULE.LIST)
  async list(
    @CurrentProject() project: Project,
  ): Promise<ListTaskScheduleResponse> {
    const data = await this.service.list(project.id);
    return Response.success(data);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(GetTaskScheduleResponseSchema)
  @Get(PATHS.TASK_SCHEDULE.GET)
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<GetTaskScheduleResponse> {
    const data = await this.service.getById(id, project.id);
    return Response.success(data);
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(CreateTaskScheduleResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.TASK_SCHEDULE.CREATE)
  async create(
    @Body(new ZodValidationPipe(CreateTaskScheduleBodyZodSchema))
    body: CreateTaskScheduleBody,
    @CurrentProject() project: Project,
  ): Promise<CreateTaskScheduleResponse> {
    const data = await this.service.create(project.id, body);
    return Response.success(data, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateTaskScheduleResponseSchema)
  @Patch(PATHS.TASK_SCHEDULE.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskScheduleBody,
    @CurrentProject() project: Project,
  ): Promise<UpdateTaskScheduleResponse> {
    const data = await this.service.update(id, project.id, body);
    return Response.success(data);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.TASK_SCHEDULE.DELETE)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<void> {
    await this.service.remove(id, project.id);
  }
}
