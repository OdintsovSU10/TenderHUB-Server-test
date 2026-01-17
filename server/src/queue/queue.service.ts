import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExportJobData } from './processors/export.processor';
import { ImportJobData } from './processors/import.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('exports') private exportsQueue: Queue,
    @InjectQueue('imports') private importsQueue: Queue,
  ) {}

  /**
   * Add tender export job to queue
   */
  async addExportJob(data: ExportJobData): Promise<string> {
    const job = await this.exportsQueue.add('tender-export', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 3600, // Keep for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });

    return job.id || '';
  }

  /**
   * Add BOQ import job to queue
   */
  async addImportJob(data: ImportJobData): Promise<string> {
    const job = await this.importsQueue.add('boq-import', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
    });

    return job.id || '';
  }

  /**
   * Get job by ID from either queue
   */
  async getJob(jobId: string) {
    // Try exports queue first
    let job = await this.exportsQueue.getJob(jobId);

    if (!job) {
      // Try imports queue
      job = await this.importsQueue.getJob(jobId);
    }

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    const job = await this.getJob(jobId);

    if (!job) {
      return { found: false };
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      found: true,
      jobId: job.id,
      state,
      progress,
      result: state === 'completed' ? result : null,
      error: state === 'failed' ? failedReason : null,
    };
  }
}
