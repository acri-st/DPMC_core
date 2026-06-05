import {
  CreatedResponse,
  NoContentResponse,
  Public,
  Response,
  SuccessResponse,
} from '@/common';
import { HttpCode, PATHS } from '@dpmc/client';
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
  Query,
  Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { PaginationQueryDto } from '@/common/utils/pagination';
import {
  AddPoolHostResponse,
  AddPoolHostResponseSchema,
  CreatePoolBody,
  CreatePoolResponse,
  CreatePoolResponseSchema,
  GetPoolResponse,
  GetPoolResponseSchema,
  ListPoolResponse,
  ListPoolResponseSchema,
  UpdatePoolBody,
  UpdatePoolResponse,
  UpdatePoolResponseSchema,
} from './pool.dto';
import { PoolService } from './pool.service';

@Controller()
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Public()
  @SuccessResponse(ListPoolResponseSchema)
  @Get(PATHS.POOL.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListPoolResponse> {
    const { items, total } = await this.poolService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetPoolResponseSchema)
  @Get(PATHS.POOL.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetPoolResponse> {
    const response = await this.poolService.getDetail(id);
    return Response.success(response);
  }

  @Public()
  @CreatedResponse(CreatePoolResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.POOL.CREATE)
  async create(@Body() body: CreatePoolBody): Promise<CreatePoolResponse> {
    const response = await this.poolService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Public()
  @SuccessResponse(UpdatePoolResponseSchema)
  @Patch(PATHS.POOL.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePoolBody,
  ): Promise<UpdatePoolResponse> {
    const response = await this.poolService.update(id, body);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.POOL.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.poolService.delete(id);
  }

  @Public()
  @SuccessResponse(AddPoolHostResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.POOL.ADD_HOST)
  async addHost(
    @Param('id', ParseIntPipe) id: number,
    @Param('hostId', ParseIntPipe) hostId: number,
  ): Promise<AddPoolHostResponse> {
    const response = await this.poolService.addHost(id, hostId);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.POOL.REMOVE_HOST)
  async removeHost(
    @Param('id', ParseIntPipe) id: number,
    @Param('hostId', ParseIntPipe) hostId: number,
  ): Promise<void> {
    await this.poolService.removeHost(id, hostId);
  }
}
