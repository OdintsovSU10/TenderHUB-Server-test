/**
 * Ожидаемые результаты расчетов для контрактных тестов
 * Эти значения зафиксированы и используются для регрессионного тестирования
 */

import type { MarkupStep } from '../../lib/supabase';
import { STANDARD_MARKUP_PARAMETERS } from './markupParameters';
import {
  SINGLE_STEP_SEQUENCE,
  TWO_STEP_SEQUENCE,
  THREE_STEP_SEQUENCE,
  FULL_WORK_SEQUENCE
} from './markupSequences';
import {
  BASIC_MATERIAL_ITEM,
  WORK_ITEM,
  SUBCONTRACT_WORK_ITEM
} from './boqItems';

/**
 * Интерфейс для тестового сценария
 */
export interface ProductionTestCase {
  name: string;
  description: string;
  input: {
    baseAmount: number;
    itemType: string;
    sequence: MarkupStep[];
    parameters: Map<string, number>;
    materialType?: string | null;
  };
  expected: {
    commercialCost: number;
    markupCoefficient: number;
    materialCost?: number;
    workCost?: number;
  };
}

/**
 * Зафиксированные production-like тестовые сценарии
 */
export const PRODUCTION_TEST_CASES: ProductionTestCase[] = [
  {
    name: 'basic_material_10_percent_growth',
    description: 'Базовый материал с 10% ростом стоимости',
    input: {
      baseAmount: 10000,
      itemType: 'мат',
      sequence: SINGLE_STEP_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 11000, // 10000 * 1.10
      markupCoefficient: 1.10,
      materialCost: 11000,
      workCost: 0
    }
  },
  {
    name: 'material_with_growth_and_vat',
    description: 'Материал с ростом 10% и НДС 22%',
    input: {
      baseAmount: 10000,
      itemType: 'мат',
      sequence: TWO_STEP_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 13420, // 10000 * 1.10 * 1.22
      markupCoefficient: 1.342,
      materialCost: 13420,
      workCost: 0
    }
  },
  {
    name: 'material_three_step_chain',
    description: 'Материал: рост 10% + overhead 10% + НДС 22%',
    input: {
      baseAmount: 10000,
      itemType: 'мат',
      sequence: THREE_STEP_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 14762, // 10000 * 1.10 * 1.10 * 1.22
      markupCoefficient: 1.4762,
      materialCost: 14762,
      workCost: 0
    }
  },
  {
    name: 'work_full_chain',
    description: 'Работа: рост + overhead + profit + НДС',
    input: {
      baseAmount: 20000,
      itemType: 'раб',
      sequence: FULL_WORK_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: null
    },
    expected: {
      // 20000 * 1.10 * 1.10 * 1.10 * 1.22 = 32476.4
      commercialCost: 32476.4,
      markupCoefficient: 1.62382,
      materialCost: 0,
      workCost: 32476.4
    }
  },
  {
    name: 'large_amount_material',
    description: 'Большая сумма материала для проверки точности',
    input: {
      baseAmount: 1000000,
      itemType: 'мат',
      sequence: TWO_STEP_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 1342000, // 1000000 * 1.10 * 1.22
      markupCoefficient: 1.342,
      materialCost: 1342000,
      workCost: 0
    }
  },
  {
    name: 'small_amount_precision',
    description: 'Малая сумма для проверки округления',
    input: {
      baseAmount: 100.50,
      itemType: 'мат',
      sequence: SINGLE_STEP_SEQUENCE,
      parameters: STANDARD_MARKUP_PARAMETERS,
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 110.55, // 100.50 * 1.10
      markupCoefficient: 1.10,
      materialCost: 110.55,
      workCost: 0
    }
  },
  {
    name: 'zero_markup_parameters',
    description: 'Нулевые параметры наценок',
    input: {
      baseAmount: 10000,
      itemType: 'мат',
      sequence: SINGLE_STEP_SEQUENCE,
      parameters: new Map([['material_cost_growth', 0]]),
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 10000, // 10000 * 1.00
      markupCoefficient: 1.0,
      materialCost: 10000,
      workCost: 0
    }
  },
  {
    name: 'high_markup_100_percent',
    description: 'Высокая наценка 100%',
    input: {
      baseAmount: 10000,
      itemType: 'мат',
      sequence: SINGLE_STEP_SEQUENCE,
      parameters: new Map([['material_cost_growth', 100]]),
      materialType: 'основн.'
    },
    expected: {
      commercialCost: 20000, // 10000 * 2.00
      markupCoefficient: 2.0,
      materialCost: 20000,
      workCost: 0
    }
  }
];

/**
 * Математические инварианты для проверки
 */
export const MATHEMATICAL_INVARIANTS = {
  // Коммерческая стоимость = материалы + работы
  costSumInvariant: (materialCost: number, workCost: number, commercialCost: number, tolerance = 0.01) => {
    return Math.abs(materialCost + workCost - commercialCost) <= tolerance;
  },

  // Коэффициент наценки >= 0 для положительной базы
  coefficientPositive: (coefficient: number, baseAmount: number) => {
    return baseAmount <= 0 || coefficient >= 0;
  },

  // Коммерческая стоимость = база × коэффициент
  coefficientInvariant: (baseAmount: number, coefficient: number, commercialCost: number, tolerance = 0.01) => {
    return Math.abs(baseAmount * coefficient - commercialCost) <= tolerance;
  }
};

/**
 * Допустимая погрешность для сравнения чисел
 */
export const CALCULATION_TOLERANCE = 0.01; // 1 копейка
