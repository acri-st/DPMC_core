import { Module } from '@nestjs/common';
import { ProductIngestionHookController } from './product-ingestion-hook.controller';
import { ProductIngestionHookService } from './product-ingestion-hook.service';

@Module({
  imports: [],
  controllers: [ProductIngestionHookController],
  providers: [ProductIngestionHookService],
  exports: [ProductIngestionHookService],
})
export class ProductIngestionHookModule {}
