import {
  CreatedResponse,
  NoContentResponse,
  Response,
  SuccessResponse,
} from '@/common';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { ProjectScoped } from '@/common/decorators/project-scoped.decorator';
import { HttpCode, PATHS } from '@dpmc/client';
import type { Project } from '@dpmc/prisma';
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
import {
  CreateProductionChainBody,
  CreateProductionChainResponse,
  CreateProductionChainResponseSchema,
  GetProductionChainResponse,
  GetProductionChainResponseSchema,
  ImportProductionChainBody,
  ImportProductionChainBodyValidationSchema,
  ImportProductionChainResponse,
  ImportProductionChainResponseSchema,
  PreviewProductionChainResponse,
  PreviewProductionChainResponseSchema,
  LinkProductTypeResponse,
  LinkProductTypeResponseSchema,
  ListCompatibleProductsResponse,
  ListCompatibleProductsResponseSchema,
  ListProductionChainResponse,
  ListProductionChainResponseSchema,
  ProductionChainListQueryDto,
  UpdateProductionChainBody,
  UpdateProductionChainResponse,
  UpdateProductionChainResponseSchema,
} from './production-chain.dto';
import { ProductionChainService } from './production-chain.service';
import { TaskTableService } from '@/modules/task-table/task-table.service';
import { ZodValidationPipe } from 'nestjs-zod';

@Controller()
export class ProductionChainController {
  constructor(
    private readonly productionChainService: ProductionChainService,
    private readonly taskTableService: TaskTableService,
  ) {}

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(PreviewProductionChainResponseSchema)
  @Post(PATHS.PRODUCTION_CHAIN.IMPORT_PREVIEW)
  async previewTaskTable(
    @Body(new ZodValidationPipe(ImportProductionChainBodyValidationSchema))
    body: ImportProductionChainBody,
  ): Promise<PreviewProductionChainResponse> {
    const ir = this.taskTableService.previewIpf(body.content);
    return Response.success(ir);
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(ImportProductionChainResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCTION_CHAIN.IMPORT)
  async importFromTaskTable(
    @Body(new ZodValidationPipe(ImportProductionChainBodyValidationSchema))
    body: ImportProductionChainBody,
    @CurrentProject() project: Project,
  ): Promise<ImportProductionChainResponse> {
    const result = await this.taskTableService.createChainFromIpf(
      project.id,
      body.content,
    );
    return Response.success(result, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListProductionChainResponseSchema)
  @Get(PATHS.PRODUCTION_CHAIN.LIST)
  async list(
    @Query() query: ProductionChainListQueryDto,
    @CurrentProject() project: Project,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProductionChainResponse> {
    const { items, total } = await this.productionChainService.list(
      project.id,
      query,
    );
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(GetProductionChainResponseSchema)
  @Get(PATHS.PRODUCTION_CHAIN.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<GetProductionChainResponse> {
    const response = await this.productionChainService.getById(id, project.id);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListCompatibleProductsResponseSchema)
  @Get(PATHS.PRODUCTION_CHAIN.LIST_COMPATIBLE_PRODUCTS)
  async listCompatibleProducts(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<ListCompatibleProductsResponse> {
    const items = await this.productionChainService.listCompatibleProducts(
      id,
      project.id,
    );
    return Response.success(items);
  }

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(CreateProductionChainResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCTION_CHAIN.CREATE)
  async create(
    @Body() body: CreateProductionChainBody,
    @CurrentProject() project: Project,
  ): Promise<CreateProductionChainResponse> {
    const response = await this.productionChainService.create(body, project.id);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateProductionChainResponseSchema)
  @Patch(PATHS.PRODUCTION_CHAIN.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductionChainBody,
    @CurrentProject() project: Project,
  ): Promise<UpdateProductionChainResponse> {
    const response = await this.productionChainService.update(
      id,
      project.id,
      body,
    );
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCTION_CHAIN.DELETE)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentProject() project: Project,
  ): Promise<void> {
    await this.productionChainService.delete(id, project.id);
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(LinkProductTypeResponseSchema)
  @HttpCodeDec(HttpCode.OK)
  @Post(PATHS.PRODUCTION_CHAIN.LINK_PRODUCT_TYPE)
  async linkProductType(
    @Param('id', ParseIntPipe) id: number,
    @Param('productTypeId', ParseIntPipe) productTypeId: number,
    @CurrentProject() project: Project,
  ): Promise<LinkProductTypeResponse> {
    const response = await this.productionChainService.linkProductType(
      id,
      productTypeId,
      project.id,
    );
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCTION_CHAIN.UNLINK_PRODUCT_TYPE)
  async unlinkProductType(
    @Param('id', ParseIntPipe) id: number,
    @Param('productTypeId', ParseIntPipe) productTypeId: number,
    @CurrentProject() project: Project,
  ): Promise<void> {
    await this.productionChainService.unlinkProductType(
      id,
      productTypeId,
      project.id,
    );
  }
}
