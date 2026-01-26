/**
 * Фикстуры параметров наценок для тестов
 */

/**
 * Стандартные параметры наценок (production-like)
 */
export const STANDARD_MARKUP_PARAMETERS = new Map<string, number>([
  ['material_cost_growth', 10],
  ['works_cost_growth', 10],
  ['subcontract_works_cost_growth', 10],
  ['subcontract_materials_cost_growth', 10],
  ['mechanization_service', 5],
  ['mbp_gsm', 5],
  ['warranty_period', 5],
  ['works_16_markup', 60],
  ['contingency_costs', 3],
  ['overhead_own_forces', 10],
  ['overhead_subcontract', 10],
  ['general_costs_without_subcontract', 20],
  ['profit_own_forces', 10],
  ['profit_subcontract', 16],
  ['nds_22', 22],
]);

/**
 * Минимальные параметры для простых тестов
 */
export const MINIMAL_MARKUP_PARAMETERS = new Map<string, number>([
  ['material_cost_growth', 10],
  ['nds_22', 22],
]);

/**
 * Параметры с нулевыми значениями
 */
export const ZERO_MARKUP_PARAMETERS = new Map<string, number>([
  ['material_cost_growth', 0],
  ['works_cost_growth', 0],
  ['nds_22', 0],
]);

/**
 * Параметры с большими значениями (edge case)
 */
export const HIGH_MARKUP_PARAMETERS = new Map<string, number>([
  ['material_cost_growth', 100],
  ['works_cost_growth', 100],
  ['nds_22', 50],
]);

/**
 * Создает Map параметров из объекта
 */
export function createMarkupParameters(params: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(params));
}
