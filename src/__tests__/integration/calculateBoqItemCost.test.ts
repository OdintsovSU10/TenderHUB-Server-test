/**
 * Integration тесты для функции calculateBoqItemCost
 * Тестирует полный цикл расчета коммерческой стоимости для элементов BOQ
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBoqItemCost,
  type PricingDistribution,
  type SubcontractGrowthExclusions
} from '../../services/markupTactic/calculation';
import type { BoqItem, MarkupStep } from '../../lib/supabase';
import { STANDARD_MARKUP_PARAMETERS } from '../fixtures/markupParameters';
import {
  SINGLE_STEP_SEQUENCE,
  TWO_STEP_SEQUENCE,
  THREE_STEP_SEQUENCE,
  FULL_WORK_SEQUENCE,
  SUBCONTRACT_WORK_SEQUENCE
} from '../fixtures/markupSequences';
import {
  BASIC_MATERIAL_ITEM,
  AUXILIARY_MATERIAL_ITEM,
  WORK_ITEM,
  SUBCONTRACT_WORK_ITEM,
  EXCLUDED_SUBCONTRACT_WORK_ITEM,
  COMPONENT_MATERIAL_ITEM,
  COMPONENT_WORK_ITEM,
  ZERO_AMOUNT_ITEM,
  createBoqItem
} from '../fixtures/boqItems';

interface MarkupTactic {
  sequences: Record<string, MarkupStep[]>;
  base_costs?: Record<string, number>;
}

const createTactic = (sequences: Record<string, MarkupStep[]>): MarkupTactic => ({
  sequences,
  base_costs: {}
});

describe('calculateBoqItemCost integration', () => {
  describe('basic material calculations', () => {
    it('should calculate commercial cost for basic material with single step', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': SINGLE_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBeCloseTo(11000, 0); // 10000 * 1.10
      expect(result!.workCost).toBe(0);
      expect(result!.markupCoefficient).toBeCloseTo(1.10, 2);
    });

    it('should calculate commercial cost with growth and VAT', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': TWO_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      // 10000 * 1.10 * 1.22 = 13420
      expect(result!.materialCost).toBeCloseTo(13420, 0);
      expect(result!.workCost).toBe(0);
      expect(result!.markupCoefficient).toBeCloseTo(1.342, 3);
    });

    it('should calculate with three step chain', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': THREE_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      // 10000 * 1.10 * 1.10 * 1.22 = 14762
      expect(result!.materialCost).toBeCloseTo(14762, 0);
      expect(result!.markupCoefficient).toBeCloseTo(1.4762, 4);
    });
  });

  describe('auxiliary material calculations', () => {
    it('should calculate commercial cost for auxiliary material', () => {
      const item = createBoqItem(AUXILIARY_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': SINGLE_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBeCloseTo(5500, 0); // 5000 * 1.10
      expect(result!.workCost).toBe(0);
    });
  });

  describe('work calculations', () => {
    it('should calculate commercial cost for work with full chain', () => {
      const item = createBoqItem(WORK_ITEM);
      const tactic = createTactic({ 'раб': FULL_WORK_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      // 20000 * 1.10 * 1.10 * 1.10 * 1.22 = 32476.4
      expect(result!.materialCost).toBe(0);
      expect(result!.workCost).toBeCloseTo(32476.4, 1);
      expect(result!.markupCoefficient).toBeCloseTo(1.6238, 3);
    });
  });

  describe('subcontract work calculations', () => {
    it('should calculate commercial cost for subcontract work', () => {
      const item = createBoqItem(SUBCONTRACT_WORK_ITEM);
      const tactic = createTactic({ 'суб-раб': SUBCONTRACT_WORK_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      // 50000 * 1.10 * 1.10 * 1.16 * 1.22 ≈ 85543
      expect(result!.materialCost).toBe(0);
      expect(result!.workCost).toBeGreaterThan(80000);
    });

    it('should exclude growth for excluded categories', () => {
      const item = createBoqItem(EXCLUDED_SUBCONTRACT_WORK_ITEM);
      const tactic = createTactic({ 'суб-раб': SUBCONTRACT_WORK_SEQUENCE });
      const exclusions: SubcontractGrowthExclusions = {
        works: new Set(['excluded-category-1']),
        materials: new Set()
      };

      const resultWithExclusion = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        exclusions
      );

      const resultWithoutExclusion = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(resultWithExclusion).not.toBeNull();
      expect(resultWithoutExclusion).not.toBeNull();

      // Результат с исключением должен быть меньше (нет 10% роста субподряда)
      expect(resultWithExclusion!.workCost).toBeLessThan(resultWithoutExclusion!.workCost);
    });
  });

  describe('component material calculations', () => {
    it('should calculate commercial cost for component material', () => {
      const item = createBoqItem(COMPONENT_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат-комп.': SINGLE_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBeCloseTo(8800, 0); // 8000 * 1.10
      expect(result!.workCost).toBe(0);
    });
  });

  describe('component work calculations', () => {
    it('should calculate commercial cost for component work', () => {
      const item = createBoqItem(COMPONENT_WORK_ITEM);
      const tactic = createTactic({ 'раб-комп.': FULL_WORK_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBe(0);
      // 12000 * 1.10 * 1.10 * 1.10 * 1.22 = 19485.84
      expect(result!.workCost).toBeCloseTo(19485.84, 1);
    });
  });

  describe('pricing distribution', () => {
    it('should distribute material cost to work according to distribution', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': SINGLE_STEP_SEQUENCE });
      const distribution: PricingDistribution = {
        basic_material_base_target: 'work',
        basic_material_markup_target: 'work',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
      };

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        distribution,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBe(0);
      expect(result!.workCost).toBeCloseTo(11000, 0);
    });

    it('should split base and markup between material and work', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': SINGLE_STEP_SEQUENCE });
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'work', // Наценка идет в работы
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
      };

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        distribution,
        undefined
      );

      expect(result).not.toBeNull();
      // base = 10000, markup = 1000 (10%)
      expect(result!.materialCost).toBeCloseTo(10000, 0);
      expect(result!.workCost).toBeCloseTo(1000, 0);
    });
  });

  describe('edge cases', () => {
    it('should return null for missing sequence', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'раб': SINGLE_STEP_SEQUENCE }); // нет 'мат'

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).toBeNull();
    });

    it('should return null for empty sequence', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': [] });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).toBeNull();
    });

    it('should handle zero amount item', () => {
      const item = createBoqItem(ZERO_AMOUNT_ITEM);
      const tactic = createTactic({ 'мат': SINGLE_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.materialCost).toBe(0);
      expect(result!.workCost).toBe(0);
      expect(result!.markupCoefficient).toBe(1);
    });
  });

  describe('mathematical invariants', () => {
    it('should satisfy: materialCost + workCost = total commercial cost', () => {
      const testCases = [
        { item: BASIC_MATERIAL_ITEM, tactic: { 'мат': TWO_STEP_SEQUENCE } },
        { item: WORK_ITEM, tactic: { 'раб': FULL_WORK_SEQUENCE } },
        { item: AUXILIARY_MATERIAL_ITEM, tactic: { 'мат': SINGLE_STEP_SEQUENCE } }
      ];

      testCases.forEach(tc => {
        const item = createBoqItem(tc.item);
        const tactic = createTactic(tc.tactic);
        const result = calculateBoqItemCost(item, tactic, STANDARD_MARKUP_PARAMETERS, null, undefined);

        if (result && item.total_amount > 0) {
          const totalCommercial = result.materialCost + result.workCost;
          const expectedCommercial = item.total_amount * result.markupCoefficient;
          expect(totalCommercial).toBeCloseTo(expectedCommercial, 1);
        }
      });
    });

    it('should have markupCoefficient >= 1 for standard markups', () => {
      const item = createBoqItem(BASIC_MATERIAL_ITEM);
      const tactic = createTactic({ 'мат': TWO_STEP_SEQUENCE });

      const result = calculateBoqItemCost(
        item,
        tactic,
        STANDARD_MARKUP_PARAMETERS,
        null,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.markupCoefficient).toBeGreaterThanOrEqual(1);
    });
  });

  describe('all BOQ types coverage', () => {
    const allTypes = [
      { type: 'мат', sequence: 'мат', item: BASIC_MATERIAL_ITEM },
      { type: 'раб', sequence: 'раб', item: WORK_ITEM },
      { type: 'суб-мат', sequence: 'суб-мат', item: { ...BASIC_MATERIAL_ITEM, boq_item_type: 'суб-мат' } },
      { type: 'суб-раб', sequence: 'суб-раб', item: SUBCONTRACT_WORK_ITEM },
      { type: 'мат-комп.', sequence: 'мат-комп.', item: COMPONENT_MATERIAL_ITEM },
      { type: 'раб-комп.', sequence: 'раб-комп.', item: COMPONENT_WORK_ITEM }
    ];

    allTypes.forEach(tc => {
      it(`should calculate for ${tc.type}`, () => {
        const item = createBoqItem(tc.item);
        const tactic = createTactic({ [tc.sequence]: SINGLE_STEP_SEQUENCE });

        const result = calculateBoqItemCost(
          item,
          tactic,
          STANDARD_MARKUP_PARAMETERS,
          null,
          undefined
        );

        expect(result).not.toBeNull();
        expect(result!.markupCoefficient).toBeGreaterThan(0);
      });
    });
  });
});
