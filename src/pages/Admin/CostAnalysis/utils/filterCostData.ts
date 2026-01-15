/**
 * Утилита для фильтрации данных затрат
 * Рекурсивная фильтрация с пересчетом итогов категорий
 */

import type { CostRow } from '../hooks/useCostData';

/**
 * Рекурсивная фильтрация строк с пересчетом итогов категорий
 */
export function filterCostRow(row: CostRow, searchText: string): CostRow | null {
  // Если это категория, фильтруем детей
  if (row.is_category && row.children) {
    const filteredChildren = row.children
      .map((child) => filterCostRow(child, searchText))
      .filter((child): child is CostRow => child !== null);

    // Если нет детей после фильтрации, скрываем категорию
    if (filteredChildren.length === 0) {
      return null;
    }

    // Пересчитываем итоги категории на основе отфильтрованных детей
    const categoryTotals = filteredChildren.reduce(
      (acc, child) => ({
        materials: acc.materials + child.materials_cost,
        works: acc.works + child.works_cost,
        subMaterials: acc.subMaterials + child.sub_materials_cost,
        subWorks: acc.subWorks + child.sub_works_cost,
        materialsComp: acc.materialsComp + child.materials_comp_cost,
        worksComp: acc.worksComp + child.works_comp_cost,
        total: acc.total + child.total_cost,
      }),
      {
        materials: 0,
        works: 0,
        subMaterials: 0,
        subWorks: 0,
        materialsComp: 0,
        worksComp: 0,
        total: 0,
      }
    );

    return {
      ...row,
      children: filteredChildren,
      materials_cost: categoryTotals.materials,
      works_cost: categoryTotals.works,
      sub_materials_cost: categoryTotals.subMaterials,
      sub_works_cost: categoryTotals.subWorks,
      materials_comp_cost: categoryTotals.materialsComp,
      works_comp_cost: categoryTotals.worksComp,
      total_cost: categoryTotals.total,
    };
  }

  // Если есть поисковый запрос, проверяем совпадение
  if (searchText) {
    const searchLower = searchText.toLowerCase();
    if (
      !row.cost_category_name.toLowerCase().includes(searchLower) &&
      !row.detail_category_name.toLowerCase().includes(searchLower) &&
      !row.location_name.toLowerCase().includes(searchLower)
    ) {
      return null;
    }
  }

  return row;
}

/**
 * Фильтрация массива данных затрат
 */
export function filterCostData(data: CostRow[], searchText: string): CostRow[] {
  return data
    .map((row) => filterCostRow(row, searchText))
    .filter((row): row is CostRow => row !== null);
}
