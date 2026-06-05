import { Public, Response, SuccessResponse } from '@/common';
import { WorkerTokenGuard } from '@/common/guards/worker-token.guard';
import { TaskService } from '@/modules/task/task.service';
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
  SchedulerExpandTaskResponse,
  SchedulerExpandTaskResponseSchema,
  SchedulerHeartbeatBody,
  SchedulerHeartbeatResponse,
  SchedulerHeartbeatResponseSchema,
  SchedulerStatusResponse,
  SchedulerStatusResponseSchema,
} from './scheduler.dto';
import { SchedulerService } from './scheduler.service';

@Controller()
export class SchedulerController {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly tasks: TaskService,
  ) {}

  @Public()
  @SuccessResponse(SchedulerStatusResponseSchema)
  @Get(PATHS.SCHEDULER.STATUS)
  async status(): Promise<SchedulerStatusResponse> {
    const data = await this.scheduler.status();
    return Response.success(data);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(SchedulerHeartbeatResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.SCHEDULER.HEARTBEAT)
  async heartbeat(
    @Body() body: SchedulerHeartbeatBody,
  ): Promise<SchedulerHeartbeatResponse> {
    const data = await this.scheduler.heartbeat(body);
    return Response.success(data);
  }

  @Public()
  @UseGuards(WorkerTokenGuard)
  @SuccessResponse(SchedulerExpandTaskResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.SCHEDULER.EXPAND_TASK)
  async expandTask(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SchedulerExpandTaskResponse> {
    const data = await this.tasks.expandFromScheduler(id);
    return Response.success(data);
  }
}
