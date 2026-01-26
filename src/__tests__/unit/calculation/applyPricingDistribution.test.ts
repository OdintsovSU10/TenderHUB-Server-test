/**
 * Unit тесты для функции applyPricingDistribution
 * Тестирует распределение коммерческой стоимости между материалами и работами
 */

import { describe, it, expect } from 'vitest';
import {
  applyPricingDistribution,
  type PricingDistribution
} from '../../../services/markupTactic/calculation';

describe('applyPricingDistribution', () => {
  describe('without distribution (null)', () => {
    it('should put all cost to materialCost for material type', () => {
      const result = applyPricingDistribution(10000, 13420, 'мат', 'основн.', null);
      expect(result.materialCost).toBe(13420);
      expect(result.workCost).toBe(0);
    });

    it('should put all cost to materialCost for auxiliary material type', () => {
      const result = applyPricingDistribution(5000, 6710, 'мат', 'вспомогат.', null);
      expect(result.materialCost).toBe(6710);
      expect(result.workCost).toBe(0);
    });

    it('should put all cost to materialCost for subcontract material', () => {
      const result = applyPricingDistribution(15000, 20130, 'суб-мат', 'основн.', null);
      expect(result.materialCost).toBe(20130);
      expect(result.workCost).toBe(0);
    });

    it('should put all cost to materialCost for component material', () => {
      const result = applyPricingDistribution(8000, 10736, 'мат-комп.', 'основн.', null);
      expect(result.materialCost).toBe(10736);
      expect(result.workCost).toBe(0);
    });

    it('should put all cost to workCost for work type', () => {
      const result = applyPricingDistribution(20000, 32477, 'раб', null, null);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(32477);
    });

    it('should put all cost to workCost for subcontract work', () => {
      const result = applyPricingDistribution(50000, 75000, 'суб-раб', null, null);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(75000);
    });

    it('should put all cost to workCost for component work', () => {
      const result = applyPricingDistribution(12000, 18000, 'раб-комп.', null, null);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(18000);
    });
  });

  describe('with distribution - basic material', () => {
    const distribution: PricingDistribution = {
      basic_material_base_target: 'material',
      basic_material_markup_target: 'material',
      auxiliary_material_base_target: 'material',
      auxiliary_material_markup_target: 'material',
      work_base_target: 'work',
      work_markup_target: 'work'
    };

    it('should put base and markup to material', () => {
      // base = 10000, commercial = 13420, markup = 3420
      const result = applyPricingDistribution(10000, 13420, 'мат', 'основн.', distribution);
      expect(result.materialCost).toBe(13420); // 10000 + 3420
      expect(result.workCost).toBe(0);
    });

    it('should split base to material and markup to work', () => {
      const splitDistribution: PricingDistribution = {
        ...distribution,
        basic_material_base_target: 'material',
        basic_material_markup_target: 'work'
      };
      // base = 10000, commercial = 13420, markup = 3420
      const result = applyPricingDistribution(10000, 13420, 'мат', 'основн.', splitDistribution);
      expect(result.materialCost).toBe(10000); // только база
      expect(result.workCost).toBe(3420); // только наценка
    });

    it('should put both to work', () => {
      const workDistribution: PricingDistribution = {
        ...distribution,
        basic_material_base_target: 'work',
        basic_material_markup_target: 'work'
      };
      const result = applyPricingDistribution(10000, 13420, 'мат', 'основн.', workDistribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(13420);
    });
  });

  describe('with distribution - auxiliary material', () => {
    const distribution: PricingDistribution = {
      basic_material_base_target: 'material',
      basic_material_markup_target: 'material',
      auxiliary_material_base_target: 'work',
      auxiliary_material_markup_target: 'material',
      work_base_target: 'work',
      work_markup_target: 'work'
    };

    it('should split auxiliary material according to distribution', () => {
      // base = 5000, commercial = 6710, markup = 1710
      const result = applyPricingDistribution(5000, 6710, 'мат', 'вспомогат.', distribution);
      expect(result.materialCost).toBe(1710); // только наценка
      expect(result.workCost).toBe(5000); // только база
    });
  });

  describe('with distribution - work', () => {
    const distribution: PricingDistribution = {
      basic_material_base_target: 'material',
      basic_material_markup_target: 'material',
      auxiliary_material_base_target: 'material',
      auxiliary_material_markup_target: 'material',
      work_base_target: 'work',
      work_markup_target: 'work'
    };

    it('should put all work to workCost', () => {
      const result = applyPricingDistribution(20000, 32477, 'раб', null, distribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(32477);
    });

    it('should split work base to material, markup to work', () => {
      const splitDistribution: PricingDistribution = {
        ...distribution,
        work_base_target: 'material',
        work_markup_target: 'work'
      };
      // base = 20000, commercial = 32477, markup = 12477
      const result = applyPricingDistribution(20000, 32477, 'раб', null, splitDistribution);
      expect(result.materialCost).toBe(20000);
      expect(result.workCost).toBe(12477);
    });
  });

  describe('with distribution - component material', () => {
    it('should use component_material settings when available', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        component_material_base_target: 'work',
        component_material_markup_target: 'work',
        work_base_target: 'work',
        work_markup_target: 'work'
      };
      // base = 8000, commercial = 10736, markup = 2736
      const result = applyPricingDistribution(8000, 10736, 'мат-комп.', 'основн.', distribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(10736);
    });

    it('should fallback to auxiliary when component_material settings missing', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'work',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
        // component_material_* not set
      };
      // base = 8000, commercial = 10736, markup = 2736
      // fallback to auxiliary: base -> work, markup -> material
      const result = applyPricingDistribution(8000, 10736, 'мат-комп.', 'основн.', distribution);
      expect(result.materialCost).toBe(2736); // markup -> material
      expect(result.workCost).toBe(8000); // base -> work
    });
  });

  describe('with distribution - component work', () => {
    it('should use component_work settings when available', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work',
        component_work_base_target: 'material',
        component_work_markup_target: 'material'
      };
      // base = 12000, commercial = 18000, markup = 6000
      const result = applyPricingDistribution(12000, 18000, 'раб-комп.', null, distribution);
      expect(result.materialCost).toBe(18000);
      expect(result.workCost).toBe(0);
    });

    it('should fallback to work when component_work settings missing', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
        // component_work_* not set
      };
      const result = applyPricingDistribution(12000, 18000, 'раб-комп.', null, distribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(18000);
    });
  });

  describe('with distribution - subcontract material', () => {
    it('should use subcontract settings when available', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work',
        subcontract_basic_material_base_target: 'material',
        subcontract_basic_material_markup_target: 'work'
      };
      // base = 15000, commercial = 20130, markup = 5130
      const result = applyPricingDistribution(15000, 20130, 'суб-мат', 'основн.', distribution);
      expect(result.materialCost).toBe(15000); // base -> material
      expect(result.workCost).toBe(5130); // markup -> work
    });

    it('should fallback to old logic when subcontract settings missing', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
        // subcontract_* not set - should fallback to workCost
      };
      const result = applyPricingDistribution(15000, 20130, 'суб-мат', 'основн.', distribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(20130); // все в work
    });
  });

  describe('unknown type handling', () => {
    it('should put all to workCost for unknown type', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'material',
        auxiliary_material_base_target: 'material',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'work',
        work_markup_target: 'work'
      };
      const result = applyPricingDistribution(10000, 15000, 'unknown', null, distribution);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(15000);
    });
  });

  describe('mathematical invariants', () => {
    it('should always satisfy: materialCost + workCost = commercialCost', () => {
      const distribution: PricingDistribution = {
        basic_material_base_target: 'material',
        basic_material_markup_target: 'work',
        auxiliary_material_base_target: 'work',
        auxiliary_material_markup_target: 'material',
        work_base_target: 'material',
        work_markup_target: 'work'
      };

      const testCases = [
        { base: 10000, commercial: 13420, type: 'мат', matType: 'основн.' },
        { base: 5000, commercial: 6710, type: 'мат', matType: 'вспомогат.' },
        { base: 20000, commercial: 32477, type: 'раб', matType: null },
        { base: 50000, commercial: 75000, type: 'суб-раб', matType: null }
      ];

      testCases.forEach(tc => {
        const result = applyPricingDistribution(tc.base, tc.commercial, tc.type, tc.matType, distribution);
        const sum = result.materialCost + result.workCost;
        expect(sum).toBeCloseTo(tc.commercial, 2);
      });
    });

    it('should handle zero baseAmount', () => {
      const result = applyPricingDistribution(0, 0, 'мат', 'основн.', null);
      expect(result.materialCost).toBe(0);
      expect(result.workCost).toBe(0);
    });

    it('should handle negative markup (commercialCost < baseAmount)', () => {
      // Редкий случай когда коммерческая < базовой
      const result = applyPricingDistribution(10000, 9000, 'мат', 'основн.', null);
      expect(result.materialCost).toBe(9000);
      expect(result.workCost).toBe(0);
    });
  });
});
