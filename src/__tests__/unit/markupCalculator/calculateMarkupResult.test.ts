/**
 * Unit тесты для функции calculateMarkupResult
 * Тестирует полный расчет коммерческой стоимости
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMarkupResult,
  type CalculationContext
} from '../../../utils/markupCalculator';
import {
  STANDARD_MARKUP_PARAMETERS,
  MINIMAL_MARKUP_PARAMETERS,
  ZERO_MARKUP_PARAMETERS
} from '../../fixtures/markupParameters';
import {
  SINGLE_STEP_SEQUENCE,
  TWO_STEP_SEQUENCE,
  THREE_STEP_SEQUENCE,
  FULL_WORK_SEQUENCE,
  MULTI_OPERATION_STEP,
  STEP_REFERENCE_SEQUENCE,
  EMPTY_SEQUENCE
} from '../../fixtures/markupSequences';

describe('calculateMarkupResult', () => {
  describe('single step sequence', () => {
    it('should apply single markup step with addOne format', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBeCloseTo(11000, 2); // 10000 * 1.10
      expect(result.markupCoefficient).toBeCloseTo(1.10, 2);
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0]).toBeCloseTo(11000, 2);
      expect(result.errors).toBeUndefined();
    });

    it('should handle different base amounts', () => {
      const context: CalculationContext = {
        baseAmount: 50000,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBeCloseTo(55000, 2); // 50000 * 1.10
    });
  });

  describe('two step sequence', () => {
    it('should chain two steps correctly (growth + VAT)', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: TWO_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      // 10000 * 1.10 * 1.22 = 13420
      expect(result.stepResults[0]).toBeCloseTo(11000, 2);
      expect(result.stepResults[1]).toBeCloseTo(13420, 2);
      expect(result.commercialCost).toBeCloseTo(13420, 2);
      expect(result.markupCoefficient).toBeCloseTo(1.342, 3);
    });
  });

  describe('three step sequence', () => {
    it('should chain three steps correctly', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: THREE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      // 10000 * 1.10 * 1.10 * 1.22 = 14762
      expect(result.stepResults[0]).toBeCloseTo(11000, 2);
      expect(result.stepResults[1]).toBeCloseTo(12100, 2);
      expect(result.stepResults[2]).toBeCloseTo(14762, 0);
      expect(result.commercialCost).toBeCloseTo(14762, 0);
      expect(result.markupCoefficient).toBeCloseTo(1.4762, 4);
    });
  });

  describe('full work sequence (4 steps)', () => {
    it('should calculate full work chain correctly', () => {
      const context: CalculationContext = {
        baseAmount: 20000,
        itemType: 'раб',
        markupSequence: FULL_WORK_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      // 20000 * 1.10 * 1.10 * 1.10 * 1.22 = 32476.4
      expect(result.stepResults).toHaveLength(4);
      expect(result.stepResults[0]).toBeCloseTo(22000, 0); // рост 10%
      expect(result.stepResults[1]).toBeCloseTo(24200, 0); // overhead 10%
      expect(result.stepResults[2]).toBeCloseTo(26620, 0); // profit 10%
      expect(result.stepResults[3]).toBeCloseTo(32476.4, 1); // НДС 22%
      expect(result.commercialCost).toBeCloseTo(32476.4, 1);
      expect(result.markupCoefficient).toBeCloseTo(1.6238, 3);
    });
  });

  describe('multi-operation step', () => {
    it('should apply all 5 operations in one step', () => {
      const context: CalculationContext = {
        baseAmount: 1000,
        itemType: 'раб',
        markupSequence: MULTI_OPERATION_STEP,
        markupParameters: new Map()
      };

      const result = calculateMarkupResult(context);

      // ((((1000 * 2) + 100) - 50) * 1.1) / 2
      // (2000 + 100) = 2100
      // (2100 - 50) = 2050
      // (2050 * 1.1) = 2255
      // (2255 / 2) = 1127.5
      expect(result.commercialCost).toBeCloseTo(1127.5, 1);
      expect(result.stepResults).toHaveLength(1);
    });
  });

  describe('step reference sequence', () => {
    it('should correctly reference previous step results', () => {
      const context: CalculationContext = {
        baseAmount: 1000,
        itemType: 'мат',
        markupSequence: STEP_REFERENCE_SEQUENCE,
        markupParameters: new Map()
      };

      const result = calculateMarkupResult(context);

      // Step 0: 1000 * 1.5 = 1500
      // Step 1: 1000 + step[0] = 1000 + 1500 = 2500
      expect(result.stepResults[0]).toBe(1500);
      expect(result.stepResults[1]).toBe(2500);
      expect(result.commercialCost).toBe(2500);
    });
  });

  describe('empty sequence', () => {
    it('should return baseAmount for empty sequence', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: EMPTY_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(10000);
      expect(result.markupCoefficient).toBe(1);
      expect(result.stepResults).toHaveLength(0);
      expect(result.errors).toContain('Последовательность операций пуста');
    });
  });

  describe('zero and negative base amounts', () => {
    it('should handle zero baseAmount', () => {
      const context: CalculationContext = {
        baseAmount: 0,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(0);
      expect(result.markupCoefficient).toBe(1);
      expect(result.stepResults).toHaveLength(0);
    });

    it('should handle negative baseAmount', () => {
      const context: CalculationContext = {
        baseAmount: -100,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(-100);
      expect(result.errors).toContain('Базовая стоимость отрицательная');
    });
  });

  describe('baseCost override', () => {
    it('should use baseCost as initial value for calculations', () => {
      // ВАЖНО: baseCost используется как начальное значение currentAmount,
      // но getBaseValue всё равно использует baseAmount при baseIndex = -1.
      // Поэтому baseCost влияет только если первый шаг НЕ ссылается на baseIndex = -1
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        }],
        markupParameters: new Map(),
        baseCost: 500
      };

      const result = calculateMarkupResult(context);

      // При baseIndex = -1 используется baseAmount (10000), не baseCost
      // Результат: 10000 * 2 = 20000
      expect(result.commercialCost).toBe(20000);
      expect(result.markupCoefficient).toBe(2); // 20000 / 10000
    });

    it('should affect coefficient calculation based on baseAmount', () => {
      // baseCost влияет на начальный currentAmount,
      // но коэффициент всегда рассчитывается относительно baseAmount
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        }],
        markupParameters: new Map(),
        baseCost: undefined
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBe(20000); // 10000 * 2
      expect(result.markupCoefficient).toBe(2); // 20000 / 10000
    });
  });

  describe('zero markup parameters', () => {
    it('should handle 0% markup (no change)', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: ZERO_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(10000); // 10000 * 1.00
      expect(result.markupCoefficient).toBe(1.0);
    });
  });

  describe('undefined/null sequence', () => {
    it('should handle undefined sequence', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: undefined as any,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(10000);
      expect(result.errors).toContain('Последовательность операций не определена');
    });

    it('should handle null sequence', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: null as any,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.commercialCost).toBe(10000);
      expect(result.errors).toContain('Последовательность операций не определена');
    });
  });

  describe('precision and rounding', () => {
    it('should maintain precision for small amounts', () => {
      const context: CalculationContext = {
        baseAmount: 100.50,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBeCloseTo(110.55, 2); // 100.50 * 1.10
    });

    it('should handle large amounts without overflow', () => {
      const context: CalculationContext = {
        baseAmount: 1000000000, // 1 миллиард
        itemType: 'мат',
        markupSequence: TWO_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBeCloseTo(1342000000, 0); // 1B * 1.10 * 1.22
    });
  });

  describe('coefficient calculation', () => {
    it('should calculate correct coefficient for simple markup', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.markupCoefficient).toBeCloseTo(1.10, 2);
    });

    it('should calculate correct coefficient for chain markup', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: TWO_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.markupCoefficient).toBeCloseTo(1.342, 3);
    });

    it('should return coefficient 1 when baseAmount is 0', () => {
      const context: CalculationContext = {
        baseAmount: 0,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.markupCoefficient).toBe(1);
    });
  });

  describe('error handling in steps', () => {
    it('should continue calculation after error in step', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'nonexistent_key', // Этот ключ не существует
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      // Должен продолжить с предыдущим значением и записать ошибку
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('Ошибка в шаге 1');
    });
  });

  describe('stepDetails', () => {
    it('should return stepDetails with correct parameter keys', () => {
      const context: CalculationContext = {
        baseAmount: 1000,
        itemType: 'раб',
        markupSequence: [
          {
            name: 'Рост материалов',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'material_cost_growth',
            operand1MultiplyFormat: 'addOne'
          },
          {
            name: 'НДС',
            baseIndex: 0,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'nds_22',
            operand1MultiplyFormat: 'addOne'
          }
        ],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.stepDetails).toHaveLength(2);

      // Первый шаг
      expect(result.stepDetails[0].stepIndex).toBe(0);
      expect(result.stepDetails[0].stepName).toBe('Рост материалов');
      expect(result.stepDetails[0].parameterKeys).toContain('material_cost_growth');
      expect(result.stepDetails[0].baseValue).toBe(1000);
      expect(result.stepDetails[0].result).toBeCloseTo(1100, 2);
      expect(result.stepDetails[0].markupAmount).toBeCloseTo(100, 2);

      // Второй шаг
      expect(result.stepDetails[1].stepIndex).toBe(1);
      expect(result.stepDetails[1].stepName).toBe('НДС');
      expect(result.stepDetails[1].parameterKeys).toContain('nds_22');
      expect(result.stepDetails[1].baseValue).toBeCloseTo(1100, 2);
      expect(result.stepDetails[1].result).toBeCloseTo(1342, 2);
      expect(result.stepDetails[1].markupAmount).toBeCloseTo(242, 2);
    });

    it('should collect all operand keys in stepDetails', () => {
      const context: CalculationContext = {
        baseAmount: 1000,
        itemType: 'раб',
        markupSequence: [
          {
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'material_cost_growth',
            operand1MultiplyFormat: 'addOne',
            action2: 'multiply',
            operand2Type: 'markup',
            operand2Key: 'works_cost_growth',
            operand2MultiplyFormat: 'addOne'
          }
        ],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      expect(result.stepDetails[0].parameterKeys).toContain('material_cost_growth');
      expect(result.stepDetails[0].parameterKeys).toContain('works_cost_growth');
      expect(result.stepDetails[0].parameterKeys).toHaveLength(2);
    });

    it('should return empty stepDetails for empty sequence', () => {
      const context: CalculationContext = {
        baseAmount: 1000,
        itemType: 'мат',
        markupSequence: [],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.stepDetails).toHaveLength(0);
    });

    it('should return empty stepDetails for zero baseAmount', () => {
      const context: CalculationContext = {
        baseAmount: 0,
        itemType: 'мат',
        markupSequence: SINGLE_STEP_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.stepDetails).toHaveLength(0);
    });

    it('should calculate correct markupAmount as result minus baseValue', () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: FULL_WORK_SEQUENCE,
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);

      // Проверяем что markupAmount = result - baseValue для каждого шага
      for (const detail of result.stepDetails) {
        expect(detail.markupAmount).toBeCloseTo(detail.result - detail.baseValue, 2);
      }

      // Проверяем что сумма всех markupAmount равна общей наценке
      const totalMarkup = result.stepDetails.reduce((sum, d) => sum + d.markupAmount, 0);
      expect(totalMarkup).toBeCloseTo(result.commercialCost - context.baseAmount, 2);
    });
  });
});
