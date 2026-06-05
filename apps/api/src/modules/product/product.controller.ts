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
  CreateProductBody,
  CreateProductResponse,
  CreateProductResponseSchema,
  GetProductResponse,
  GetProductResponseSchema,
  ListProductResponse,
  ListProductResponseSchema,
  UpdateProductBody,
  UpdateProductResponse,
  UpdateProductResponseSchema,
} from './product.dto';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @SuccessResponse(ListProductResponseSchema)
  @Get(PATHS.PRODUCT.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProductResponse> {
    const { items, total } = await this.productService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetProductResponseSchema)
  @Get(PATHS.PRODUCT.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProductResponse> {
    const response = await this.productService.getById(id);
    return Response.success(response);
  }

  @Public()
  @CreatedResponse(CreateProductResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCT.CREATE)
  async create(
    @Body() body: CreateProductBody,
  ): Promise<CreateProductResponse> {
    const response = await this.productService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Public()
  @SuccessResponse(UpdateProductResponseSchema)
  @Patch(PATHS.PRODUCT.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBody,
  ): Promise<UpdateProductResponse> {
    const response = await this.productService.update(id, body);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCT.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productService.delete(id);
  }
}
