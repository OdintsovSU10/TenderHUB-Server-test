/**
 * Контрактные тесты для расчетов наценок
 * Фиксируют ожидаемые результаты для регрессионного тестирования
 */

import { describe, it, expect } from 'vitest';
import { calculateMarkupResult, type CalculationContext } from '../../utils/markupCalculator';
import { calculateBoqItemCost } from '../../services/markupTactic/calculation';
import {
  PRODUCTION_TEST_CASES,
  MATHEMATICAL_INVARIANTS,
  CALCULATION_TOLERANCE
} from '../fixtures/expectedResults';
import { STANDARD_MARKUP_PARAMETERS } from '../fixtures/markupParameters';
import { createBoqItem } from '../fixtures/boqItems';

describe('Markup Calculation Contract Tests', () => {
  describe('Production Scenarios', () => {
    PRODUCTION_TEST_CASES.forEach((testCase, index) => {
      it(`should match expected result for: ${testCase.name}`, () => {
        const context: CalculationContext = {
          baseAmount: testCase.input.baseAmount,
          itemType: testCase.input.itemType as any,
          markupSequence: testCase.input.sequence,
          markupParameters: testCase.input.parameters
        };

        const result = calculateMarkupResult(context);

        // Проверка коммерческой стоимости
        expect(result.commercialCost).toBeCloseTo(
          testCase.expected.commercialCost,
          0 // Допуск до 1 рубля
        );

        // Проверка коэффициента наценки
        expect(result.markupCoefficient).toBeCloseTo(
          testCase.expected.markupCoefficient,
          3
        );

        // Без ошибок
        expect(result.errors).toBeUndefined();
      });
    });
  });

  describe('Mathematical Invariants', () => {
    it('should always satisfy: coefficient * baseAmount ≈ commercialCost', () => {
      const testCases = [
        { base: 10000, params: STANDARD_MARKUP_PARAMETERS },
        { base: 50000, params: STANDARD_MARKUP_PARAMETERS },
        { base: 100000, params: STANDARD_MARKUP_PARAMETERS },
        { base: 1000000, params: STANDARD_MARKUP_PARAMETERS }
      ];

      testCases.forEach(tc => {
        const context: CalculationContext = {
          baseAmount: tc.base,
          itemType: 'мат',
          markupSequence: [{
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'material_cost_growth',
            operand1MultiplyFormat: 'addOne'
          }],
          markupParameters: tc.params
        };

        const result = calculateMarkupResult(context);
        const expectedCost = tc.base * result.markupCoefficient;

        expect(MATHEMATICAL_INVARIANTS.coefficientInvariant(
          tc.base,
          result.markupCoefficient,
          result.commercialCost,
          CALCULATION_TOLERANCE
        )).toBe(true);
      });
    });

    it('should always have markupCoefficient >= 0 for positive baseAmount', () => {
      const testAmounts = [1, 100, 1000, 10000, 100000, 1000000];

      testAmounts.forEach(amount => {
        const context: CalculationContext = {
          baseAmount: amount,
          itemType: 'мат',
          markupSequence: [{
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.5
          }],
          markupParameters: new Map()
        };

        const result = calculateMarkupResult(context);

        expect(MATHEMATICAL_INVARIANTS.coefficientPositive(
          result.markupCoefficient,
          amount
        )).toBe(true);
      });
    });

    it('should preserve relative proportions in chain calculations', () => {
      // Если base1 = 2 * base2, то commercial1 = 2 * commercial2
      const context1: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const context2: CalculationContext = {
        ...context1,
        baseAmount: 20000
      };

      const result1 = calculateMarkupResult(context1);
      const result2 = calculateMarkupResult(context2);

      // result2.commercialCost должен быть ровно в 2 раза больше
      expect(result2.commercialCost).toBeCloseTo(result1.commercialCost * 2, CALCULATION_TOLERANCE);
    });
  });

  describe('Consistency Tests', () => {
    it('should produce same result for same input', () => {
      const context: CalculationContext = {
        baseAmount: 12345.67,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }, {
          baseIndex: 0,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'nds_22',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      // Запускаем 10 раз - результат должен быть идентичным
      const results = Array.from({ length: 10 }, () => calculateMarkupResult(context));

      const firstResult = results[0];
      results.forEach((result, i) => {
        expect(result.commercialCost).toBe(firstResult.commercialCost);
        expect(result.markupCoefficient).toBe(firstResult.markupCoefficient);
      });
    });

    it('should be commutative for multiplication chain', () => {
      // A * B * C = C * B * A (для чистых умножений)
      const params = new Map([
        ['a', 10],
        ['b', 20],
        ['c', 30]
      ]);

      const sequenceABC = [
        { baseIndex: -1, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'a', operand1MultiplyFormat: 'addOne' as const },
        { baseIndex: 0, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'b', operand1MultiplyFormat: 'addOne' as const },
        { baseIndex: 1, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'c', operand1MultiplyFormat: 'addOne' as const }
      ];

      const sequenceCBA = [
        { baseIndex: -1, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'c', operand1MultiplyFormat: 'addOne' as const },
        { baseIndex: 0, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'b', operand1MultiplyFormat: 'addOne' as const },
        { baseIndex: 1, action1: 'multiply' as const, operand1Type: 'markup' as const, operand1Key: 'a', operand1MultiplyFormat: 'addOne' as const }
      ];

      const resultABC = calculateMarkupResult({
        baseAmount: 1000,
        itemType: 'мат',
        markupSequence: sequenceABC,
        markupParameters: params
      });

      const resultCBA = calculateMarkupResult({
        baseAmount: 1000,
        itemType: 'мат',
        markupSequence: sequenceCBA,
        markupParameters: params
      });

      expect(resultABC.commercialCost).toBeCloseTo(resultCBA.commercialCost, 2);
    });
  });

  describe('Precision Tests', () => {
    it('should maintain precision for small amounts', () => {
      const context: CalculationContext = {
        baseAmount: 0.01, // 1 копейка
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBeCloseTo(0.011, 4); // 0.01 * 1.10
    });

    it('should handle large amounts without overflow', () => {
      const context: CalculationContext = {
        baseAmount: 999999999999, // ~1 триллион
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      };

      const result = calculateMarkupResult(context);
      expect(result.commercialCost).toBeCloseTo(999999999999 * 1.10, -6);
      expect(Number.isFinite(result.commercialCost)).toBe(true);
    });
  });

  describe('Regression Guard', () => {
    // Эти тесты фиксируют конкретные результаты
    // Если они упадут - значит изменилась логика расчета

    it('REGRESSION: 10000 * 1.10 = 11000', () => {
      const result = calculateMarkupResult({
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      });
      expect(result.commercialCost).toBe(11000);
    });

    it('REGRESSION: 10000 * 1.10 * 1.22 = 13420', () => {
      const result = calculateMarkupResult({
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [
          { baseIndex: -1, action1: 'multiply', operand1Type: 'markup', operand1Key: 'material_cost_growth', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 0, action1: 'multiply', operand1Type: 'markup', operand1Key: 'nds_22', operand1MultiplyFormat: 'addOne' }
        ],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      });
      expect(result.commercialCost).toBe(13420);
    });

    it('REGRESSION: 10000 * 1.10 * 1.10 * 1.22 = 14762', () => {
      const result = calculateMarkupResult({
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [
          { baseIndex: -1, action1: 'multiply', operand1Type: 'markup', operand1Key: 'material_cost_growth', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 0, action1: 'multiply', operand1Type: 'markup', operand1Key: 'overhead_own_forces', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 1, action1: 'multiply', operand1Type: 'markup', operand1Key: 'nds_22', operand1MultiplyFormat: 'addOne' }
        ],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      });
      // 10000 * 1.10 * 1.10 * 1.22 = 14762.0
      expect(result.commercialCost).toBeCloseTo(14762, 0);
    });

    it('REGRESSION: 20000 * 1.10^3 * 1.22 ≈ 32476.4', () => {
      const result = calculateMarkupResult({
        baseAmount: 20000,
        itemType: 'раб',
        markupSequence: [
          { baseIndex: -1, action1: 'multiply', operand1Type: 'markup', operand1Key: 'works_cost_growth', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 0, action1: 'multiply', operand1Type: 'markup', operand1Key: 'overhead_own_forces', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 1, action1: 'multiply', operand1Type: 'markup', operand1Key: 'profit_own_forces', operand1MultiplyFormat: 'addOne' },
          { baseIndex: 2, action1: 'multiply', operand1Type: 'markup', operand1Key: 'nds_22', operand1MultiplyFormat: 'addOne' }
        ],
        markupParameters: STANDARD_MARKUP_PARAMETERS
      });
      // 20000 * 1.10 * 1.10 * 1.10 * 1.22 = 32476.4
      expect(result.commercialCost).toBeCloseTo(32476.4, 1);
    });
  });
});
