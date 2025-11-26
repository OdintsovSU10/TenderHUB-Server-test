/**
 * Утилита экспорта затрат на строительство в Excel
 * Создает файл с двумя типами затрат (прямые и коммерческие) в одной таблице
 */

import * as XLSX from 'xlsx-js-style';
import dayjs from 'dayjs';
import { message } from 'antd';
import { supabase } from '../../../../lib/supabase';
import type { CostRow } from '../hooks/useCostData';

interface ExportParams {
  selectedTenderId: string;
  selectedTenderTitle: string;
  selectedVersion: number | null;
  costType: 'base' | 'commercial';
  filteredData: CostRow[];
}

interface OppositeCosts {
  materials: number;
  works: number;
  subMaterials: number;
  subWorks: number;
  materialsComp: number;
  worksComp: number;
}

/**
 * Получает данные для противоположного типа затрат
 */
async function fetchOppositeCosts(
  tenderId: string,
  currentCostType: 'base' | 'commercial'
): Promise<Map<string, OppositeCosts>> {
  const oppositeType = currentCostType === 'base' ? 'commercial' : 'base';

  const { data: oppositeBOQItems, error: oppError } = await supabase
    .from('boq_items')
    .select(`
      detail_cost_category_id,
      boq_item_type,
      ${oppositeType === 'base' ? 'total_amount' : 'total_commercial_material_cost, total_commercial_work_cost'},
      client_positions!inner(tender_id)
    `)
    .eq('client_positions.tender_id', tenderId);

  if (oppError) throw oppError;

  const oppositeCostMap = new Map<string, OppositeCosts>();

  (oppositeBOQItems || []).forEach((item: any) => {
    const catId = item.detail_cost_category_id;
    if (!catId) return;

    if (!oppositeCostMap.has(catId)) {
      oppositeCostMap.set(catId, {
        materials: 0,
        works: 0,
        subMaterials: 0,
        subWorks: 0,
        materialsComp: 0,
        worksComp: 0,
      });
    }

    const costs = oppositeCostMap.get(catId)!;

    if (oppositeType === 'base') {
      const amount = item.total_amount || 0;
      switch (item.boq_item_type) {
        case 'мат':
          costs.materials += amount;
          break;
        case 'суб-мат':
          costs.subMaterials += amount;
          break;
        case 'мат-комп.':
          costs.materialsComp += amount;
          break;
        case 'раб':
          costs.works += amount;
          break;
        case 'суб-раб':
          costs.subWorks += amount;
          break;
        case 'раб-комп.':
          costs.worksComp += amount;
          break;
      }
    } else {
      const materialCost = item.total_commercial_material_cost || 0;
      const workCost = item.total_commercial_work_cost || 0;

      switch (item.boq_item_type) {
        case 'мат':
          costs.materials += materialCost;
          break;
        case 'суб-мат':
          costs.subMaterials += materialCost;
          break;
        case 'мат-комп.':
          costs.materialsComp += materialCost;
          break;
        case 'раб':
          costs.works += workCost;
          break;
        case 'суб-раб':
          costs.subWorks += workCost;
          break;
        case 'раб-комп.':
          costs.worksComp += workCost;
          break;
      }
    }
  });

  return oppositeCostMap;
}

/**
 * Формирует данные для экспорта в Excel
 */
