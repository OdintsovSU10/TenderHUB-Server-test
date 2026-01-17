import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
