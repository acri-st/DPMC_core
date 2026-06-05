import { Module } from '@nestjs/common';

import { ProcessingChainsController } from './processing-chains.controller';
import { ProcessingChainsService } from './processing-chains.service';

@Module({
  controllers: [ProcessingChainsController],
  providers: [ProcessingChainsService],
  exports: [ProcessingChainsService],
})
export class ProcessingChainsModule {}
