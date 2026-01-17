import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/auth.guard';
import { ExportsService } from './exports.service';

@Controller('exports')
@UseGuards(SupabaseAuthGuard)
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  /**
   * POST /api/exports/tender/:id
   * Queue a tender export job
   */
  @Post('tender/:id')
  async exportTender(@Param('id') tenderId: string, @Req() req: Request) {
    const user = req.user!;

    const jobId = await this.exportsService.queueTenderExport(
      tenderId,
      user.id,
    );

    return {
      success: true,
      jobId,
      message: 'Export job queued successfully',
    };
  }
}
