import { Module } from '@nestjs/common';
import { DataCenterController } from './data-center.controller';
import { DataCenterService } from './data-center.service';

@Module({
  imports: [],
  controllers: [DataCenterController],
  providers: [DataCenterService],
})
export class DataCenterModule {}
