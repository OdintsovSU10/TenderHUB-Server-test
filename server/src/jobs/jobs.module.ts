import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
