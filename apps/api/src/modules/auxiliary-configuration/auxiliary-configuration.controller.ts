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
  CreateAuxiliaryConfigurationBody,
  CreateAuxiliaryConfigurationResponse,
  CreateAuxiliaryConfigurationResponseSchema,
  GetAuxiliaryConfigurationResponse,
  GetAuxiliaryConfigurationResponseSchema,
  ListAuxiliaryConfigurationResponse,
  ListAuxiliaryConfigurationResponseSchema,
  UpdateAuxiliaryConfigurationBody,
  UpdateAuxiliaryConfigurationResponse,
  UpdateAuxiliaryConfigurationResponseSchema,
} from './auxiliary-configuration.dto';
import { AuxiliaryConfigurationService } from './auxiliary-configuration.service';

@Controller()
export class AuxiliaryConfigurationController {
  constructor(
    private readonly auxiliaryConfigurationService: AuxiliaryConfigurationService,
  ) {}

  @Public()
  @SuccessResponse(ListAuxiliaryConfigurationResponseSchema)
  @Get(PATHS.AUXILIARY_CONFIGURATION.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListAuxiliaryConfigurationResponse> {
    const { items, total } =
      await this.auxiliaryConfigurationService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Public()
  @SuccessResponse(GetAuxiliaryConfigurationResponseSchema)
  @Get(PATHS.AUXILIARY_CONFIGURATION.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetAuxiliaryConfigurationResponse> {
    const response = await this.auxiliaryConfigurationService.getById(id);
    return Response.success(response);
  }

  @Public()
  @CreatedResponse(CreateAuxiliaryConfigurationResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.AUXILIARY_CONFIGURATION.CREATE)
  async create(
    @Body() body: CreateAuxiliaryConfigurationBody,
  ): Promise<CreateAuxiliaryConfigurationResponse> {
    const response = await this.auxiliaryConfigurationService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Public()
  @SuccessResponse(UpdateAuxiliaryConfigurationResponseSchema)
  @Patch(PATHS.AUXILIARY_CONFIGURATION.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAuxiliaryConfigurationBody,
  ): Promise<UpdateAuxiliaryConfigurationResponse> {
    const response = await this.auxiliaryConfigurationService.update(id, body);
    return Response.success(response);
  }

  @Public()
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.AUXILIARY_CONFIGURATION.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.auxiliaryConfigurationService.delete(id);
  }
}
