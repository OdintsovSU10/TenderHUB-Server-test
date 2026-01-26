/**
 * Unit тесты для функции getBaseValue
 * Тестирует получение базового значения для шага расчета
 */

import { describe, it, expect } from 'vitest';
import { getBaseValue } from '../../../utils/markupCalculator';

describe('getBaseValue', () => {
  describe('baseIndex = -1 (use baseAmount)', () => {
    it('should return baseAmount when baseIndex is -1', () => {
      const result = getBaseValue(-1, 10000, []);
      expect(result).toBe(10000);
    });

    it('should return baseAmount even when stepResults has values', () => {
      const result = getBaseValue(-1, 10000, [5000, 6000, 7000]);
      expect(result).toBe(10000);
    });

    it('should return 0 baseAmount when baseIndex is -1', () => {
      const result = getBaseValue(-1, 0, []);
      expect(result).toBe(0);
    });

    it('should return negative baseAmount when baseIndex is -1', () => {
      const result = getBaseValue(-1, -100, []);
      expect(result).toBe(-100);
    });

    it('should handle decimal baseAmount', () => {
      const result = getBaseValue(-1, 10000.50, []);
      expect(result).toBe(10000.50);
    });
  });

  describe('baseIndex >= 0 (use stepResults)', () => {
    const stepResults = [11000, 12100, 14762];

    it('should return first step result when baseIndex is 0', () => {
      const result = getBaseValue(0, 10000, stepResults);
      expect(result).toBe(11000);
    });

    it('should return second step result when baseIndex is 1', () => {
      const result = getBaseValue(1, 10000, stepResults);
      expect(result).toBe(12100);
    });

    it('should return last step result when baseIndex is last index', () => {
      const result = getBaseValue(2, 10000, stepResults);
      expect(result).toBe(14762);
    });

    it('should handle single-element stepResults', () => {
      const result = getBaseValue(0, 10000, [5500]);
      expect(result).toBe(5500);
    });
  });

  describe('error cases', () => {
    it('should throw error when baseIndex exceeds stepResults length', () => {
      expect(() => getBaseValue(5, 10000, [11000, 12100]))
        .toThrow('Недопустимый baseIndex: 5');
    });

    it('should throw error when stepResults is empty but baseIndex >= 0', () => {
      expect(() => getBaseValue(0, 10000, []))
        .toThrow('Недопустимый baseIndex: 0');
    });

    it('should throw error for baseIndex < -1', () => {
      expect(() => getBaseValue(-2, 10000, [11000]))
        .toThrow('Недопустимый baseIndex: -2');
    });

    it('should throw error for large negative baseIndex', () => {
      expect(() => getBaseValue(-100, 10000, [11000]))
        .toThrow('Недопустимый baseIndex: -100');
    });
  });

  describe('edge cases', () => {
    it('should handle stepResults with zero values', () => {
      const result = getBaseValue(1, 10000, [0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should handle stepResults with negative values', () => {
      const result = getBaseValue(0, 10000, [-5000]);
      expect(result).toBe(-5000);
    });

    it('should handle very large numbers', () => {
      const largeNumber = 1000000000000;
      const result = getBaseValue(0, largeNumber, [largeNumber * 1.1]);
      expect(result).toBe(largeNumber * 1.1);
    });

    it('should handle decimal precision', () => {
      const result = getBaseValue(0, 10000, [10000.123456789]);
      expect(result).toBeCloseTo(10000.123456789, 6);
    });
  });

  describe('real-world calculation scenarios', () => {
    it('should work in typical chain calculation', () => {
      // Симуляция: база 10000, после 10% роста = 11000, после еще 10% = 12100
      const stepResults = [11000, 12100];

      // Шаг 3 берет результат шага 2
      const result = getBaseValue(1, 10000, stepResults);
      expect(result).toBe(12100);
    });

    it('should support multiple steps referencing different bases', () => {
      // Шаг 0: 10000 * 1.10 = 11000
      // Шаг 1: 10000 * 1.05 = 10500 (ссылка на базу)
      // Шаг 2: 11000 + 10500 (сумма шагов 0 и 1)
      const stepResults = [11000, 10500, 21500];

      expect(getBaseValue(-1, 10000, stepResults)).toBe(10000);
      expect(getBaseValue(0, 10000, stepResults)).toBe(11000);
      expect(getBaseValue(1, 10000, stepResults)).toBe(10500);
      expect(getBaseValue(2, 10000, stepResults)).toBe(21500);
    });
  });
});
