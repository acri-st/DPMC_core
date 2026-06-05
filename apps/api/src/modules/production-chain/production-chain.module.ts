import { Module } from '@nestjs/common';
import { EdgesModule } from './edges/edges.module';
import { ProcessingChainsModule } from './processing-chains/processing-chains.module';
import { ProductionChainController } from './production-chain.controller';
import { ProductionChainService } from './production-chain.service';
import { TaskTableService } from '@/modules/task-table/task-table.service';

@Module({
  imports: [EdgesModule, ProcessingChainsModule],
  controllers: [ProductionChainController],
  providers: [ProductionChainService, TaskTableService],
  exports: [ProductionChainService],
})
export class ProductionChainModule {}
