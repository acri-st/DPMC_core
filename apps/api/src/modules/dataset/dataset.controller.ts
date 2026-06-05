import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { PATHS } from '@dpmc/client';
import { Response } from '@/common';
import { parsePagination, paginationSkipTake } from '@/common/utils/pagination';
import { DatasetService } from './dataset.service';
import {
  CreateDatasetBody,
  CreateDatasetResponse,
  GetDatasetResponse,
  ListDatasetResponse,
  UpdateDatasetBody,
  UpdateDatasetResponse,
} from './dataset.dto';

@Controller()
export class DatasetController {
  constructor(private readonly service: DatasetService) {}

  @Get(PATHS.DATASET.LIST)
  async list(
    @Query() q: any,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListDatasetResponse> {
    const pagination = parsePagination(q);
    const { skip, take } = paginationSkipTake(pagination);
    const { data, total } = await this.service.list({
      skip,
      take,
      producedByBatchId: q.producedByBatchId,
      name: q.name,
    });
    res.setHeader('X-Total-Count', String(total));
    return Response.success(data, { total }) as unknown as ListDatasetResponse;
  }

  @Get(PATHS.DATASET.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetDatasetResponse> {
    const data = await this.service.getById(id);
    return Response.success(data) as unknown as GetDatasetResponse;
  }

  @Post(PATHS.DATASET.CREATE)
  async create(
    @Body() body: CreateDatasetBody,
  ): Promise<CreateDatasetResponse> {
    const data = await this.service.create(body);
    return Response.success(data) as unknown as CreateDatasetResponse;
  }

  @Patch(PATHS.DATASET.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDatasetBody,
  ): Promise<UpdateDatasetResponse> {
    const data = await this.service.update(id, body);
    return Response.success(data) as unknown as UpdateDatasetResponse;
  }

  @Delete(PATHS.DATASET.DELETE)
  @HttpCode(204)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.service.delete(id);
  }
}
