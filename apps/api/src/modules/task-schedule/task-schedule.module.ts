import { Module } from '@nestjs/common';
import { TaskModule } from '@/modules/task/task.module';
import { TaskScheduleController } from './task-schedule.controller';
import { TaskScheduleScheduler } from './task-schedule.scheduler';
import { TaskScheduleService } from './task-schedule.service';

@Module({
  imports: [TaskModule],
  controllers: [TaskScheduleController],
  providers: [TaskScheduleService, TaskScheduleScheduler],
  exports: [TaskScheduleService],
})
export class TaskScheduleModule {}
