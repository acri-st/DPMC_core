import { WorkerTokenGuard } from '@/common/guards/worker-token.guard';
import { Module } from '@nestjs/common';
import { TaskModule } from '@/modules/task/task.module';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [TaskModule],
  controllers: [WorkerController],
  providers: [WorkerService, WorkerTokenGuard],
  exports: [WorkerService],
})
export class WorkerModule {}
