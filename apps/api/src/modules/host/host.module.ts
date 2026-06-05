import { WorkerTokenGuard } from '@/common/guards/worker-token.guard';
import { Module } from '@nestjs/common';
import { HostController } from './host.controller';
import { HostScheduler } from './host.scheduler';
import { HostService } from './host.service';

@Module({
  imports: [],
  controllers: [HostController],
  providers: [HostService, HostScheduler, WorkerTokenGuard],
  exports: [HostService],
})
export class HostModule {}
