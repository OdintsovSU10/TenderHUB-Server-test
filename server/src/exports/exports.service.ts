import { Injectable, ForbiddenException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ExportsService {
  constructor(
    private queueService: QueueService,
    private authService: AuthService,
  ) {}

  /**
   * Queue a tender export job
   * @param tenderId - ID of the tender to export
   * @param userId - ID of the requesting user
   * @returns Job ID for tracking
   */
  async queueTenderExport(tenderId: string, userId: string): Promise<string> {
    // Verify user has access to this tender
    const hasAccess = await this.authService.checkTenderAccess(
      userId,
      tenderId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('No access to this tender');
    }

    // Add job to queue
    const jobId = await this.queueService.addExportJob({
      tenderId,
      userId,
      createdAt: new Date().toISOString(),
    });

    return jobId;
  }
}
