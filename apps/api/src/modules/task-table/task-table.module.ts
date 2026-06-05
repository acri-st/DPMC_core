import { Module } from '@nestjs/common';
import { TaskTableController } from './task-table.controller';
import { TaskTableService } from './task-table.service';

@Module({
  imports: [],
  controllers: [TaskTableController],
  providers: [TaskTableService],
})
export class TaskTableModule {}
