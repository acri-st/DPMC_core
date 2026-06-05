import { Public } from '@/common/decorators/public.decorator';
import { SuccessResponse } from '@/common/decorators/response.decorator';
import { Response } from '@/common/utils/response.utils';
import { Controller, Get } from '@nestjs/common';
import { StatusResponse, StatusResponseSchema } from './status.dto';
import { StatusService } from './status.service';
import { PATHS } from '@dpmc/client';

@Controller()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Public()
  @SuccessResponse(StatusResponseSchema)
  @Get(PATHS.STATUS.GET)
  async getStatus(): Promise<StatusResponse> {
    const response = await this.statusService.getStatus();
    return Response.success(response);
  }
}
