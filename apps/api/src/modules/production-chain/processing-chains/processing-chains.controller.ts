import {
  CreatedResponse,
  NoContentResponse,
  Response,
  SuccessResponse,
} from '@/common';
import { ProjectScoped } from '@/common/decorators/project-scoped.decorator';
import { HttpCode, PATHS } from '@dpmc/client';
import {
  Body,
  Controller,
  Delete,
  HttpCode as HttpCodeDec,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AddProcessingChainBody,
  AddProcessingChainResponse,
  AddProcessingChainResponseSchema,
  UpdateProcessingChainBody,
  UpdateProcessingChainResponse,
  UpdateProcessingChainResponseSchema,
} from './processing-chains.dto';
import { ProcessingChainsService } from './processing-chains.service';

@Controller()
export class ProcessingChainsController {
  constructor(
    private readonly processingChainsService: ProcessingChainsService,
  ) {}

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(AddProcessingChainResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCTION_CHAIN.ADD_PROCESSING_CHAIN)
  async add(
    @Param('id', ParseIntPipe) chainId: number,
    @Body() body: AddProcessingChainBody,
  ): Promise<AddProcessingChainResponse> {
    const response = await this.processingChainsService.add(chainId, body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateProcessingChainResponseSchema)
  @Patch(PATHS.PRODUCTION_CHAIN.UPDATE_PROCESSING_CHAIN)
  async update(
    @Param('id', ParseIntPipe) chainId: number,
    @Param('pcId', ParseIntPipe) pcId: number,
    @Body() body: UpdateProcessingChainBody,
  ): Promise<UpdateProcessingChainResponse> {
    const response = await this.processingChainsService.update(
      chainId,
      pcId,
      body,
    );
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCTION_CHAIN.DELETE_PROCESSING_CHAIN)
  async remove(
    @Param('id', ParseIntPipe) chainId: number,
    @Param('pcId', ParseIntPipe) pcId: number,
  ): Promise<void> {
    await this.processingChainsService.delete(chainId, pcId);
  }
}
