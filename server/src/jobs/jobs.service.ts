import { Injectable, NotFoundException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';

export interface JobStatus {
  found: boolean;
  jobId?: string;
  state?: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed' | 'paused';
  progress?: number;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

@Injectable()
export class JobsService {
  constructor(private queueService: QueueService) {}

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const status = await this.queueService.getJobStatus(jobId);

    if (!status.found) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return status;
  }
}
