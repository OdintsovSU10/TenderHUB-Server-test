import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { SupabaseService } from '../../supabase/supabase.service';

export interface ExportJobData {
  tenderId: string;
  userId: string;
  createdAt: string;
}

export interface ExportJobResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

@Processor('exports')
export class ExportProcessor extends WorkerHost {
  constructor(private supabase: SupabaseService) {
    super();
  }

  async process(job: Job<ExportJobData>): Promise<ExportJobResult> {
    const { tenderId, userId } = job.data;

    try {
      await job.updateProgress(5);

      // 1. Load tender data
      const tender = await this.supabase.getTender(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }

      await job.updateProgress(15);

      // 2. Load positions
      const positions = await this.supabase.getPositionsByTender(tenderId);

      await job.updateProgress(30);

      // 3. Load BOQ items
      const boqItems = await this.supabase.getBoqItemsByTender(tenderId);

      await job.updateProgress(50);

      // 4. Generate Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'HUBTender';
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Сводка');
      this.createSummarySheet(summarySheet, tender, positions, boqItems);

      await job.updateProgress(60);

      // Sheet 2: BOQ Items
      const boqSheet = workbook.addWorksheet('BOQ');
      this.createBoqSheet(boqSheet, positions, boqItems);

      await job.updateProgress(75);

      // 5. Write to buffer
      const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

      await job.updateProgress(85);

      // 6. Upload to Supabase Storage
      const timestamp = Date.now();
      const fileName = `exports/${tenderId}/${timestamp}_tender_export.xlsx`;

      const fileUrl = await this.supabase.uploadFile(
        'tender-exports',
        fileName,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      await job.updateProgress(100);

      console.log(`Export completed for tender ${tenderId} by user ${userId}`);

      return {
        success: true,
        fileUrl,
        fileName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Export failed for tender ${tenderId}:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private createSummarySheet(
    sheet: ExcelJS.Worksheet,
    tender: Record<string, unknown>,
    positions: Record<string, unknown>[],
    boqItems: Record<string, unknown>[],
  ) {
    // Title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Тендер: ${tender.name || 'Без названия'}`;
    titleCell.font = { bold: true, size: 16 };

    // Stats
    sheet.getCell('A3').value = 'Всего позиций:';
    sheet.getCell('B3').value = positions.length;

    sheet.getCell('A4').value = 'Всего элементов BOQ:';
    sheet.getCell('B4').value = boqItems.length;

    const workItems = boqItems.filter((item) =>
      ['раб', 'суб-раб', 'раб-комп.'].includes(item.boq_item_type as string),
    );
    const materialItems = boqItems.filter((item) =>
      ['мат', 'суб-мат', 'мат-комп.'].includes(item.boq_item_type as string),
    );

    sheet.getCell('A5').value = 'Работы:';
    sheet.getCell('B5').value = workItems.length;

    sheet.getCell('A6').value = 'Материалы:';
    sheet.getCell('B6').value = materialItems.length;

    // Currency rates
    sheet.getCell('A8').value = 'Курсы валют:';
    sheet.getCell('A9').value = 'USD:';
    sheet.getCell('B9').value = (tender.usd_rate as number) || 0;
    sheet.getCell('A10').value = 'EUR:';
    sheet.getCell('B10').value = (tender.eur_rate as number) || 0;
    sheet.getCell('A11').value = 'CNY:';
    sheet.getCell('B11').value = (tender.cny_rate as number) || 0;

    // Column widths
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 15;
  }

  private createBoqSheet(
    sheet: ExcelJS.Worksheet,
    positions: Record<string, unknown>[],
    boqItems: Record<string, unknown>[],
  ) {
    // Create position map for lookup
    const positionMap = new Map(
      positions.map((p) => [p.id as string, p]),
    );

    // Headers
    const headers = [
      'Позиция',
      'Тип',
      'Наименование',
      'Ед.изм.',
      'Кол-во',
      'Валюта',
      'Цена за ед.',
      'Сумма (РУБ)',
      'Затрата',
      'Примечание',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    headerRow.alignment = { horizontal: 'center' };

    // Data rows
    for (const item of boqItems) {
      const position = positionMap.get(item.client_position_id as string);
      const positionNumber = (position?.position_number as string) || '-';

      const isWork = ['раб', 'суб-раб', 'раб-комп.'].includes(
        item.boq_item_type as string,
      );

      // Get name from joined data
      let itemName = '-';
      if (isWork && item.work_names) {
        itemName = (item.work_names as Record<string, string>).name || '-';
      } else if (!isWork && item.material_names) {
        itemName = (item.material_names as Record<string, string>).name || '-';
      }

      // Get cost category
      let costCategory = '-';
      if (item.detail_cost_categories) {
        const dcc = item.detail_cost_categories as Record<string, unknown>;
        const cc = dcc.cost_categories as Record<string, string> | undefined;
        costCategory = `${cc?.name || ''} / ${dcc.name || ''} / ${dcc.location || ''}`;
      }

      const row = sheet.addRow([
        positionNumber,
        item.boq_item_type,
        itemName,
        item.unit_code || '-',
        item.quantity || 0,
        item.currency_type || 'RUB',
        item.unit_rate || 0,
        item.total_amount || 0,
        costCategory,
        item.description || '',
      ]);

      // Color code by type
      if (isWork) {
        row.getCell(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' }, // Orange tint for works
        };
      } else {
        row.getCell(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' }, // Blue tint for materials
        };
      }
    }

    // Column widths
    sheet.getColumn(1).width = 15; // Position
    sheet.getColumn(2).width = 12; // Type
    sheet.getColumn(3).width = 50; // Name
    sheet.getColumn(4).width = 10; // Unit
    sheet.getColumn(5).width = 12; // Quantity
    sheet.getColumn(6).width = 10; // Currency
    sheet.getColumn(7).width = 15; // Unit rate
    sheet.getColumn(8).width = 15; // Total
    sheet.getColumn(9).width = 40; // Cost category
    sheet.getColumn(10).width = 30; // Description

    // Number formatting
    sheet.getColumn(5).numFmt = '#,##0.00000';
    sheet.getColumn(7).numFmt = '#,##0.00';
    sheet.getColumn(8).numFmt = '#,##0.00';

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
}
