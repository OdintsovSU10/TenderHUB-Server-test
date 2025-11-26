/**
 * Логика расчета наценок для элементов BOQ
 */

import { supabase } from '../../lib/supabase';
import type { BoqItem, MarkupStep } from '../../lib/supabase';
import {
  calculateMarkupResult,
  type CalculationContext
} from '../../utils/markupCalculator';

/**
 * Результат применения тактики
 */
export interface TacticApplicationResult {
  success: boolean;
  updatedCount?: number;
  errors?: string[];
  details?: {
    itemId: string;
    commercialCost: number;
    markupCoefficient: number;
    errors?: string[];
  }[];
}

/**
 * Настройки ценообразования для тендера
 */
export interface PricingDistribution {
  basic_material_base_target: 'material' | 'work';
  basic_material_markup_target: 'material' | 'work';
  auxiliary_material_base_target: 'material' | 'work';
  auxiliary_material_markup_target: 'material' | 'work';
  component_material_base_target?: 'material' | 'work';
  component_material_markup_target?: 'material' | 'work';
  subcontract_basic_material_base_target?: 'material' | 'work';
  subcontract_basic_material_markup_target?: 'material' | 'work';
  subcontract_auxiliary_material_base_target?: 'material' | 'work';
  subcontract_auxiliary_material_markup_target?: 'material' | 'work';
  work_base_target: 'material' | 'work';
  work_markup_target: 'material' | 'work';
  component_work_base_target?: 'material' | 'work';
  component_work_markup_target?: 'material' | 'work';
}

/**
 * Загружает настройки ценообразования для тендера
 */
export async function loadPricingDistribution(tenderId: string): Promise<PricingDistribution | null> {
  const { data, error } = await supabase
    .from('tender_pricing_distribution')
    .select('*')
    .eq('tender_id', tenderId)
    .single();

  if (error || !data) {
    console.warn('⚠️ Настройки ценообразования не найдены, используются defaults');
    return null;
  }

  return data as PricingDistribution;
}

/**
 * Определяет тип материала на основе boq_item_type
 */
function getMaterialType(boqItemType: string): 'basic' | 'auxiliary' | 'component_material' | 'subcontract_basic' | 'subcontract_auxiliary' | 'work' | 'component_work' | null {
  // Определяем тип на основе названия типа элемента
  if (boqItemType === 'мат') return 'basic';
  if (boqItemType === 'мат-комп.') return 'component_material';
  if (boqItemType === 'суб-мат') {
    // Для субматериалов нужно различать основные и вспомогательные
    // Пока возвращаем subcontract_basic по умолчанию
    return 'subcontract_basic';
  }
  if (boqItemType === 'раб') return 'work';
  if (boqItemType === 'раб-комп.') return 'component_work';
  if (boqItemType === 'суб-раб') return 'work'; // Субподрядные работы обрабатываются как обычные работы
  return null;
}

/**
 * Применяет распределение ценообразования к коммерческой стоимости
 * Разделяет commercialCost на базовую стоимость и наценку, затем распределяет их
 */
