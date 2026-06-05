import {
  CreatedResponse,
  NoContentResponse,
  Public,
  Response,
  SuccessResponse,
} from '@/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';
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
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import {
  CreateProductIngestionHookBody,
  CreateProductIngestionHookResponse,
  CreateProductIngestionHookResponseSchema,
  GetProductIngestionHookResponse,
  GetProductIngestionHookResponseSchema,
  ListProductIngestionHookResponse,
  ListProductIngestionHookResponseSchema,
  ProductIngestionHookListQueryDto,
  UpdateProductIngestionHookBody,
  UpdateProductIngestionHookResponse,
  UpdateProductIngestionHookResponseSchema,
} from './product-ingestion-hook.dto';
import { ProductIngestionHookService } from './product-ingestion-hook.service';

@Controller()
export class ProductIngestionHookController {
  constructor(
    private readonly productIngestionHookService: ProductIngestionHookService,
  ) {}

  @Public()
  @SuccessResponse(ListProductIngestionHookResponseSchema)
  @Get(PATHS.PRODUCT_INGESTION_HOOK.LIST)
  async list(
    @Query() query: ProductIngestionHookListQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProductIngestionHookResponse> {
    const { items, total } = await this.productIngestionHookService.list(query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetProductIngestionHookResponseSchema)
  @Get(PATHS.PRODUCT_INGESTION_HOOK.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProductIngestionHookResponse> {
    const response = await this.productIngestionHookService.getById(id);
    return Response.success(response);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @CreatedResponse(CreateProductIngestionHookResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCT_INGESTION_HOOK.CREATE)
  async create(
    @Body() body: CreateProductIngestionHookBody,
  ): Promise<CreateProductIngestionHookResponse> {
    const response = await this.productIngestionHookService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @SuccessResponse(UpdateProductIngestionHookResponseSchema)
  @Patch(PATHS.PRODUCT_INGESTION_HOOK.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductIngestionHookBody,
  ): Promise<UpdateProductIngestionHookResponse> {
    const response = await this.productIngestionHookService.update(id, body);
    return Response.success(response);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCT_INGESTION_HOOK.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productIngestionHookService.delete(id);
  }
}
