/**
 * Unit тесты для функции getOperandValue
 * Тестирует получение значений операндов разных типов
 */

import { describe, it, expect } from 'vitest';
import { getOperandValue } from '../../../utils/markupCalculator';
import { STANDARD_MARKUP_PARAMETERS } from '../../fixtures/markupParameters';

describe('getOperandValue', () => {
  describe('markup type with addOne format', () => {
    it('should convert 10% to 1.10 coefficient', () => {
      const result = getOperandValue(
        'markup',
        'material_cost_growth',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(1.10);
    });

    it('should convert 22% (VAT) to 1.22 coefficient', () => {
      const result = getOperandValue(
        'markup',
        'nds_22',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(1.22);
    });

    it('should convert 60% to 1.60 coefficient', () => {
      const result = getOperandValue(
        'markup',
        'works_16_markup',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(1.60);
    });

    it('should convert 0% markup to 1.0', () => {
      const params = new Map([['zero_markup', 0]]);
      const result = getOperandValue('markup', 'zero_markup', undefined, 'addOne', params, [], 0);
      expect(result).toBe(1.0);
    });

    it('should convert 100% markup to 2.0', () => {
      const params = new Map([['full_markup', 100]]);
      const result = getOperandValue('markup', 'full_markup', undefined, 'addOne', params, [], 0);
      expect(result).toBe(2.0);
    });

    it('should handle 5% markup correctly', () => {
      const result = getOperandValue(
        'markup',
        'mechanization_service',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(1.05);
    });

    it('should handle decimal markup values', () => {
      const params = new Map([['decimal_markup', 12.5]]);
      const result = getOperandValue('markup', 'decimal_markup', undefined, 'addOne', params, [], 0);
      expect(result).toBe(1.125);
    });
  });

  describe('markup type with direct format', () => {
    it('should convert 10% to 0.10', () => {
      const result = getOperandValue(
        'markup',
        'material_cost_growth',
        undefined,
        'direct',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(0.10);
    });

    it('should convert 22% to 0.22', () => {
      const result = getOperandValue(
        'markup',
        'nds_22',
        undefined,
        'direct',
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      expect(result).toBe(0.22);
    });

    it('should convert 0% to 0', () => {
      const params = new Map([['zero_markup', 0]]);
      const result = getOperandValue('markup', 'zero_markup', undefined, 'direct', params, [], 0);
      expect(result).toBe(0);
    });

    it('should convert 100% to 1.0', () => {
      const params = new Map([['full_markup', 100]]);
      const result = getOperandValue('markup', 'full_markup', undefined, 'direct', params, [], 0);
      expect(result).toBe(1.0);
    });
  });

  describe('markup type without format (defaults)', () => {
    it('should default to direct format when multiplyFormat is undefined', () => {
      const result = getOperandValue(
        'markup',
        'material_cost_growth',
        undefined,
        undefined,
        STANDARD_MARKUP_PARAMETERS,
        [],
        0
      );
      // По умолчанию без формата должен вернуть прямое значение / 100
      expect(result).toBe(0.10);
    });
  });

  describe('step type', () => {
    const stepResults = [100, 150, 200, 250];

    it('should return step result by index 0', () => {
      const result = getOperandValue('step', undefined, 0, undefined, undefined, stepResults, 0);
      expect(result).toBe(100);
    });

    it('should return step result by index 1', () => {
      const result = getOperandValue('step', undefined, 1, undefined, undefined, stepResults, 0);
      expect(result).toBe(150);
    });

    it('should return step result by last index', () => {
      const result = getOperandValue('step', undefined, 3, undefined, undefined, stepResults, 0);
      expect(result).toBe(250);
    });

    it('should return baseAmount for index -1', () => {
      const result = getOperandValue('step', undefined, -1, undefined, undefined, stepResults, 1000);
      expect(result).toBe(1000);
    });

    it('should throw error for invalid positive index', () => {
      expect(() => getOperandValue('step', undefined, 10, undefined, undefined, stepResults, 0))
        .toThrow('Недопустимый индекс шага');
    });

    it('should throw error for negative index other than -1', () => {
      expect(() => getOperandValue('step', undefined, -2, undefined, undefined, stepResults, 0))
        .toThrow('Недопустимый индекс шага');
    });

    it('should throw error when stepResults is undefined', () => {
      expect(() => getOperandValue('step', undefined, 0, undefined, undefined, undefined, 0))
        .toThrow('Не указан индекс шага или отсутствуют результаты шагов');
    });

    it('should throw error when operandIndex is undefined', () => {
      expect(() => getOperandValue('step', undefined, undefined, undefined, undefined, stepResults, 0))
        .toThrow('Не указан индекс шага или отсутствуют результаты шагов');
    });
  });

  describe('number type', () => {
    it('should return numeric value', () => {
      const result = getOperandValue('number', 42, undefined, undefined, undefined, [], 0);
      expect(result).toBe(42);
    });

    it('should return decimal numeric value', () => {
      const result = getOperandValue('number', 3.14159, undefined, undefined, undefined, [], 0);
      expect(result).toBeCloseTo(3.14159, 5);
    });

    it('should handle string number conversion', () => {
      const result = getOperandValue('number', '42' as any, undefined, undefined, undefined, [], 0);
      expect(result).toBe(42);
    });

    it('should return 0 for number 0', () => {
      const result = getOperandValue('number', 0, undefined, undefined, undefined, [], 0);
      expect(result).toBe(0);
    });

    it('should handle negative numbers', () => {
      const result = getOperandValue('number', -50, undefined, undefined, undefined, [], 0);
      expect(result).toBe(-50);
    });

    it('should throw error when operandKey is undefined', () => {
      expect(() => getOperandValue('number', undefined, undefined, undefined, undefined, [], 0))
        .toThrow('Не указано числовое значение');
    });
  });

  describe('error cases', () => {
    it('should throw error for missing markup key', () => {
      expect(() => getOperandValue('markup', 'nonexistent_key', undefined, 'addOne', STANDARD_MARKUP_PARAMETERS, [], 0))
        .toThrow('Параметр наценки "nonexistent_key" не найден');
    });

    it('should throw error when markupParameters is undefined for markup type', () => {
      expect(() => getOperandValue('markup', 'material_cost_growth', undefined, 'addOne', undefined, [], 0))
        .toThrow('Не указан ключ наценки или отсутствуют параметры наценок');
    });

    it('should throw error for undefined operandType', () => {
      expect(() => getOperandValue(undefined, undefined, undefined, undefined, undefined, [], 0))
        .toThrow('Не указан тип операнда');
    });

    it('should throw error for unknown operandType', () => {
      expect(() => getOperandValue('unknown' as any, undefined, undefined, undefined, undefined, [], 0))
        .toThrow('Неизвестный тип операнда');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical material cost growth calculation', () => {
      // 10% рост стоимости материалов
      const result = getOperandValue(
        'markup',
        'material_cost_growth',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        10000
      );
      expect(result).toBe(1.10);
    });

    it('should handle typical VAT calculation', () => {
      // 22% НДС
      const result = getOperandValue(
        'markup',
        'nds_22',
        undefined,
        'addOne',
        STANDARD_MARKUP_PARAMETERS,
        [],
        10000
      );
      expect(result).toBe(1.22);
    });

    it('should handle chain calculation with step reference', () => {
      // Симуляция: результат предыдущего шага = 11000 (после 10% роста)
      const stepResults = [11000];
      const result = getOperandValue(
        'step',
        undefined,
        0,
        undefined,
        undefined,
        stepResults,
        10000
      );
      expect(result).toBe(11000);
    });
  });
});
