import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
