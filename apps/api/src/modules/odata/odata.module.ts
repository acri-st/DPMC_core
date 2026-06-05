import { Module } from '@nestjs/common';

import { ODataController } from './odata.controller';
import { ODataService } from './odata.service';

@Module({
  imports: [],
  controllers: [ODataController],
  providers: [ODataService],
})
export class ODataModule {}
