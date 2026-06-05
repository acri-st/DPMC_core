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
  CreateProductTypeBody,
  CreateProductTypeResponse,
  CreateProductTypeResponseSchema,
  GetProductTypeResponse,
  GetProductTypeResponseSchema,
  ListProductTypeResponse,
  ListProductTypeResponseSchema,
  UpdateProductTypeBody,
  UpdateProductTypeResponse,
  UpdateProductTypeResponseSchema,
} from './product-type.dto';
import { ProductTypeService } from './product-type.service';

@Controller()
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Public()
  @SuccessResponse(ListProductTypeResponseSchema)
  @Get(PATHS.PRODUCT_TYPE.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProductTypeResponse> {
    const { items, total } = await this.productTypeService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetProductTypeResponseSchema)
  @Get(PATHS.PRODUCT_TYPE.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProductTypeResponse> {
    const response = await this.productTypeService.getById(id);
    return Response.success(response);
  }

  @Public()
  @CreatedResponse(CreateProductTypeResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCT_TYPE.CREATE)
  async create(
    @Body() body: CreateProductTypeBody,
  ): Promise<CreateProductTypeResponse> {
    const response = await this.productTypeService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Public()
  @SuccessResponse(UpdateProductTypeResponseSchema)
  @Patch(PATHS.PRODUCT_TYPE.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductTypeBody,
  ): Promise<UpdateProductTypeResponse> {
    const response = await this.productTypeService.update(id, body);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCT_TYPE.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productTypeService.delete(id);
  }
}
