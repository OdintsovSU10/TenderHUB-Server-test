/**
 * Сервис агрегации наценок по параметрам
 * Вычисляет суммы наценок по каждому параметру для всех BOQ элементов тендера
 */

import type { BoqItem, MarkupStep } from '../../lib/supabase';
import {
  calculateMarkupResult,
  type CalculationContext,
  type StepDetail
} from '../../utils/markupCalculator';
import { filterSequenceForExclusions, type SubcontractGrowthExclusions } from './calculation';
import { logger } from '../../utils/debug';

/**
 * Агрегированные данные по одному параметру наценки
 */
export interface ParameterMarkupAggregate {
  parameterKey: string;        // Ключ параметра (overhead_subcontract, material_cost_growth и т.д.)
  parameterLabel?: string;     // Человекочитаемое название параметра
  totalMarkupAmount: number;   // Сумма наценок по всем элементам
  itemCount: number;           // Количество элементов, к которым применён параметр
  stepsCount: number;          // Общее количество шагов расчёта
  byItemType: Map<string, number>; // Разбивка по типам элементов (мат, раб, суб-раб и т.д.)
}

/**
 * Полный результат агрегации наценок по тендеру
 */
export interface TenderMarkupAggregation {
  // Агрегация по параметрам наценок
  byParameter: Map<string, ParameterMarkupAggregate>;

  // Общие суммы по типам элементов
  directCosts: {
    subcontractWorks: number;
    subcontractMaterials: number;
    works: number;
    materials: number;
    worksComp: number;
    materialsComp: number;
    total: number;
  };

  // Итоговые суммы
  totalBaseAmount: number;
  totalCommercialCost: number;
  totalMarkupAmount: number;

  // Детализация по элементам (опционально, для отладки)
  itemDetails?: ItemMarkupDetail[];
}

/**
 * Детализация расчёта для одного элемента
 */
export interface ItemMarkupDetail {
  itemId: string;
  boqItemType: string;
  baseAmount: number;
  commercialCost: number;
  stepDetails: StepDetail[];
}

/**
 * Интерфейс тактики наценок
 */
interface MarkupTactic {
  sequences: Record<string, MarkupStep[]>;
  base_costs?: Record<string, number>;
}

/**
 * Проверяет, исключен ли элемент из роста субподряда
 */
function isExcludedFromGrowth(
  item: BoqItem,
  exclusions: SubcontractGrowthExclusions
): boolean {
  if (!item.detail_cost_category_id) {
    return false;
  }

  if (item.boq_item_type === 'суб-раб') {
    return exclusions.works.has(item.detail_cost_category_id);
  }

  if (item.boq_item_type === 'суб-мат') {
    return exclusions.materials.has(item.detail_cost_category_id);
  }

  return false;
}

/**
 * Вычисляет агрегацию наценок для всех BOQ элементов тендера
 * @param boqItems Все BOQ элементы тендера
 * @param tactic Тактика наценок
 * @param markupParameters Параметры наценок (ключ -> значение в %)
 * @param exclusions Исключения роста субподряда
 * @param includeItemDetails Включить детализацию по элементам (для отладки)
 */
export function calculateTenderMarkupAggregation(
  boqItems: BoqItem[],
  tactic: MarkupTactic,
  markupParameters: Map<string, number>,
  exclusions: SubcontractGrowthExclusions,
  includeItemDetails: boolean = false
): TenderMarkupAggregation {
  const byParameter = new Map<string, ParameterMarkupAggregate>();
  const itemDetails: ItemMarkupDetail[] = [];

  // Прямые затраты по типам
  const directCosts = {
    subcontractWorks: 0,
    subcontractMaterials: 0,
    works: 0,
    materials: 0,
    worksComp: 0,
    materialsComp: 0,
    total: 0
  };

  let totalBaseAmount = 0;
  let totalCommercialCost = 0;

  for (const item of boqItems) {
    const baseAmount = item.total_amount || 0;
    if (baseAmount <= 0) continue;

    // Суммируем прямые затраты по типам
    switch (item.boq_item_type) {
      case 'суб-раб':
        directCosts.subcontractWorks += baseAmount;
        break;
      case 'суб-мат':
        directCosts.subcontractMaterials += baseAmount;
        break;
      case 'раб':
        directCosts.works += baseAmount;
        break;
      case 'мат':
        directCosts.materials += baseAmount;
        break;
      case 'раб-комп.':
        directCosts.worksComp += baseAmount;
        break;
      case 'мат-комп.':
        directCosts.materialsComp += baseAmount;
        break;
    }

    totalBaseAmount += baseAmount;

    // Получаем последовательность для типа элемента
    let sequence = tactic.sequences[item.boq_item_type];
    if (!sequence || sequence.length === 0) {
      totalCommercialCost += baseAmount;
      continue;
    }

    // Проверяем исключения роста субподряда
    const isExcluded = isExcludedFromGrowth(item, exclusions);
    if (isExcluded) {
      sequence = filterSequenceForExclusions(sequence, true, item.boq_item_type);
    }

    // Выполняем расчёт с детализацией
    const context: CalculationContext = {
      baseAmount,
      itemType: item.boq_item_type,
      markupSequence: sequence,
      markupParameters,
      baseCost: tactic.base_costs?.[item.boq_item_type]
    };

    const result = calculateMarkupResult(context);
    totalCommercialCost += result.commercialCost;

    // Агрегируем по параметрам
    for (const stepDetail of result.stepDetails) {
      for (const paramKey of stepDetail.parameterKeys) {
        let aggregate = byParameter.get(paramKey);
        if (!aggregate) {
          aggregate = {
            parameterKey: paramKey,
            totalMarkupAmount: 0,
            itemCount: 0,
            stepsCount: 0,
            byItemType: new Map()
          };
          byParameter.set(paramKey, aggregate);
        }

        aggregate.totalMarkupAmount += stepDetail.markupAmount;
        aggregate.itemCount += 1;
        aggregate.stepsCount += 1;

        // Разбивка по типам элементов
        const currentByType = aggregate.byItemType.get(item.boq_item_type) || 0;
        aggregate.byItemType.set(item.boq_item_type, currentByType + stepDetail.markupAmount);
      }
    }

    // Сохраняем детали элемента если нужно
    if (includeItemDetails) {
      itemDetails.push({
        itemId: item.id,
        boqItemType: item.boq_item_type,
        baseAmount,
        commercialCost: result.commercialCost,
        stepDetails: result.stepDetails
      });
    }
  }

  directCosts.total = directCosts.subcontractWorks + directCosts.subcontractMaterials +
                      directCosts.works + directCosts.materials +
                      directCosts.worksComp + directCosts.materialsComp;

  const aggregation: TenderMarkupAggregation = {
    byParameter,
    directCosts,
    totalBaseAmount,
    totalCommercialCost,
    totalMarkupAmount: totalCommercialCost - totalBaseAmount
  };

  if (includeItemDetails) {
    aggregation.itemDetails = itemDetails;
  }

  logger.debug('=== Markup Aggregation Results ===');
  logger.debug('Direct costs:', directCosts);
  logger.debug('Total base:', totalBaseAmount);
  logger.debug('Total commercial:', totalCommercialCost);
  logger.debug('Total markup:', aggregation.totalMarkupAmount);
  logger.debug('Parameters breakdown:');
  byParameter.forEach((agg, key) => {
    logger.debug(`  ${key}: ${agg.totalMarkupAmount.toFixed(2)} (${agg.itemCount} items)`);
  });

  return aggregation;
}

