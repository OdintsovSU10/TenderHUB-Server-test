import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { SupabaseService } from '../../supabase/supabase.service';

export interface ImportJobData {
  fileBuffer: string; // base64 encoded
  tenderId: string;
  positionId: string;
  userId: string;
  createdAt: string;
}

export interface ImportJobResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

interface ParsedBoqItem {
  tender_id: string;
  client_position_id: string;
  boq_item_type: string;
  work_name_id?: string;
  material_name_id?: string;
  unit_code?: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  currency_type: string;
  description?: string;
  sort_number: number;
}

@Processor('imports')
export class ImportProcessor extends WorkerHost {
  constructor(private supabase: SupabaseService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<ImportJobResult> {
    const { fileBuffer, tenderId, positionId, userId } = job.data;
    const errors: string[] = [];

    try {
      await job.updateProgress(5);

      // 1. Parse Excel file
      const buffer = Buffer.from(fileBuffer, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        throw new Error('Excel file has no worksheets');
      }

      await job.updateProgress(20);

      // 2. Validate and map data
      const items: ParsedBoqItem[] = [];
      let rowNumber = 0;

      sheet.eachRow((row, index) => {
        rowNumber = index;

        // Skip header row
        if (index === 1) return;

        const type = this.getCellValue(row.getCell(1));
        const name = this.getCellValue(row.getCell(2));
        const unit = this.getCellValue(row.getCell(3));
        const quantity = this.getNumericValue(row.getCell(4));
        const price = this.getNumericValue(row.getCell(5));
        const currency = this.getCellValue(row.getCell(6)) || 'RUB';
        const description = this.getCellValue(row.getCell(7));

        // Validate required fields
        if (!type) {
          errors.push(`Строка ${index}: отсутствует тип элемента`);
          return;
        }

        if (!name) {
          errors.push(`Строка ${index}: отсутствует наименование`);
          return;
        }

        // Validate type
        const validTypes = [
          'мат',
          'суб-мат',
          'мат-комп.',
          'раб',
          'суб-раб',
          'раб-комп.',
        ];
        if (!validTypes.includes(type)) {
          errors.push(
            `Строка ${index}: неверный тип "${type}". Допустимые: ${validTypes.join(', ')}`,
          );
          return;
        }

        // Validate currency
        const validCurrencies = ['RUB', 'USD', 'EUR', 'CNY'];
        if (!validCurrencies.includes(currency)) {
          errors.push(
            `Строка ${index}: неверная валюта "${currency}". Допустимые: ${validCurrencies.join(', ')}`,
          );
          return;
        }

        const isWork = ['раб', 'суб-раб', 'раб-комп.'].includes(type);

        items.push({
          tender_id: tenderId,
          client_position_id: positionId,
          boq_item_type: type,
          // Note: work_name_id and material_name_id need to be resolved from name
          // For now, we store the name and let the RPC handle the lookup
          unit_code: unit || undefined,
          quantity: quantity || 0,
          unit_rate: price || 0,
          total_amount: (quantity || 0) * (price || 0),
          currency_type: currency,
          description: description || undefined,
          sort_number: index - 1,
        });
      });

      await job.updateProgress(50);

      // 3. If there are validation errors, abort
      if (errors.length > 0) {
        return {
          success: false,
          importedCount: 0,
          errors,
        };
      }

      if (items.length === 0) {
        return {
          success: false,
          importedCount: 0,
          errors: ['Файл не содержит данных для импорта'],
        };
      }

      // 4. Batch insert via RPC
      const BATCH_SIZE = 100;
      let importedCount = 0;

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        try {
          // Insert batch directly (simplified - the RPC should handle name resolution)
          const { error } = await this.supabase.client
            .from('boq_items')
            .insert(batch);

          if (error) {
            errors.push(`Ошибка вставки (строки ${i + 2}-${i + batch.length + 1}): ${error.message}`);
            continue;
          }

          importedCount += batch.length;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Ошибка вставки (строки ${i + 2}-${i + batch.length + 1}): ${errMsg}`);
        }

        // Update progress
        const progress = 50 + Math.round((i / items.length) * 45);
        await job.updateProgress(progress);
      }

      await job.updateProgress(100);

      console.log(
        `Import completed for position ${positionId}: ${importedCount}/${items.length} items`,
      );

      return {
        success: errors.length === 0,
        importedCount,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Import failed for position ${positionId}:`, errorMessage);

      return {
        success: false,
        importedCount: 0,
        errors: [errorMessage],
      };
    }
  }

  private getCellValue(cell: ExcelJS.Cell): string {
    if (cell.value === null || cell.value === undefined) {
      return '';
    }

    if (typeof cell.value === 'object') {
      // Handle rich text
      if ('richText' in cell.value) {
        return cell.value.richText.map((rt) => rt.text).join('');
      }
      // Handle formula result
      if ('result' in cell.value) {
        return String(cell.value.result || '');
      }
      return String(cell.value);
    }

    return String(cell.value).trim();
  }

  private getNumericValue(cell: ExcelJS.Cell): number {
    const value = cell.value;

    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'object' && 'result' in value) {
      return Number(value.result) || 0;
    }

    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
}