function buildExportData(
  filteredData: CostRow[],
  oppositeCostMap: Map<string, OppositeCosts>
): any[][] {
  const exportData: any[][] = [];

  // Заголовки
  exportData.push([
    'Затрата тендера',
    'Комментарий',
    'Объем',
    'Ед. изм.',
    'Прямые Затраты',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Коммерческие Затраты',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  exportData.push([
    '',
    '',
    '',
    '',
    'Работы',
    'Материалы',
    'Работы суб.',
    'Материал суб.',
    'Раб-комп.',
    'Мат-комп.',
    'Итого работ',
    'Итого материалы',
    'Итого',
    'Итого работ за ед.',
    'Итого материалы за ед.',
    'Итого за единицу',
    'Работы',
    'Материалы',
    'Работы суб.',
    'Материал суб.',
    'Раб-комп.',
    'Мат-комп.',
    'Итого работ',
    'Итого материалы',
    'Итого',
    'Итого работ за ед.',
    'Итого материалы за ед.',
    'Итого за единицу',
  ]);

  let categoryIndex = 1;

  filteredData.forEach((category) => {
    if (category.is_category && category.total_cost > 0) {
      const catNum = String(categoryIndex).padStart(2, '0');
      const categoryTotalVolume =
        category.children?.reduce((sum, c) => sum + (c.volume || 0), 0) || 0;
      const categoryTotalWorks =
        category.works_cost + category.sub_works_cost + category.works_comp_cost;
      const categoryTotalMaterials =
        category.materials_cost +
        category.sub_materials_cost +
        category.materials_comp_cost;

      // Суммируем противоположные затраты для категории
      let oppCatWorks = 0,
        oppCatMaterials = 0,
        oppCatSubWorks = 0,
        oppCatSubMaterials = 0,
        oppCatWorksComp = 0,
        oppCatMaterialsComp = 0;

      category.children?.forEach((child) => {
        if (child.detail_cost_category_id) {
          const oppCosts = oppositeCostMap.get(child.detail_cost_category_id);
          if (oppCosts) {
            oppCatWorks += oppCosts.works;
            oppCatMaterials += oppCosts.materials;
            oppCatSubWorks += oppCosts.subWorks;
            oppCatSubMaterials += oppCosts.subMaterials;
            oppCatWorksComp += oppCosts.worksComp;
            oppCatMaterialsComp += oppCosts.materialsComp;
          }
        }
      });

      const oppCatTotalWorks = oppCatWorks + oppCatSubWorks + oppCatWorksComp;
      const oppCatTotalMaterials =
        oppCatMaterials + oppCatSubMaterials + oppCatMaterialsComp;
      const oppCatTotal = oppCatTotalWorks + oppCatTotalMaterials;

      // Строка категории
      exportData.push([
        `${catNum}. ${category.cost_category_name.toUpperCase()}`,
        '',
        categoryTotalVolume,
        category.children?.[0]?.unit || 'м2',
        category.works_cost,
        category.materials_cost,
        category.sub_works_cost,
        category.sub_materials_cost,
        category.works_comp_cost,
        category.materials_comp_cost,
        categoryTotalWorks,
        categoryTotalMaterials,
        category.total_cost,
        categoryTotalVolume ? categoryTotalWorks / categoryTotalVolume : '',
        categoryTotalVolume ? categoryTotalMaterials / categoryTotalVolume : '',
        categoryTotalVolume ? category.total_cost / categoryTotalVolume : '',
        oppCatWorks,
        oppCatMaterials,
        oppCatSubWorks,
        oppCatSubMaterials,
        oppCatWorksComp,
        oppCatMaterialsComp,
        oppCatTotalWorks,
        oppCatTotalMaterials,
        oppCatTotal,
        categoryTotalVolume ? oppCatTotalWorks / categoryTotalVolume : '',
        categoryTotalVolume ? oppCatTotalMaterials / categoryTotalVolume : '',
        categoryTotalVolume ? oppCatTotal / categoryTotalVolume : '',
      ]);

      // Строки деталей
      let detailIndex = 1;
      category.children?.forEach((detail) => {
        if (detail.total_cost > 0) {
          const detailNum = `${catNum}.${String(detailIndex).padStart(2, '0')}.`;
          const detailTotalWorks =
            detail.works_cost + detail.sub_works_cost + detail.works_comp_cost;
          const detailTotalMaterials =
            detail.materials_cost +
            detail.sub_materials_cost +
            detail.materials_comp_cost;

          const oppDetailCosts = oppositeCostMap.get(
            detail.detail_cost_category_id || ''
          ) || {
            materials: 0,
            works: 0,
            subMaterials: 0,
            subWorks: 0,
            materialsComp: 0,
            worksComp: 0,
          };

          const oppDetailTotalWorks =
            oppDetailCosts.works +
            oppDetailCosts.subWorks +
            oppDetailCosts.worksComp;
          const oppDetailTotalMaterials =
            oppDetailCosts.materials +
            oppDetailCosts.subMaterials +
            oppDetailCosts.materialsComp;
          const oppDetailTotal = oppDetailTotalWorks + oppDetailTotalMaterials;

          exportData.push([
            `${detailNum} ${detail.detail_category_name}`,
            '',
            detail.volume || '',
            detail.unit || '',
            detail.works_cost || '',
            detail.materials_cost || '',
            detail.sub_works_cost || '',
            detail.sub_materials_cost || '',
            detail.works_comp_cost || '',
            detail.materials_comp_cost || '',
            detailTotalWorks || '',
            detailTotalMaterials || '',
            detail.total_cost || '',
            detail.volume ? detailTotalWorks / detail.volume : '',
            detail.volume ? detailTotalMaterials / detail.volume : '',
            detail.volume ? detail.total_cost / detail.volume : '',
            oppDetailCosts.works || '',
            oppDetailCosts.materials || '',
            oppDetailCosts.subWorks || '',
            oppDetailCosts.subMaterials || '',
            oppDetailCosts.worksComp || '',
            oppDetailCosts.materialsComp || '',
            oppDetailTotalWorks || '',
            oppDetailTotalMaterials || '',
            oppDetailTotal || '',
            detail.volume ? oppDetailTotalWorks / detail.volume : '',
            detail.volume ? oppDetailTotalMaterials / detail.volume : '',
            detail.volume ? oppDetailTotal / detail.volume : '',
          ]);

          detailIndex++;
        }
      });

      categoryIndex++;
    }
  });

  return exportData;
}

