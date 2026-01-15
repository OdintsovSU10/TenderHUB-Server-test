/**
 * Адаптер умного округления для страницы Commerce
 * Использует общую утилиту из @/utils/rounding
 */

import type { PositionWithCommercialCost } from '../types';
import { smartRound } from '../../../utils/rounding';

export interface RoundedPosition extends PositionWithCommercialCost {
  rounded_material_unit_price?: number;
  rounded_work_unit_price?: number;
  rounded_material_cost_total?: number;
  rounded_work_cost_total?: number;
}

/**
 * Применяет умное округление к позициям с коммерческими стоимостями
 */
export function smartRoundPositions(positions: PositionWithCommercialCost[]): RoundedPosition[] {
  return smartRound(
    positions,
    {
      getQuantity: (pos) => pos.manual_volume || 0,
      getMaterialTotal: (pos) => pos.material_cost_total || 0,
      getWorkTotal: (pos) => pos.work_cost_total || 0,
    },
    { debug: true }
  ).map((result) => ({
    ...result,
    // Маппинг полей для обратной совместимости
    rounded_material_cost_total: result.rounded_material_total,
    rounded_work_cost_total: result.rounded_work_total,
  })) as RoundedPosition[];
}

// Re-export для обратной совместимости
export { roundTo5 } from '../../../utils/rounding';
