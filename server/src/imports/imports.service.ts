import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ImportsService {
  constructor(
    private queueService: QueueService,
    private authService: AuthService,
  ) {}

  /**
   * Queue a BOQ import job
   * @param fileBuffer - Excel file as Buffer
   * @param tenderId - ID of the tender
   * @param positionId - ID of the position to import into
   * @param userId - ID of the requesting user
   * @returns Job ID for tracking
   */
  async queueBoqImport(
    fileBuffer: Buffer,
    tenderId: string,
    positionId: string,
    userId: string,
  ): Promise<string> {
    // Validate inputs
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('File is required');
    }

    if (!tenderId) {
      throw new BadRequestException('tenderId is required');
    }

    if (!positionId) {
      throw new BadRequestException('positionId is required');
    }

    // Verify user has access to this tender
    const hasAccess = await this.authService.checkTenderAccess(
      userId,
      tenderId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('No access to this tender');
    }

    // Verify position belongs to the tender
    const positionAccess = await this.authService.checkPositionAccess(
      userId,
      positionId,
    );

    if (!positionAccess) {
      throw new ForbiddenException('No access to this position');
    }

    // Add job to queue with base64 encoded file
    const jobId = await this.queueService.addImportJob({
      fileBuffer: fileBuffer.toString('base64'),
      tenderId,
      positionId,
      userId,
      createdAt: new Date().toISOString(),
    });

    return jobId;
  }
}