/**
 * Настройка стилей и структуры листа Excel
 */
function configureWorksheet(ws: XLSX.WorkSheet): void {
  // Ширина колонок
  ws['!cols'] = [
    { wch: 50 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
  ];

  // Объединение ячеек в заголовке
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Затрата тендера
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Комментарий
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Объем
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // Ед. изм.
    { s: { r: 0, c: 4 }, e: { r: 0, c: 15 } }, // Прямые Затраты
    { s: { r: 0, c: 16 }, e: { r: 0, c: 27 } }, // Коммерческие Затраты
  ];
}

/**
 * Основная функция экспорта затрат в Excel
 */
export async function exportConstructionCostToExcel(
  params: ExportParams
): Promise<void> {
  const {
    selectedTenderId,
    selectedTenderTitle,
    selectedVersion,
    costType,
    filteredData,
  } = params;

  if (!selectedTenderId || !selectedTenderTitle) {
    message.warning('Выберите тендер для экспорта');
    return;
  }

  try {
    // Получаем данные для противоположного типа затрат
    const oppositeCostMap = await fetchOppositeCosts(selectedTenderId, costType);

    // Формируем данные для экспорта
    const exportData = buildExportData(filteredData, oppositeCostMap);

    // Создаем рабочую книгу и лист
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Настраиваем стили и структуру
    configureWorksheet(ws);

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'Затраты');

    // Формируем имя файла
    const costTypeLabel = costType === 'base' ? 'Прямые' : 'Коммерческие';
    const fileName = `Затраты_${selectedTenderTitle}_v${selectedVersion || 1}_${costTypeLabel}_${dayjs().format('DD-MM-YYYY')}.xlsx`;

    // Экспортируем файл
    XLSX.writeFile(wb, fileName);
    message.success('Файл успешно экспортирован');
  } catch (error: any) {
    console.error('Ошибка экспорта:', error);
    message.error('Ошибка экспорта: ' + error.message);
  }
}
