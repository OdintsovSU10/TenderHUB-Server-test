import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/auth.guard';
import { ImportsService } from './imports.service';

interface ImportBoqDto {
  tenderId: string;
  positionId: string;
}

@Controller('imports')
@UseGuards(SupabaseAuthGuard)
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  /**
   * POST /api/imports/boq
   * Upload and queue a BOQ import job
   *
   * Form data:
   * - file: Excel file (.xlsx)
   * - tenderId: UUID of the tender
   * - positionId: UUID of the position
   */
  @Post('boq')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit
      },
      fileFilter: (_req, file, callback) => {
        // Accept Excel files
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Only Excel files (.xlsx, .xls) are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async importBoq(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ImportBoqDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const user = req.user!;

    const jobId = await this.importsService.queueBoqImport(
      file.buffer,
      body.tenderId,
      body.positionId,
      user.id,
    );

    return {
      success: true,
      jobId,
      message: 'Import job queued successfully',
      fileName: file.originalname,
      fileSize: file.size,
    };
  }
}
