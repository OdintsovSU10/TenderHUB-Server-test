/**
 * Адаптер умного округления для страницы CostRedistribution
 * Использует общую утилиту из @/utils/rounding
 */

import type { ResultRow } from '../components/Results/ResultsTableColumns';
import { smartRound } from '../../../utils/rounding';

/**
 * Применяет умное округление к результатам перераспределения
 */
export function smartRoundResults(results: ResultRow[]): ResultRow[] {
  return smartRound(
    results,
    {
      getQuantity: (row) => row.quantity || 0,
      getMaterialTotal: (row) => row.total_materials || 0,
      getWorkTotal: (row) => row.total_works_after || 0,
    },
    { debug: true }
  ).map((result) => ({
    ...result,
    // Маппинг полей для обратной совместимости
    rounded_work_unit_price_after: result.rounded_work_unit_price,
    rounded_total_materials: result.rounded_material_total,
    rounded_total_works: result.rounded_work_total,
  })) as ResultRow[];
}

// Re-export для обратной совместимости
export { roundTo5 } from '../../../utils/rounding';

