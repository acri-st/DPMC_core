import { Response, SuccessResponse } from '@/common';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { ProjectScoped } from '@/common/decorators/project-scoped.decorator';
import { PATHS } from '@dpmc/client';
import type { Project } from '@dpmc/prisma';
import {
  Controller,
  Get,
  HttpCode as HttpCodeDec,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import {
  CancelJobResponse,
  CancelJobResponseSchema,
  GetJobResponse,
  GetJobResponseSchema,
  JobListQueryDto,
  ListJobResponse,
  ListJobResponseSchema,
  PauseJobResponse,
  PauseJobResponseSchema,
  ResumeJobResponse,
  ResumeJobResponseSchema,
} from './job.dto';
import { JobService } from './job.service';

@Controller()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListJobResponseSchema)
  @Get(PATHS.JOB.LIST)
  async list(
    @Query() query: JobListQueryDto,
    @CurrentProject() project: Project,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListJobResponse> {
    const { items, total } = await this.jobService.list(project.id, query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(GetJobResponseSchema)
  @Get(PATHS.JOB.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<GetJobResponse> {
    const response = await this.jobService.getById(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(CancelJobResponseSchema)
  @HttpCodeDec(200)
  @Post(PATHS.JOB.CANCEL)
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<CancelJobResponse> {
    const data = await this.jobService.cancel(id, project.id);
    return Response.success(data);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(PauseJobResponseSchema)
  @HttpCodeDec(200)
  @Post(PATHS.JOB.PAUSE)
  async pause(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<PauseJobResponse> {
    const data = await this.jobService.pause(id, project.id);
    return Response.success(data);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(ResumeJobResponseSchema)
  @HttpCodeDec(200)
  @Post(PATHS.JOB.RESUME)
  async resume(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ResumeJobResponse> {
    const data = await this.jobService.resume(id, project.id);
    return Response.success(data);
  }
}
