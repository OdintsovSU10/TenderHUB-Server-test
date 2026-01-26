/**
 * Unit тесты для функции applyOperation
 * Тестирует все математические операции калькулятора наценок
 */

import { describe, it, expect } from 'vitest';
import { applyOperation } from '../../../utils/markupCalculator';

describe('applyOperation', () => {
  describe('multiply', () => {
    it('should multiply two positive numbers correctly', () => {
      expect(applyOperation(100, 'multiply', 1.5)).toBe(150);
    });

    it('should multiply by 1 and return the same value', () => {
      expect(applyOperation(100, 'multiply', 1)).toBe(100);
    });

    it('should multiply by 0 and return 0', () => {
      expect(applyOperation(100, 'multiply', 0)).toBe(0);
    });

    it('should handle multiply with coefficient 1.10 (10% markup)', () => {
      expect(applyOperation(1000, 'multiply', 1.10)).toBeCloseTo(1100, 2);
    });

    it('should handle multiply with coefficient 1.22 (22% VAT)', () => {
      expect(applyOperation(1000, 'multiply', 1.22)).toBeCloseTo(1220, 2);
    });

    it('should handle negative multiplier', () => {
      expect(applyOperation(100, 'multiply', -0.5)).toBe(-50);
    });

    it('should handle decimal precision', () => {
      const result = applyOperation(100.123, 'multiply', 1.456);
      expect(result).toBeCloseTo(145.77909, 4);
    });

    it('should handle very small numbers', () => {
      const result = applyOperation(0.001, 'multiply', 1.5);
      expect(result).toBeCloseTo(0.0015, 6);
    });

    it('should handle very large numbers', () => {
      const result = applyOperation(1000000000, 'multiply', 1.5);
      expect(result).toBe(1500000000);
    });

    it('should handle negative base with positive multiplier', () => {
      expect(applyOperation(-100, 'multiply', 1.5)).toBe(-150);
    });

    it('should handle negative base with negative multiplier', () => {
      expect(applyOperation(-100, 'multiply', -1.5)).toBe(150);
    });
  });

  describe('divide', () => {
    it('should divide correctly', () => {
      expect(applyOperation(100, 'divide', 2)).toBe(50);
    });

    it('should divide by 1 and return the same value', () => {
      expect(applyOperation(100, 'divide', 1)).toBe(100);
    });

    it('should throw error on division by zero', () => {
      expect(() => applyOperation(100, 'divide', 0)).toThrow('Деление на ноль');
    });

    it('should handle decimal division', () => {
      const result = applyOperation(10, 'divide', 3);
      expect(result).toBeCloseTo(3.333, 2);
    });

    it('should handle division of negative numbers', () => {
      expect(applyOperation(-100, 'divide', 2)).toBe(-50);
    });

    it('should handle division by negative number', () => {
      expect(applyOperation(100, 'divide', -2)).toBe(-50);
    });

    it('should handle very small divisor', () => {
      const result = applyOperation(100, 'divide', 0.001);
      expect(result).toBe(100000);
    });

    it('should handle zero numerator', () => {
      expect(applyOperation(0, 'divide', 5)).toBe(0);
    });
  });

  describe('add', () => {
    it('should add correctly', () => {
      expect(applyOperation(100, 'add', 50)).toBe(150);
    });

    it('should add zero and return the same value', () => {
      expect(applyOperation(100, 'add', 0)).toBe(100);
    });

    it('should handle negative addition', () => {
      expect(applyOperation(100, 'add', -30)).toBe(70);
    });

    it('should handle adding to zero', () => {
      expect(applyOperation(0, 'add', 50)).toBe(50);
    });

    it('should handle adding negative numbers', () => {
      expect(applyOperation(-100, 'add', -50)).toBe(-150);
    });

    it('should handle decimal addition', () => {
      const result = applyOperation(100.25, 'add', 50.75);
      expect(result).toBe(151);
    });
  });

  describe('subtract', () => {
    it('should subtract correctly', () => {
      expect(applyOperation(100, 'subtract', 30)).toBe(70);
    });

    it('should subtract zero and return the same value', () => {
      expect(applyOperation(100, 'subtract', 0)).toBe(100);
    });

    it('should handle result going negative', () => {
      expect(applyOperation(50, 'subtract', 100)).toBe(-50);
    });

    it('should handle subtracting negative (effectively adding)', () => {
      expect(applyOperation(100, 'subtract', -50)).toBe(150);
    });

    it('should handle subtracting from zero', () => {
      expect(applyOperation(0, 'subtract', 50)).toBe(-50);
    });

    it('should handle decimal subtraction', () => {
      const result = applyOperation(100.75, 'subtract', 50.25);
      expect(result).toBeCloseTo(50.5, 2);
    });
  });

  describe('unknown operation', () => {
    it('should throw error for unknown operation', () => {
      expect(() => applyOperation(100, 'modulo' as any, 10)).toThrow('Неизвестная операция');
    });

    it('should throw error for empty operation', () => {
      expect(() => applyOperation(100, '' as any, 10)).toThrow('Неизвестная операция');
    });
  });

  describe('edge cases', () => {
    it('should handle Infinity in multiply', () => {
      expect(applyOperation(Infinity, 'multiply', 2)).toBe(Infinity);
    });

    it('should handle NaN propagation', () => {
      expect(applyOperation(NaN, 'multiply', 2)).toBeNaN();
    });

    it('should maintain precision for currency calculations', () => {
      // Тест на типичный расчет: 10000 * 1.10 * 1.22
      let result = applyOperation(10000, 'multiply', 1.10);
      result = applyOperation(result, 'multiply', 1.22);
      expect(result).toBeCloseTo(13420, 2);
    });
  });
});
