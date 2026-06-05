import { Module } from '@nestjs/common';
import { AuxiliaryConfigurationController } from './auxiliary-configuration.controller';
import { AuxiliaryConfigurationService } from './auxiliary-configuration.service';

@Module({
  imports: [],
  controllers: [AuxiliaryConfigurationController],
  providers: [AuxiliaryConfigurationService],
  exports: [AuxiliaryConfigurationService],
})
export class AuxiliaryConfigurationModule {}
