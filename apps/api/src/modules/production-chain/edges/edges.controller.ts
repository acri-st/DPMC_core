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
  AddEdgeBody,
  AddEdgeResponse,
  AddEdgeResponseSchema,
  UpdateEdgeBody,
  UpdateEdgeResponse,
  UpdateEdgeResponseSchema,
} from './edges.dto';
import { EdgesService } from './edges.service';

@Controller()
export class EdgesController {
  constructor(private readonly edgesService: EdgesService) {}

  @ProjectScoped('admin', 'operator')
  @CreatedResponse(AddEdgeResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PRODUCTION_CHAIN.ADD_EDGE)
  async add(
    @Param('id', ParseIntPipe) chainId: number,
    @Body() body: AddEdgeBody,
  ): Promise<AddEdgeResponse> {
    const response = await this.edgesService.add(chainId, body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @ProjectScoped('admin', 'operator')
  @SuccessResponse(UpdateEdgeResponseSchema)
  @Patch(PATHS.PRODUCTION_CHAIN.UPDATE_EDGE)
  async update(
    @Param('id', ParseIntPipe) chainId: number,
    @Param('edgeId', ParseIntPipe) edgeId: number,
    @Body() body: UpdateEdgeBody,
  ): Promise<UpdateEdgeResponse> {
    const response = await this.edgesService.update(chainId, edgeId, body);
    return Response.success(response);
  }

  @ProjectScoped('admin', 'operator')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PRODUCTION_CHAIN.DELETE_EDGE)
  async remove(
    @Param('id', ParseIntPipe) chainId: number,
    @Param('edgeId', ParseIntPipe) edgeId: number,
  ): Promise<void> {
    await this.edgesService.delete(chainId, edgeId);
  }
}
