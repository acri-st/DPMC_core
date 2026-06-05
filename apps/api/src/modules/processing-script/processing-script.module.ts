import { Module } from '@nestjs/common';
import { ProcessingScriptController } from './processing-script.controller';
import { ProcessingScriptService } from './processing-script.service';

@Module({
  imports: [],
  controllers: [ProcessingScriptController],
  providers: [ProcessingScriptService],
})
export class ProcessingScriptModule {}
