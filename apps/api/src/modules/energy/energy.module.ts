import { Module } from '@nestjs/common';

import { EnergyReconcilerService } from './energy-reconciler.service';
import { EnergyService } from './energy.service';
import { PrometheusClient } from './prometheus.client';

@Module({
  providers: [PrometheusClient, EnergyService, EnergyReconcilerService],
  exports: [EnergyService, PrometheusClient],
})
export class EnergyModule {}
