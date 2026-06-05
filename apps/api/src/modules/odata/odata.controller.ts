import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { SessionGuard } from '@/common/guards';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PATHS } from '@dpmc/client';

import { ODataService } from './odata.service';

/**
 * OData v4 controller mounted at `/api/odata/<resource>`.
 *
 * Read endpoints (`GET`) are public (ESA E11-01/05/07 compliance). Write
 * endpoints (`POST`, `PATCH`, `DELETE`) are restricted to authenticated
 * sessions with at least the `operator` role and are gated on the
 * `writable` flag of each resource in the registry.
 */
@ApiTags('odata')
@Controller()
export class ODataController {
  constructor(private readonly service: ODataService) {}

  @Public()
  @ApiOperation({ summary: 'OData v4 list query' })
  @Get(PATHS.ODATA.LIST)
  list(
    @Param('resource') resource: string,
    @Query() qs: Record<string, string | string[] | undefined>,
  ) {
    return this.service.list(resource, qs);
  }

  @Public()
  @ApiOperation({ summary: 'OData v4 single entity by id' })
  @Get(PATHS.ODATA.GET)
  getOne(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Query() qs: Record<string, string | string[] | undefined>,
  ) {
    return this.service.getOne(resource, id, qs);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'OData v4 create' })
  @Post(PATHS.ODATA.CREATE)
  create(
    @Param('resource') resource: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.create(resource, body);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'OData v4 patch' })
  @Patch(PATHS.ODATA.UPDATE)
  update(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.update(resource, id, body);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'OData v4 delete' })
  @Delete(PATHS.ODATA.DELETE)
  remove(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.delete(resource, id);
  }
}
