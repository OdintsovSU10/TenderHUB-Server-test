/**
 * Фикстуры последовательностей наценок для тестов
 */

import type { MarkupStep } from '../../lib/supabase';

/**
 * Простой шаг: база × (1 + 10%)
 */
export const SINGLE_STEP_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'material_cost_growth',
    operand1MultiplyFormat: 'addOne'
  }
];

/**
 * Цепочка из 2 шагов: рост + НДС
 */
export const TWO_STEP_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'material_cost_growth',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 0,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'nds_22',
    operand1MultiplyFormat: 'addOne'
  }
];

/**
 * Цепочка из 3 шагов: рост + overhead + НДС
 */
export const THREE_STEP_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'material_cost_growth',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 0,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'overhead_own_forces',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'nds_22',
    operand1MultiplyFormat: 'addOne'
  }
];

/**
 * Полная цепочка для работ: рост + overhead + profit + НДС
 */
export const FULL_WORK_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'works_cost_growth',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 0,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'overhead_own_forces',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'profit_own_forces',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 2,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'nds_22',
    operand1MultiplyFormat: 'addOne'
  }
];

/**
 * Последовательность с субподрядом
 */
export const SUBCONTRACT_WORK_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'subcontract_works_cost_growth',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 0,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'overhead_subcontract',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 1,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'profit_subcontract',
    operand1MultiplyFormat: 'addOne'
  },
  {
    baseIndex: 2,
    action1: 'multiply',
    operand1Type: 'markup',
    operand1Key: 'nds_22',
    operand1MultiplyFormat: 'addOne'
  }
];

/**
 * Шаг с несколькими операциями (5 операций)
 */
export const MULTI_OPERATION_STEP: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'number',
    operand1Key: 2,
    action2: 'add',
    operand2Type: 'number',
    operand2Key: 100,
    action3: 'subtract',
    operand3Type: 'number',
    operand3Key: 50,
    action4: 'multiply',
    operand4Type: 'number',
    operand4Key: 1.1,
    action5: 'divide',
    operand5Type: 'number',
    operand5Key: 2
  }
];

/**
 * Шаг со ссылкой на другой шаг через operand
 */
export const STEP_REFERENCE_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    action1: 'multiply',
    operand1Type: 'number',
    operand1Key: 1.5
  },
  {
    baseIndex: -1,
    action1: 'add',
    operand1Type: 'step',
    operand1Index: 0
  }
];

/**
 * Пустая последовательность
 */
export const EMPTY_SEQUENCE: MarkupStep[] = [];

/**
 * Некорректная последовательность (baseIndex ссылается на будущий шаг)
 */
export const INVALID_BASE_INDEX_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: 1, // Некорректно - шаг 1 еще не существует
    action1: 'multiply',
    operand1Type: 'number',
    operand1Key: 2
  }
];

/**
 * Последовательность без обязательной первой операции
 */
export const MISSING_ACTION_SEQUENCE: MarkupStep[] = [
  {
    baseIndex: -1,
    operand1Type: 'number',
    operand1Key: 2
  } as MarkupStep
];
