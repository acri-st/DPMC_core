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
  CreateProcessorVersionBody,
  CreateProcessorVersionResponse,
  CreateProcessorVersionResponseSchema,
  GetProcessorVersionResponse,
  GetProcessorVersionResponseSchema,
  ListProcessorVersionResponse,
  ListProcessorVersionResponseSchema,
  UpdateProcessorVersionBody,
  UpdateProcessorVersionResponse,
  UpdateProcessorVersionResponseSchema,
} from './processor-version.dto';
import { ProcessorVersionService } from './processor-version.service';

@Controller()
export class ProcessorVersionController {
  constructor(
    private readonly processorVersionService: ProcessorVersionService,
  ) {}

  @Public()
  @SuccessResponse(ListProcessorVersionResponseSchema)
  @Get(PATHS.PROCESSOR_VERSION.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProcessorVersionResponse> {
    const { items, total } =
      await this.processorVersionService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetProcessorVersionResponseSchema)
  @Get(PATHS.PROCESSOR_VERSION.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProcessorVersionResponse> {
    const response = await this.processorVersionService.getById(id);
    return Response.success(response);
  }

  @Public()
  @CreatedResponse(CreateProcessorVersionResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PROCESSOR_VERSION.CREATE)
  async create(
    @Body() body: CreateProcessorVersionBody,
  ): Promise<CreateProcessorVersionResponse> {
    const response = await this.processorVersionService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Public()
  @SuccessResponse(UpdateProcessorVersionResponseSchema)
  @Patch(PATHS.PROCESSOR_VERSION.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcessorVersionBody,
  ): Promise<UpdateProcessorVersionResponse> {
    const response = await this.processorVersionService.update(id, body);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PROCESSOR_VERSION.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.processorVersionService.delete(id);
  }
}