/**
 * Получает сумму наценки по ключу параметра
 */
export function getMarkupByParameter(
  aggregation: TenderMarkupAggregation,
  parameterKey: string
): number {
  return aggregation.byParameter.get(parameterKey)?.totalMarkupAmount || 0;
}

/**
 * Получает сумму наценки по нескольким ключам параметров
 */
export function getMarkupByParameters(
  aggregation: TenderMarkupAggregation,
  parameterKeys: string[]
): number {
  let total = 0;
  for (const key of parameterKeys) {
    total += getMarkupByParameter(aggregation, key);
  }
  return total;
}

/**
 * Группирует параметры наценок по категориям для финансовых показателей
 */
export interface FinancialIndicatorsFromAggregation {
  mechanization: number;       // Механизация (mechanization_service)
  mvpGsm: number;             // МБП+ГСМ (mbp_gsm)
  warranty: number;            // Гарантия (warranty_period)
  works16: number;             // 1,6к (works_16_markup)
  worksCostGrowth: number;     // Рост работ СУ-10 (works_cost_growth)
  materialCostGrowth: number;  // Рост материалов СУ-10 (material_cost_growth)
  subcontractWorksCostGrowth: number;    // Рост работ субподряда (subcontract_works_cost_growth)
  subcontractMaterialsCostGrowth: number; // Рост материалов субподряда (subcontract_materials_cost_growth)
  unforeseeable: number;       // Непредвиденные (contingency_costs)
  overheadOwnForces: number;   // ООЗ СУ-10 (overhead_own_forces)
  overheadSubcontract: number; // ООЗ Субподряд (overhead_subcontract)
  generalCosts: number;        // ОФЗ (general_costs_without_subcontract)
  profitOwnForces: number;     // Прибыль СУ-10 (profit_own_forces)
  profitSubcontract: number;   // Прибыль субподряд (profit_subcontract)
  vat: number;                 // НДС (nds_22)
}

/**
 * Преобразует агрегацию в структуру финансовых показателей
 */
export function aggregationToFinancialIndicators(
  aggregation: TenderMarkupAggregation
): FinancialIndicatorsFromAggregation {
  return {
    mechanization: getMarkupByParameter(aggregation, 'mechanization_service'),
    mvpGsm: getMarkupByParameter(aggregation, 'mbp_gsm'),
    warranty: getMarkupByParameter(aggregation, 'warranty_period'),
    works16: getMarkupByParameter(aggregation, 'works_16_markup'),
    worksCostGrowth: getMarkupByParameter(aggregation, 'works_cost_growth'),
    materialCostGrowth: getMarkupByParameter(aggregation, 'material_cost_growth'),
    subcontractWorksCostGrowth: getMarkupByParameter(aggregation, 'subcontract_works_cost_growth'),
    subcontractMaterialsCostGrowth: getMarkupByParameter(aggregation, 'subcontract_materials_cost_growth'),
    unforeseeable: getMarkupByParameter(aggregation, 'contingency_costs'),
    overheadOwnForces: getMarkupByParameter(aggregation, 'overhead_own_forces'),
    overheadSubcontract: getMarkupByParameter(aggregation, 'overhead_subcontract'),
    generalCosts: getMarkupByParameter(aggregation, 'general_costs_without_subcontract'),
    profitOwnForces: getMarkupByParameter(aggregation, 'profit_own_forces'),
    profitSubcontract: getMarkupByParameter(aggregation, 'profit_subcontract'),
    vat: getMarkupByParameter(aggregation, 'nds_22')
  };
}
