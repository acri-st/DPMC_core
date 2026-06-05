import { Public, SuccessResponse } from '@/common/decorators';
import { WorkerTokenGuard } from '@/common/guards/worker-token.guard';
import { Response } from '@/common/utils/response.utils';
import { HttpCode, PATHS } from '@dpmc/client';
import {
  Body,
  Controller,
  Get,
  HttpCode as HttpCodeDecorator,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import {
  ActiveHostResponse,
  ActiveHostResponseSchema,
  CapacitySummaryHostResponse,
  CapacitySummaryHostResponseSchema,
  GetHostResponse,
  GetHostResponseSchema,
  HeartbeatHostBody,
  HeartbeatHostResponse,
  HeartbeatHostResponseSchema,
  HostListQueryDto,
  IngestHostLogsBody,
  IngestHostLogsResponse,
  IngestHostLogsResponseSchema,
  ListHostLogsQuery,
  ListHostLogsResponse,
  ListHostLogsResponseSchema,
  ListHostBatchesQuery,
  ListHostBatchesResponse,
  ListHostBatchesResponseSchema,
  ListHostMetricsQuery,
  ListHostMetricsResponse,
  ListHostMetricsResponseSchema,
  ListHostResponse,
  ListHostResponseSchema,
  RegisterHostBody,
  RegisterHostResponse,
  RegisterHostResponseSchema,
  StatusListHostResponse,
  StatusListHostResponseSchema,
  UpdateHostStatusBody,
  UpdateHostStatusResponse,
  UpdateHostStatusResponseSchema,
} from './host.dto';
import { HostService } from './host.service';

@Controller()
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Public()
  @SuccessResponse(ListHostResponseSchema)
  @Get(PATHS.HOST.LIST)
  async list(
    @Query() query: HostListQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListHostResponse> {
    const { items, total } = await this.hostService.list(query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(CapacitySummaryHostResponseSchema)
  @Get(PATHS.HOST.CAPACITY_SUMMARY)
  async capacitySummary(): Promise<CapacitySummaryHostResponse> {
    const response = await this.hostService.capacitySummary();
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(StatusListHostResponseSchema)
  @Get(PATHS.HOST.STATUS_LIST)
  async statusList(): Promise<StatusListHostResponse> {
    const response = await this.hostService.statusList();
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(ActiveHostResponseSchema)
  @Get(PATHS.HOST.ACTIVE)
  async listActive(): Promise<ActiveHostResponse> {
    const response = await this.hostService.listActive();
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(ListHostMetricsResponseSchema)
  @Get(PATHS.HOST.METRICS)
  async listMetrics(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListHostMetricsQuery,
  ): Promise<ListHostMetricsResponse> {
    const response = await this.hostService.listMetrics(id, {
      since: query.since,
      limit: query.limit,
    });
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(GetHostResponseSchema)
  @Get(PATHS.HOST.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetHostResponse> {
    const response = await this.hostService.getById(id);
    return Response.success(response);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(RegisterHostResponseSchema)
  @HttpCodeDecorator(HttpCode.OK)
  @Post(PATHS.HOST.REGISTER)
  async register(
    @Body() body: RegisterHostBody,
  ): Promise<RegisterHostResponse> {
    const response = await this.hostService.register(body);
    return Response.success(response);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(UpdateHostStatusResponseSchema)
  @HttpCodeDecorator(HttpCode.OK)
  @Patch(PATHS.HOST.UPDATE_STATUS)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHostStatusBody,
  ): Promise<UpdateHostStatusResponse> {
    const response = await this.hostService.updateStatus(id, body.status);
    return Response.success(response);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(HeartbeatHostResponseSchema)
  @HttpCodeDecorator(HttpCode.OK)
  @Post(PATHS.HOST.HEARTBEAT)
  async heartbeat(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: HeartbeatHostBody,
  ): Promise<HeartbeatHostResponse> {
    const response = await this.hostService.heartbeat(id, body);
    return Response.success(response);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(IngestHostLogsResponseSchema)
  @HttpCodeDecorator(HttpCode.OK)
  @Post(PATHS.HOST.INGEST_LOGS)
  async ingestLogs(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: IngestHostLogsBody,
  ): Promise<IngestHostLogsResponse> {
    const response = await this.hostService.ingestLogs(id, body.logs);
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(ListHostBatchesResponseSchema)
  @Get(PATHS.HOST.LIST_BATCHES)
  async listBatches(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListHostBatchesQuery,
  ): Promise<ListHostBatchesResponse> {
    const response = await this.hostService.listRecentBatches(id, query.limit);
    return Response.success(response);
  }

  @Public()
  @SuccessResponse(ListHostLogsResponseSchema)
  @Get(PATHS.HOST.LIST_LOGS)
  async listLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListHostLogsQuery,
  ): Promise<ListHostLogsResponse> {
    const response = await this.hostService.listLogs(id, {
      limit: query.limit,
      before: query.before,
    });
    return Response.success(response);
  }
}
