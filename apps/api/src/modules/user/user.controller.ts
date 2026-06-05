import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { PaginationQueryDto } from '@/common/utils/pagination';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Roles } from '@/common/decorators/roles.decorator';
import { SuccessResponse } from '@/common/decorators/response.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SessionGuard } from '@/common/guards/session.guard';
import { Response } from '@/common/utils/response.utils';
import { PATHS } from '@dpmc/client';
import {
  GetMeSettingsResponse,
  GetMeSettingsResponseSchema,
  PatchMeSettingsBody,
  PatchMeSettingsResponse,
  PatchMeSettingsResponseSchema,
} from './me.dto';
import { ListUsersResponse, ListUsersResponseSchema } from './user-list.dto';
import { UserService } from './user.service';

@ApiTags('user')
@UseGuards(SessionGuard, RolesGuard)
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('admin')
  @SuccessResponse(ListUsersResponseSchema)
  @Get(PATHS.USER.LIST)
  async list(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<ListUsersResponse> {
    const { items, total } = await this.userService.list(pagination);
    res.setHeader('X-Total-Count', String(total));
    return Response.success(items);
  }

  @SuccessResponse(GetMeSettingsResponseSchema)
  @Get(PATHS.USER.ME_SETTINGS)
  async getMySettings(@Req() req: Request): Promise<GetMeSettingsResponse> {
    const userId = this.getUserId(req);
    const settings = await this.userService.getSettings(userId);
    return Response.success(settings) as unknown as GetMeSettingsResponse;
  }

  @SuccessResponse(PatchMeSettingsResponseSchema)
  @Patch(PATHS.USER.ME_SETTINGS)
  async patchMySettings(
    @Req() req: Request,
    @Body() body: PatchMeSettingsBody,
  ): Promise<PatchMeSettingsResponse> {
    const userId = this.getUserId(req);
    const settings = await this.userService.updateSettings(userId, body);
    return Response.success(settings) as unknown as PatchMeSettingsResponse;
  }

  private getUserId(req: Request): number {
    if (!req.appUser) throw new UnauthorizedException();
    return req.appUser.id;
  }
}
