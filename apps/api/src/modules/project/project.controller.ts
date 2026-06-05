import {
  CreatedResponse,
  NoContentResponse,
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
  CreateProjectBody,
  CreateProjectResponse,
  CreateProjectResponseSchema,
  GetProjectResponse,
  GetProjectResponseSchema,
  ListProjectResponse,
  ListProjectResponseSchema,
  ProjectListQueryDto,
  SetDefaultProjectResponse,
  SetDefaultProjectResponseSchema,
  UpdateProjectBody,
  UpdateProjectResponse,
  UpdateProjectResponseSchema,
} from './project.dto';
import { ProjectService } from './project.service';

@UseGuards(SessionGuard, RolesGuard)
@Controller()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Roles('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(ListProjectResponseSchema)
  @Get(PATHS.PROJECT.LIST)
  async list(
    @Query() query: ProjectListQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListProjectResponse> {
    const { items, total } = await this.projectService.list(query);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @Roles('admin', 'operator', 'internal-viewer', 'external-viewer')
  @SuccessResponse(GetProjectResponseSchema)
  @Get(PATHS.PROJECT.GET)
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProjectResponse> {
    const response = await this.projectService.getById(id);
    return Response.success(response);
  }

  @Roles('admin')
  @CreatedResponse(CreateProjectResponseSchema)
  @HttpCodeDec(HttpCode.CREATED)
  @Post(PATHS.PROJECT.CREATE)
  async create(
    @Body() body: CreateProjectBody,
  ): Promise<CreateProjectResponse> {
    const response = await this.projectService.create(body);
    return Response.success(response, { status: HttpCode.CREATED });
  }

  @Roles('admin')
  @SuccessResponse(UpdateProjectResponseSchema)
  @Patch(PATHS.PROJECT.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProjectBody,
  ): Promise<UpdateProjectResponse> {
    const response = await this.projectService.update(id, body);
    return Response.success(response);
  }

  @Roles('admin')
  @SuccessResponse(SetDefaultProjectResponseSchema)
  @Post(PATHS.PROJECT.SET_DEFAULT)
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SetDefaultProjectResponse> {
    const response = await this.projectService.setDefault(id);
    return Response.success(response);
  }

  @Roles('admin')
  @NoContentResponse()
  @HttpCodeDec(HttpCode.NO_CONTENT)
  @Delete(PATHS.PROJECT.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.projectService.delete(id);
  }
}
