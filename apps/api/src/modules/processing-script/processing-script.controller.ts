import { Public, Response, SuccessResponse } from '@/common';
import { PATHS } from '@dpmc/client';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { PaginationQueryDto } from '@/common/utils/pagination';
import {
  GetProcessingScriptResponse,
  GetProcessingScriptResponseSchema,
  ListProcessingScriptResponse,
  ListProcessingScriptResponseSchema,
} from './processing-script.dto';
import { ProcessingScriptService } from './processing-script.service';

@Controller()
export class ProcessingScriptController {
  constructor(
    private readonly processingScriptService: ProcessingScriptService,
  ) {}

  @Public()
  @SuccessResponse(ListProcessingScriptResponseSchema)
  @Get(PATHS.PROCESSING_SCRIPT.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProcessingScriptResponse> {
    const { items, total } =
      await this.processingScriptService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetProcessingScriptResponseSchema)
  @Get(PATHS.PROCESSING_SCRIPT.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProcessingScriptResponse> {
    const response = await this.processingScriptService.getById(id);
    return Response.success(response);
  }
}