export function applyPricingDistribution(
  baseAmount: number,
  commercialCost: number,
  boqItemType: string,
  distribution: PricingDistribution | null
): { materialCost: number; workCost: number } {
  // Если настроек нет, используем старую логику
  if (!distribution) {
    const isMaterial = ['мат', 'суб-мат', 'мат-комп.'].includes(boqItemType);
    return {
      materialCost: isMaterial ? commercialCost : 0,
      workCost: isMaterial ? 0 : commercialCost
    };
  }

  // Вычисляем базовую стоимость и наценку
  const markup = commercialCost - baseAmount;

  // Определяем тип материала/работы
  const materialType = getMaterialType(boqItemType);
  if (!materialType) {
    console.warn(`⚠️ Неизвестный тип элемента: ${boqItemType}`);
    return { materialCost: 0, workCost: commercialCost };
  }

  let materialCost = 0;
  let workCost = 0;

  // Применяем распределение для каждого типа
  switch (materialType) {
    case 'basic':
      materialCost += distribution.basic_material_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.basic_material_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.basic_material_markup_target === 'material' ? markup : 0;
      workCost += distribution.basic_material_markup_target === 'work' ? markup : 0;
      break;

    case 'auxiliary':
      materialCost += distribution.auxiliary_material_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.auxiliary_material_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.auxiliary_material_markup_target === 'material' ? markup : 0;
      workCost += distribution.auxiliary_material_markup_target === 'work' ? markup : 0;
      break;

    case 'component_material':
      if (distribution.component_material_base_target && distribution.component_material_markup_target) {
        materialCost += distribution.component_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.component_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.component_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.component_material_markup_target === 'work' ? markup : 0;
      } else {
        // Fallback к auxiliary если нет настроек для component_material
        materialCost += distribution.auxiliary_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.auxiliary_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.auxiliary_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.auxiliary_material_markup_target === 'work' ? markup : 0;
      }
      break;

    case 'subcontract_basic':
      if (distribution.subcontract_basic_material_base_target && distribution.subcontract_basic_material_markup_target) {
        materialCost += distribution.subcontract_basic_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.subcontract_basic_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.subcontract_basic_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.subcontract_basic_material_markup_target === 'work' ? markup : 0;
      } else {
        // Fallback на старую логику для субматериалов
        workCost = commercialCost;
      }
      break;

    case 'subcontract_auxiliary':
      if (distribution.subcontract_auxiliary_material_base_target && distribution.subcontract_auxiliary_material_markup_target) {
        materialCost += distribution.subcontract_auxiliary_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.subcontract_auxiliary_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.subcontract_auxiliary_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.subcontract_auxiliary_material_markup_target === 'work' ? markup : 0;
      } else {
        // Fallback на старую логику
        workCost = commercialCost;
      }
      break;

    case 'work':
      materialCost += distribution.work_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.work_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.work_markup_target === 'material' ? markup : 0;
      workCost += distribution.work_markup_target === 'work' ? markup : 0;
      break;

    case 'component_work':
      if (distribution.component_work_base_target && distribution.component_work_markup_target) {
        materialCost += distribution.component_work_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.component_work_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.component_work_markup_target === 'material' ? markup : 0;
        workCost += distribution.component_work_markup_target === 'work' ? markup : 0;
      } else {
        // Fallback к work если нет настроек для component_work
        materialCost += distribution.work_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.work_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.work_markup_target === 'material' ? markup : 0;
        workCost += distribution.work_markup_target === 'work' ? markup : 0;
      }
      break;
  }

  return { materialCost, workCost };
}

/**
 * Интерфейс тактики наценок
 */
interface MarkupTactic {
  sequences: Record<string, MarkupStep[]>;
  base_costs?: Record<string, number>;
}

/**
 * Выполняет расчет коммерческой стоимости для элемента BOQ
 */
export function calculateBoqItemCost(
  item: BoqItem,
  tactic: MarkupTactic,
  markupParameters: Map<string, number>,
  pricingDistribution: PricingDistribution | null
): { materialCost: number; workCost: number; markupCoefficient: number } | null {
  try {
    // Получаем последовательность для типа элемента
    const sequence = tactic.sequences[item.boq_item_type];
    if (!sequence || sequence.length === 0) {
      return null;
    }

    // Создаем контекст и выполняем расчет
    const context: CalculationContext = {
      baseAmount: item.total_amount || 0,
      itemType: item.boq_item_type,
      markupSequence: sequence,
      markupParameters,
      baseCost: tactic.base_costs?.[item.boq_item_type]
    };

    const result = calculateMarkupResult(context);

    // Применяем распределение ценообразования
    const { materialCost, workCost } = applyPricingDistribution(
      item.total_amount || 0,
      result.commercialCost,
      item.boq_item_type,
      pricingDistribution
    );

    return {
      materialCost,
      workCost,
      markupCoefficient: result.markupCoefficient
    };

  } catch (error) {
    console.error(`Ошибка расчета элемента ${item.id}:`, error);
    return null;
  }
}

/**
 * Проверяет, нужен ли пересчет для элемента BOQ
 * @param item Элемент BOQ
 * @returns true, если нужен пересчет
 */
export function needsRecalculation(item: BoqItem): boolean {
  // Пересчет нужен, если:
  // 1. Есть базовая стоимость, но нет коммерческой
  // 2. Коэффициент наценки не соответствует отношению коммерческой к базовой стоимости

  if (!item.total_amount || item.total_amount === 0) {
    return false;
  }

  const isMaterial = ['мат', 'суб-мат', 'мат-комп.'].includes(item.boq_item_type);
  const commercialCost = isMaterial
    ? item.total_commercial_material_cost
    : item.total_commercial_work_cost;

  // Если коммерческая стоимость не задана
  if (!commercialCost) {
    return true;
  }

  // Проверяем соответствие коэффициента
  if (item.commercial_markup) {
    const expectedCost = item.total_amount * item.commercial_markup;
    const difference = Math.abs(expectedCost - commercialCost);

    // Если разница больше 0.01 (1 копейка), нужен пересчет
    return difference > 0.01;
  }

  return true;
}
