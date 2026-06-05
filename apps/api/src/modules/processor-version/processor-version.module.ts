import { Module } from '@nestjs/common';
import { ProcessorVersionController } from './processor-version.controller';
import { ProcessorVersionService } from './processor-version.service';

@Module({
  imports: [],
  controllers: [ProcessorVersionController],
  providers: [ProcessorVersionService],
  exports: [ProcessorVersionService],
})
export class ProcessorVersionModule {}
