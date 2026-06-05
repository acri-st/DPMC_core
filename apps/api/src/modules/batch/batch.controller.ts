import { CreatedResponse, Response, SuccessResponse } from '@/common';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { ProjectScoped } from '@/common/decorators/project-scoped.decorator';
import { HttpCode, PATHS } from '@dpmc/client';
import type { Project } from '@dpmc/prisma';
import {
  Body,
  Controller,
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
import {
  BatchListQueryDto,
  CreateBatchBodySchema,
  CreateBatchResponse,
  CreateBatchResponseSchema,
  GetBatchResponse,
  GetBatchResponseSchema,
  ListBatchInputsResponse,
  ListBatchInputsResponseSchema,
  ListBatchJobsResponse,
  ListBatchJobsResponseSchema,
  ListBatchLogsQueryDto,
  ListBatchLogsResponse,
  ListBatchLogsResponseSchema,
  ListBatchProductsResponse,
  ListBatchProductsResponseSchema,
  ListBatchResponse,
  ListBatchResponseSchema,
  ReplayBatchResponse,
  ReplayBatchResponseSchema,
  UpdateBatchPriorityBody,
  UpdateBatchPriorityResponse,
  UpdateBatchPriorityResponseSchema,
} from './batch.dto';
import type { CreateBatchBody } from './batch.dto';
import { BatchService } from './batch.service';

@Controller()
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListBatchResponseSchema)
  @Get(PATHS.BATCH.LIST)
  async list(
    @Query() query: BatchListQueryDto,
    @CurrentProject() project: Project,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListBatchResponse> {
    const { items, total } = await this.batchService.list(project.id, query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(GetBatchResponseSchema)
  @Get(PATHS.BATCH.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<GetBatchResponse> {
    const response = await this.batchService.getById(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListBatchJobsResponseSchema)
  @Get(PATHS.BATCH.LIST_JOBS)
  async listJobs(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ListBatchJobsResponse> {
    const jobs = await this.batchService.listJobs(id, project.id);
    return Response.success(jobs);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListBatchProductsResponseSchema)
  @Get(PATHS.BATCH.LIST_PRODUCTS)
  async listProducts(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ListBatchProductsResponse> {
    const products = await this.batchService.listProducts(id, project.id);
    return Response.success(products);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListBatchInputsResponseSchema)
  @Get(PATHS.BATCH.LIST_INPUTS)
  async listInputs(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ListBatchInputsResponse> {
    const inputs = await this.batchService.listInputs(id, project.id);
    return Response.success(inputs);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListBatchLogsResponseSchema)
  @Get(PATHS.BATCH.LIST_LOGS)
  async listLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListBatchLogsQueryDto,
    @CurrentProject() project: Project,
  ): Promise<ListBatchLogsResponse> {
    const result = await this.batchService.listLogs(id, project.id, {
      limit: query.limit,
      before: query.before,
      level: query.level,
    });
    return Response.success(result);
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(CreateBatchResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.BATCH.CREATE)
  async create(
    @Body(new ZodValidationPipe(CreateBatchBodySchema))
    body: CreateBatchBody,
    @CurrentProject() project: Project,
  ): Promise<CreateBatchResponse> {
    const response = await this.batchService.create(project.id, body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(ReplayBatchResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.BATCH.REPLAY)
  async replay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ReplayBatchResponse> {
    const response = await this.batchService.replay(id, project.id);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateBatchPriorityResponseSchema)
  @Patch(PATHS.BATCH.UPDATE_PRIORITY)
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBatchPriorityBody,
    @CurrentProject() project: Project,
  ): Promise<UpdateBatchPriorityResponse> {
    const response = await this.batchService.updatePriority(
      id,
      project.id,
      body,
    );
    return Response.success(response);
  }
}
