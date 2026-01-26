/**
 * Unit тесты для функции validateMarkupSequence
 * Тестирует валидацию последовательности наценок
 */

import { describe, it, expect } from 'vitest';
import { validateMarkupSequence } from '../../../utils/markupCalculator';
import type { MarkupStep } from '../../../lib/supabase';
import {
  SINGLE_STEP_SEQUENCE,
  TWO_STEP_SEQUENCE,
  THREE_STEP_SEQUENCE,
  FULL_WORK_SEQUENCE,
  EMPTY_SEQUENCE,
  INVALID_BASE_INDEX_SEQUENCE,
  MISSING_ACTION_SEQUENCE
} from '../../fixtures/markupSequences';

describe('validateMarkupSequence', () => {
  describe('valid sequences', () => {
    it('should validate single step sequence', () => {
      const errors = validateMarkupSequence(SINGLE_STEP_SEQUENCE);
      expect(errors).toHaveLength(0);
    });

    it('should validate two step sequence', () => {
      const errors = validateMarkupSequence(TWO_STEP_SEQUENCE);
      expect(errors).toHaveLength(0);
    });

    it('should validate three step sequence', () => {
      const errors = validateMarkupSequence(THREE_STEP_SEQUENCE);
      expect(errors).toHaveLength(0);
    });

    it('should validate full work sequence', () => {
      const errors = validateMarkupSequence(FULL_WORK_SEQUENCE);
      expect(errors).toHaveLength(0);
    });

    it('should validate empty sequence', () => {
      const errors = validateMarkupSequence(EMPTY_SEQUENCE);
      expect(errors).toHaveLength(0);
    });

    it('should validate sequence with baseIndex = -1', () => {
      const sequence: MarkupStep[] = [{
        baseIndex: -1,
        action1: 'multiply',
        operand1Type: 'number',
        operand1Key: 2
      }];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toHaveLength(0);
    });

    it('should validate sequence with valid step reference', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        },
        {
          baseIndex: 0,
          action1: 'add',
          operand1Type: 'step',
          operand1Index: 0
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid baseIndex', () => {
    it('should detect baseIndex referencing future step', () => {
      const errors = validateMarkupSequence(INVALID_BASE_INDEX_SEQUENCE);
      expect(errors).toContain('Шаг 1: недопустимый baseIndex (1)');
    });

    it('should detect baseIndex = step count', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: 0, // Ссылается на себя (некорректно)
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain('Шаг 1: недопустимый baseIndex (0)');
    });

    it('should detect baseIndex < -1', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -2,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain('Шаг 1: недопустимый baseIndex (-2)');
    });

    it('should detect baseIndex > current step index', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        },
        {
          baseIndex: 5, // Шаг 5 не существует
          action1: 'add',
          operand1Type: 'number',
          operand1Key: 100
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain('Шаг 2: недопустимый baseIndex (5)');
    });
  });

  describe('missing action1', () => {
    it('should detect missing action1', () => {
      const errors = validateMarkupSequence(MISSING_ACTION_SEQUENCE);
      expect(errors).toContain('Шаг 1: отсутствует обязательная первая операция');
    });

    it('should detect undefined action1', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: undefined as any,
          operand1Type: 'number',
          operand1Key: 2
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain('Шаг 1: отсутствует обязательная первая операция');
    });

    it('should detect missing operand1Type', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: undefined as any,
          operand1Key: 2
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain('Шаг 1: отсутствует обязательная первая операция');
    });
  });

  describe('invalid step operand index', () => {
    it('should detect invalid operand1Index for step type', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'step',
          operand1Index: 5 // Ссылается на несуществующий шаг
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain("Шаг 1: недопустимый operand1Index для типа 'step'");
    });

    it('should detect undefined operand1Index for step type', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'step',
          operand1Index: undefined
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain("Шаг 1: недопустимый operand1Index для типа 'step'");
    });

    it('should detect invalid operand2Index for step type', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2,
          action2: 'add',
          operand2Type: 'step',
          operand2Index: 10 // Некорректный индекс
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain("Шаг 1: недопустимый operand2Index для типа 'step'");
    });

    it('should validate all operand indices (1-5)', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'step',
          operand1Index: 99,
          action2: 'add',
          operand2Type: 'step',
          operand2Index: 99,
          action3: 'subtract',
          operand3Type: 'step',
          operand3Index: 99,
          action4: 'multiply',
          operand4Type: 'step',
          operand4Index: 99,
          action5: 'divide',
          operand5Type: 'step',
          operand5Index: 99
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toContain("Шаг 1: недопустимый operand1Index для типа 'step'");
      expect(errors).toContain("Шаг 1: недопустимый operand2Index для типа 'step'");
      expect(errors).toContain("Шаг 1: недопустимый operand3Index для типа 'step'");
      expect(errors).toContain("Шаг 1: недопустимый operand4Index для типа 'step'");
      expect(errors).toContain("Шаг 1: недопустимый operand5Index для типа 'step'");
    });
  });

  describe('multiple errors', () => {
    it('should collect all errors in sequence', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -2, // Ошибка: некорректный baseIndex
          action1: undefined as any, // Ошибка: нет action1
          operand1Type: 'step',
          operand1Index: 10 // Ошибка: некорректный индекс
        },
        {
          baseIndex: 5, // Ошибка: ссылка на несуществующий шаг
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        }
      ];
      const errors = validateMarkupSequence(sequence);

      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors.some(e => e.includes('baseIndex (-2)'))).toBe(true);
      expect(errors.some(e => e.includes('baseIndex (5)'))).toBe(true);
      expect(errors.some(e => e.includes('отсутствует обязательная первая операция'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle sequence with valid step references', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2
        },
        {
          baseIndex: 0, // Валидно: ссылка на шаг 0
          action1: 'add',
          operand1Type: 'step',
          operand1Index: 0 // Валидно: ссылка на шаг 0
        },
        {
          baseIndex: 1, // Валидно: ссылка на шаг 1
          action1: 'multiply',
          operand1Type: 'step',
          operand1Index: 1 // Валидно: ссылка на шаг 1
        }
      ];
      const errors = validateMarkupSequence(sequence);
      expect(errors).toHaveLength(0);
    });

    it('should allow operandIndex = -1 for step type (baseAmount reference)', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'add',
          operand1Type: 'step',
          operand1Index: -1 // Ссылка на базовую сумму
        }
      ];
      const errors = validateMarkupSequence(sequence);
      // operandIndex = -1 валидно (ссылка на baseAmount)
      expect(errors).toHaveLength(0);
    });
  });
});
