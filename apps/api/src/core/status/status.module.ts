import { Module } from '@nestjs/common';
import { SchedulerModule } from '@/modules/scheduler/scheduler.module';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

@Module({
  imports: [SchedulerModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
