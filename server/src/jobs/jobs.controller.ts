import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/auth.guard';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(SupabaseAuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  /**
   * GET /api/jobs/:id/status
   * Get the status of a background job
   *
   * Response:
   * - found: boolean
   * - jobId: string
   * - state: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed'
   * - progress: number (0-100)
   * - result: object | null (when completed)
   * - error: string | null (when failed)
   */
  @Get(':id/status')
  async getJobStatus(@Param('id') jobId: string) {
    return this.jobsService.getJobStatus(jobId);
  }
}
