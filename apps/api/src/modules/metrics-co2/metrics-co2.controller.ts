import { Public, Response, SuccessResponse } from '@/common';
import { PATHS } from '@dpmc/client';
import { Controller, Get, Query } from '@nestjs/common';

import { Co2Query, Co2Response, Co2ResponseSchema } from './metrics-co2.dto';
import { MetricsCo2Service } from './metrics-co2.service';

@Controller()
export class MetricsCo2Controller {
  constructor(private readonly service: MetricsCo2Service) {}

  @Public()
  @SuccessResponse(Co2ResponseSchema)
  @Get(PATHS.METRICS.CO2)
  async get(@Query() query: Co2Query): Promise<Co2Response> {
    const data = await this.service.aggregate({
      groupBy: query.groupBy,
      from: query.from,
      to: query.to,
    });
    return Response.success(data);
  }
}
