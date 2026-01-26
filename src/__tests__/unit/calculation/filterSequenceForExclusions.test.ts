/**
 * Unit тесты для функции filterSequenceForExclusions
 * Тестирует фильтрацию последовательности для исключений субподряда
 */

import { describe, it, expect } from 'vitest';
import { filterSequenceForExclusions } from '../../../services/markupTactic/calculation';
import type { MarkupStep } from '../../../lib/supabase';
import { SUBCONTRACT_WORK_SEQUENCE } from '../../fixtures/markupSequences';

describe('filterSequenceForExclusions', () => {
  describe('when not excluded', () => {
    it('should return original sequence when isExcluded is false', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'subcontract_works_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }
      ];

      const result = filterSequenceForExclusions(sequence, false, 'суб-раб');
      expect(result).toHaveLength(1);
      expect(result[0].operand1Key).toBe('subcontract_works_cost_growth');
    });
  });

  describe('when excluded - subcontract work', () => {
    it('should remove step with subcontract_works_cost_growth', () => {
      const sequence: MarkupStep[] = [
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
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      expect(result).toHaveLength(1);
      expect(result[0].operand1Key).toBe('overhead_subcontract');
    });

    it('should update baseIndex after removing step', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'subcontract_works_cost_growth',
          operand1MultiplyFormat: 'addOne'
        },
        {
          baseIndex: 0, // Ссылается на удаляемый шаг
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'overhead_subcontract',
          operand1MultiplyFormat: 'addOne'
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      expect(result).toHaveLength(1);
      // baseIndex должен измениться на -1 (базовая стоимость)
      expect(result[0].baseIndex).toBe(-1);
    });

    it('should correctly recalculate baseIndex for remaining steps', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'subcontract_works_cost_growth', // Будет удален
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
          baseIndex: 1, // Ссылается на overhead_subcontract
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'profit_subcontract',
          operand1MultiplyFormat: 'addOne'
        },
        {
          baseIndex: 2, // Ссылается на profit_subcontract
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'nds_22',
          operand1MultiplyFormat: 'addOne'
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      expect(result).toHaveLength(3);
      // После удаления шага 0:
      // - шаг 1 (overhead) -> baseIndex -1 (был 0, ссылался на удаленный)
      // - шаг 2 (profit) -> baseIndex 0 (был 1, сдвинулся)
      // - шаг 3 (nds) -> baseIndex 1 (был 2, сдвинулся)
      expect(result[0].baseIndex).toBe(-1);
      expect(result[1].baseIndex).toBe(0);
      expect(result[2].baseIndex).toBe(1);
    });
  });

  describe('when excluded - subcontract material', () => {
    it('should remove step with subcontract_materials_cost_growth', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'subcontract_materials_cost_growth',
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

      const result = filterSequenceForExclusions(sequence, true, 'суб-мат');

      expect(result).toHaveLength(1);
      expect(result[0].operand1Key).toBe('nds_22');
      expect(result[0].baseIndex).toBe(-1);
    });

    it('should not remove subcontract_works_cost_growth for материал', () => {
      // Для суб-мат должен удаляться только subcontract_materials_cost_growth
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'subcontract_works_cost_growth', // Не должен удаляться для суб-мат
          operand1MultiplyFormat: 'addOne'
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-мат');

      expect(result).toHaveLength(1);
      expect(result[0].operand1Key).toBe('subcontract_works_cost_growth');
    });
  });

  describe('multiple operand keys', () => {
    it('should check all operand keys (1-5) for exclusion', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 2,
          action2: 'add',
          operand2Type: 'markup',
          operand2Key: 'subcontract_works_cost_growth', // В operand2
          operand2MultiplyFormat: 'addOne'
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      // Шаг должен быть удален, т.к. operand2Key содержит growth
      expect(result).toHaveLength(0);
    });

    it('should remove step if any operand contains growth key', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'overhead_subcontract',
          action2: 'add',
          operand2Type: 'number',
          operand2Key: 100,
          action3: 'multiply',
          operand3Type: 'markup',
          operand3Key: 'subcontract_works_cost_growth', // В operand3
          action4: 'multiply',
          operand4Type: 'number',
          operand4Key: 1.1
        }
      ];

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');
      expect(result).toHaveLength(0);
    });
  });

  describe('empty and edge cases', () => {
    it('should handle empty sequence', () => {
      const result = filterSequenceForExclusions([], true, 'суб-раб');
      expect(result).toHaveLength(0);
    });

    it('should handle sequence without growth keys', () => {
      const sequence: MarkupStep[] = [
        {
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'overhead_subcontract',
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

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      // Ничего не должно быть удалено
      expect(result).toHaveLength(2);
      expect(result[0].baseIndex).toBe(-1);
      expect(result[1].baseIndex).toBe(0);
    });

    it('should handle multiple steps with growth key', () => {
      const sequence: MarkupStep[] = [
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
          operand1Key: 'subcontract_works_cost_growth', // Еще один шаг с growth
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

      const result = filterSequenceForExclusions(sequence, true, 'суб-раб');

      expect(result).toHaveLength(1);
      expect(result[0].operand1Key).toBe('nds_22');
      expect(result[0].baseIndex).toBe(-1);
    });
  });

  describe('full subcontract work sequence', () => {
    it('should correctly filter SUBCONTRACT_WORK_SEQUENCE', () => {
      // Используем реальную фикстуру
      const result = filterSequenceForExclusions(SUBCONTRACT_WORK_SEQUENCE, true, 'суб-раб');

      // Первый шаг (subcontract_works_cost_growth) должен быть удален
      expect(result.length).toBe(SUBCONTRACT_WORK_SEQUENCE.length - 1);

      // Первый оставшийся шаг - overhead_subcontract с baseIndex = -1
      expect(result[0].operand1Key).toBe('overhead_subcontract');
      expect(result[0].baseIndex).toBe(-1);
    });
  });
});
