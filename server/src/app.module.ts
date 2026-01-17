import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { QueueModule } from './queue/queue.module';
import { ExportsModule } from './exports/exports.module';
import { ImportsModule } from './imports/imports.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // BullMQ with Redis
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Application modules
    SupabaseModule,
    AuthModule,
    QueueModule,
    ExportsModule,
    ImportsModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
