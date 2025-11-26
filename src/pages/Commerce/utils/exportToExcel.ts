/**
 * Экспорт данных коммерции в Excel
 */

import { message } from 'antd';
import * as XLSX from 'xlsx';
import type { Tender } from '../../../lib/supabase';
import type { PositionWithCommercialCost } from '../types';

export function exportCommerceToExcel(
  positions: PositionWithCommercialCost[],
  selectedTender: Tender | undefined
) {
  if (positions.length === 0) {
    message.warning('Нет данных для экспорта');
    return;
  }

  // Подготавливаем данные для экспорта
  const exportData = positions.map(pos => ({
    'Номер позиции': pos.position_number,
    'Название': pos.work_name,
    'Примечание клиента': pos.client_note || '',
    'Единица': pos.unit_code || '',
    'Количество (ГП)': pos.manual_volume || 0,
    'Кол-во элементов': pos.items_count || 0,
    'Базовая стоимость': pos.base_total || 0,
    'Итого материалов (КП), руб': pos.material_cost_total || 0,
    'Итого работ (КП), руб': pos.work_cost_total || 0,
    'Коммерческая стоимость': pos.commercial_total || 0,
    'За единицу (база)': pos.manual_volume && pos.manual_volume > 0 ? (pos.base_total || 0) / pos.manual_volume : 0,
    'За единицу (коммерч.)': pos.manual_volume && pos.manual_volume > 0 ? (pos.commercial_total || 0) / pos.manual_volume : 0,
    'За единицу материалов': pos.manual_volume && pos.manual_volume > 0 ? (pos.material_cost_total || 0) / pos.manual_volume : 0,
    'За единицу работ': pos.manual_volume && pos.manual_volume > 0 ? (pos.work_cost_total || 0) / pos.manual_volume : 0,
  }));

  // Добавляем итоговую строку
  const totalBase = positions.reduce((sum, pos) => sum + (pos.base_total || 0), 0);
  const totalMaterials = positions.reduce((sum, pos) => sum + (pos.material_cost_total || 0), 0);
  const totalWorks = positions.reduce((sum, pos) => sum + (pos.work_cost_total || 0), 0);
  const totalCommercial = positions.reduce((sum, pos) => sum + (pos.commercial_total || 0), 0);
  const avgMarkup = totalBase > 0 ? ((totalCommercial - totalBase) / totalBase) * 100 : 0;

  exportData.push({
    'Номер позиции': 0,
    'Название': 'ИТОГО',
    'Примечание клиента': '',
    'Единица': '',
    'Количество (ГП)': positions.reduce((sum, pos) => sum + (pos.manual_volume || 0), 0),
    'Кол-во элементов': positions.reduce((sum, pos) => sum + (pos.items_count || 0), 0),
    'Базовая стоимость': totalBase,
    'Итого материалов (КП), руб': totalMaterials,
    'Итого работ (КП), руб': totalWorks,
    'Коммерческая стоимость': totalCommercial,
    'За единицу (база)': Number(avgMarkup.toFixed(2)),
    'За единицу (коммерч.)': 0,
    'За единицу материалов': 0,
    'За единицу работ': 0,
  });

  // Создаем книгу Excel
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Коммерческие стоимости');

  // Устанавливаем ширину колонок
  ws['!cols'] = [
    { wch: 15 }, // Номер позиции
    { wch: 30 }, // Название
    { wch: 40 }, // Описание
    { wch: 10 }, // Единица
    { wch: 12 }, // Количество
    { wch: 15 }, // Кол-во элементов
    { wch: 18 }, // Базовая стоимость
    { wch: 20 }, // Коммерческая стоимость
    { wch: 12 }, // Наценка, %
    { wch: 18 }, // За единицу (база)
    { wch: 20 }, // За единицу (коммерч.)
  ];

  // Сохраняем файл
  const fileName = `Коммерция_${selectedTender?.tender_number || 'тендер'}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
  XLSX.writeFile(wb, fileName);

  message.success(`Данные экспортированы в файл ${fileName}`);
}
