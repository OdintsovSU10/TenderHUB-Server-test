import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'exports' },
      { name: 'imports' },
    ),
  ],
  providers: [ExportProcessor, ImportProcessor, QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
