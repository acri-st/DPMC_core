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
  GetDataCenterResponse,
  GetDataCenterResponseSchema,
  ListDataCenterResponse,
  ListDataCenterResponseSchema,
} from './data-center.dto';
import { DataCenterService } from './data-center.service';

@Controller()
export class DataCenterController {
  constructor(private readonly dataCenterService: DataCenterService) {}

  @Public()
  @SuccessResponse(ListDataCenterResponseSchema)
  @Get(PATHS.DATA_CENTER.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListDataCenterResponse> {
    const { items, total } = await this.dataCenterService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetDataCenterResponseSchema)
  @Get(PATHS.DATA_CENTER.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetDataCenterResponse> {
    const response = await this.dataCenterService.getById(id);
    return Response.success(response);
  }
}
