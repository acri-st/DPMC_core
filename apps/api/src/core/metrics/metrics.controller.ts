import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '@/common/decorators';
import { PATHS } from '@dpmc/client';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get(PATHS.HEALTH.METRICS)
  @Header('Content-Type', 'text/plain; version=0.0.4')
  render(): Promise<string> {
    return this.metrics.render();
  }
}
