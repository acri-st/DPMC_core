import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskScheduleService } from './task-schedule.service';

/**
 * Every minute, turns due TaskSchedules into Queued Tasks. The created tasks
 * join the existing dispatcher pipeline (task_tick → expand → Running).
 */
@Injectable()
export class TaskScheduleScheduler {
  private readonly logger = new Logger(TaskScheduleScheduler.name);

  constructor(private readonly schedules: TaskScheduleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const created = await this.schedules.runDue(new Date());
    if (created > 0) {
      this.logger.log(`Created ${created} task(s) from schedules`);
    }
  }
}
