import { Public, Response, SuccessResponse } from '@/common';
import { WorkerTokenGuard } from '@/common/guards/worker-token.guard';
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

import {
  BatchInputsResponse,
  BatchInputsResponseSchema,
  JobOutputsBody,
  JobOutputsResponse,
  JobOutputsResponseSchema,
  JobResultBody,
  JobResultResponse,
  JobResultResponseSchema,
  NextJobResponse,
  NextJobResponseSchema,
} from './worker.dto';
import { WorkerService } from './worker.service';

@Controller()
export class WorkerController {
  constructor(private readonly worker: WorkerService) {}

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(NextJobResponseSchema)
  @Get(PATHS.WORKER.NEXT_JOB)
  async nextJob(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NextJobResponse> {
    const data = await this.worker.nextJob(id);
    return Response.success(data);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(JobResultResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.WORKER.JOB_RESULT)
  async result(
    @Param('id', ParseIntPipe) hostId: number,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() body: JobResultBody,
  ): Promise<JobResultResponse> {
    const data = await this.worker.reportResult(hostId, jobId, body);
    return Response.success(data);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(JobOutputsResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.WORKER.JOB_OUTPUTS)
  async outputs(
    @Param('id', ParseIntPipe) hostId: number,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() body: JobOutputsBody,
  ): Promise<JobOutputsResponse> {
    const data = await this.worker.recordOutputs(hostId, jobId, body);
    return Response.success(data);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(BatchInputsResponseSchema)
  @Get(PATHS.WORKER.BATCH_INPUTS)
  async batchInputs(
    @Param('batchId', ParseIntPipe) batchId: number,
  ): Promise<BatchInputsResponse> {
    const data = await this.worker.getBatchInputs(batchId);
    return Response.success(data);
  }
}
