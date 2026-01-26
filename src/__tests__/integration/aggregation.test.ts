/**
 * Тесты агрегации наценок
 * Проверяют соответствие данных между Формой КП и Финансовыми показателями
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTenderMarkupAggregation,
  getMarkupByParameter,
  aggregationToFinancialIndicators
} from '../../services/markupTactic/aggregation';
import type { BoqItem, MarkupStep } from '../../lib/supabase';
import type { SubcontractGrowthExclusions } from '../../services/markupTactic/calculation';

// Тестовая тактика с известными шагами
const createTestTactic = () => ({
  sequences: {
    'раб': [
      // Шаг 1: база × (1 + 5%) = механизация
      {
        name: 'Механизация',
        baseIndex: -1,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'mechanization_service',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 2: шаг1 × (1 + 10%) = рост работ
      {
        name: 'Рост работ',
        baseIndex: 0,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'works_cost_growth',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 3: шаг2 × (1 + 8%) = ООЗ
      {
        name: 'ООЗ',
        baseIndex: 1,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'overhead_own_forces',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 4: шаг3 × (1 + 22%) = НДС
      {
        name: 'НДС',
        baseIndex: 2,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'nds_22',
        operand1MultiplyFormat: 'addOne' as const
      }
    ] as MarkupStep[],
    'мат': [
      // Шаг 1: база × (1 + 10%) = рост материалов
      {
        name: 'Рост материалов',
        baseIndex: -1,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'material_cost_growth',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 2: шаг1 × (1 + 22%) = НДС
      {
        name: 'НДС',
        baseIndex: 0,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'nds_22',
        operand1MultiplyFormat: 'addOne' as const
      }
    ] as MarkupStep[],
    'суб-раб': [
      // Шаг 1: база × (1 + 5%) = рост субподряда
      {
        name: 'Рост субподряда',
        baseIndex: -1,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'subcontract_works_cost_growth',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 2: шаг1 × (1 + 6%) = ООЗ субподряд
      {
        name: 'ООЗ субподряд',
        baseIndex: 0,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'overhead_subcontract',
        operand1MultiplyFormat: 'addOne' as const
      },
      // Шаг 3: шаг2 × (1 + 22%) = НДС
      {
        name: 'НДС',
        baseIndex: 1,
        action1: 'multiply' as const,
        operand1Type: 'markup' as const,
        operand1Key: 'nds_22',
        operand1MultiplyFormat: 'addOne' as const
      }
    ] as MarkupStep[],
    'суб-мат': [] as MarkupStep[],
    'мат-комп.': [] as MarkupStep[],
    'раб-комп.': [] as MarkupStep[]
  },
  base_costs: {}
});

// Тестовые параметры наценок
const createTestParameters = () => new Map<string, number>([
  ['mechanization_service', 5],      // 5%
  ['works_cost_growth', 10],         // 10%
  ['material_cost_growth', 10],      // 10%
  ['subcontract_works_cost_growth', 5], // 5%
  ['overhead_own_forces', 8],        // 8%
  ['overhead_subcontract', 6],       // 6%
  ['nds_22', 22]                     // 22%
]);

// Пустые исключения
const emptyExclusions: SubcontractGrowthExclusions = {
  works: new Set(),
  materials: new Set()
};

describe('calculateTenderMarkupAggregation', () => {
  it('должен правильно агрегировать наценки по параметрам для одного элемента "раб"', () => {
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'раб',
        total_amount: 1000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem
    ];

    const tactic = createTestTactic();
    const params = createTestParameters();

    const result = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      emptyExclusions,
      true
    );

    // Проверяем прямые затраты
    expect(result.directCosts.works).toBe(1000);
    expect(result.directCosts.total).toBe(1000);
    expect(result.totalBaseAmount).toBe(1000);

    // Расчёт вручную:
    // Шаг 1: 1000 × 1.05 = 1050 (механизация +50)
    // Шаг 2: 1050 × 1.10 = 1155 (рост +105)
    // Шаг 3: 1155 × 1.08 = 1247.40 (ООЗ +92.40)
    // Шаг 4: 1247.40 × 1.22 = 1521.828 (НДС +274.428)

    // Проверяем наценки по параметрам
    const mechMarkup = getMarkupByParameter(result, 'mechanization_service');
    expect(mechMarkup).toBeCloseTo(50, 2);

    const growthMarkup = getMarkupByParameter(result, 'works_cost_growth');
    expect(growthMarkup).toBeCloseTo(105, 2);

    const oozMarkup = getMarkupByParameter(result, 'overhead_own_forces');
    expect(oozMarkup).toBeCloseTo(92.40, 2);

    const vatMarkup = getMarkupByParameter(result, 'nds_22');
    expect(vatMarkup).toBeCloseTo(274.428, 2);

    // Проверяем итоговую коммерческую стоимость
    expect(result.totalCommercialCost).toBeCloseTo(1521.828, 2);
  });

  it('должен правильно агрегировать наценки для нескольких элементов разных типов', () => {
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'раб',
        total_amount: 1000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem,
      {
        id: '2',
        client_position_id: 'pos1',
        boq_item_type: 'мат',
        total_amount: 500,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem,
      {
        id: '3',
        client_position_id: 'pos1',
        boq_item_type: 'суб-раб',
        total_amount: 2000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem
    ];

    const tactic = createTestTactic();
    const params = createTestParameters();

    const result = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      emptyExclusions
    );

    // Проверяем прямые затраты
    expect(result.directCosts.works).toBe(1000);
    expect(result.directCosts.materials).toBe(500);
    expect(result.directCosts.subcontractWorks).toBe(2000);
    expect(result.directCosts.total).toBe(3500);

    // Механизация только от работ
    const mechMarkup = getMarkupByParameter(result, 'mechanization_service');
    expect(mechMarkup).toBeCloseTo(50, 2);

    // Рост работ только от работ
    const worksGrowth = getMarkupByParameter(result, 'works_cost_growth');
    expect(worksGrowth).toBeCloseTo(105, 2);

    // Рост материалов только от материалов: 500 × 0.10 = 50
    const matGrowth = getMarkupByParameter(result, 'material_cost_growth');
    expect(matGrowth).toBeCloseTo(50, 2);

    // Рост субподряда: 2000 × 0.05 = 100
    const subGrowth = getMarkupByParameter(result, 'subcontract_works_cost_growth');
    expect(subGrowth).toBeCloseTo(100, 2);

    // ООЗ субподряд: (2000 × 1.05) × 0.06 = 2100 × 0.06 = 126
    const oozSub = getMarkupByParameter(result, 'overhead_subcontract');
    expect(oozSub).toBeCloseTo(126, 2);
  });

  it('должен учитывать исключения роста субподряда', () => {
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'суб-раб',
        total_amount: 1000,
        detail_cost_category_id: 'excluded_category',
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem,
      {
        id: '2',
        client_position_id: 'pos1',
        boq_item_type: 'суб-раб',
        total_amount: 1000,
        detail_cost_category_id: 'normal_category',
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem
    ];

    const exclusions: SubcontractGrowthExclusions = {
      works: new Set(['excluded_category']),
      materials: new Set()
    };

    const tactic = createTestTactic();
    const params = createTestParameters();

    const result = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      exclusions
    );

    // Рост субподряда должен быть только от неисключённого элемента: 1000 × 0.05 = 50
    const subGrowth = getMarkupByParameter(result, 'subcontract_works_cost_growth');
    expect(subGrowth).toBeCloseTo(50, 2);
  });

  it('aggregationToFinancialIndicators должен правильно преобразовывать агрегацию', () => {
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'раб',
        total_amount: 10000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem
    ];

    const tactic = createTestTactic();
    const params = createTestParameters();

    const aggregation = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      emptyExclusions
    );

    const indicators = aggregationToFinancialIndicators(aggregation);

    // Проверяем что все поля заполнены
    expect(indicators.mechanization).toBeCloseTo(500, 2);
    expect(indicators.worksCostGrowth).toBeCloseTo(1050, 2);
    expect(indicators.overheadOwnForces).toBeCloseTo(924, 2);
    expect(indicators.vat).toBeCloseTo(2744.28, 1);
  });
});

describe('Соответствие КП и Финансовых показателей', () => {
  it('сумма коммерческой стоимости из агрегации должна равняться итогу в КП', () => {
    // Симулируем данные из КП (уже рассчитанные)
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'раб',
        total_amount: 1000,
        commercial_markup: 1.52, // Предположим это уже рассчитано
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 1521.83
      } as BoqItem
    ];

    const tactic = createTestTactic();
    const params = createTestParameters();

    const aggregation = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      emptyExclusions
    );

    // Коммерческая стоимость из агрегации должна примерно равняться
    // тому что в КП (total_commercial_work_cost)
    const kpTotal = boqItems[0].total_commercial_work_cost;
    const aggregationTotal = aggregation.totalCommercialCost;

    // Разница должна быть минимальной (погрешность округления)
    expect(Math.abs(aggregationTotal - kpTotal)).toBeLessThan(0.01);
  });

  it('сумма всех наценок должна равняться разнице между коммерческой и базовой', () => {
    const boqItems: BoqItem[] = [
      {
        id: '1',
        client_position_id: 'pos1',
        boq_item_type: 'раб',
        total_amount: 5000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem,
      {
        id: '2',
        client_position_id: 'pos1',
        boq_item_type: 'мат',
        total_amount: 3000,
        commercial_markup: 0,
        total_commercial_material_cost: 0,
        total_commercial_work_cost: 0
      } as BoqItem
    ];

    const tactic = createTestTactic();
    const params = createTestParameters();

    const aggregation = calculateTenderMarkupAggregation(
      boqItems,
      tactic,
      params,
      emptyExclusions
    );

    // Сумма всех наценок по параметрам
    let sumOfMarkups = 0;
    aggregation.byParameter.forEach(agg => {
      sumOfMarkups += agg.totalMarkupAmount;
    });

    // Должна равняться totalMarkupAmount
    expect(sumOfMarkups).toBeCloseTo(aggregation.totalMarkupAmount, 2);

    // И равняться разнице commercial - base
    const diff = aggregation.totalCommercialCost - aggregation.totalBaseAmount;
    expect(sumOfMarkups).toBeCloseTo(diff, 2);
  });
});
