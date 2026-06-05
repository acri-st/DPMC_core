import { Module } from '@nestjs/common';
import { MetricsCo2Controller } from './metrics-co2.controller';
import { MetricsCo2Service } from './metrics-co2.service';

@Module({
  controllers: [MetricsCo2Controller],
  providers: [MetricsCo2Service],
  exports: [MetricsCo2Service],
})
export class MetricsCo2Module {}
