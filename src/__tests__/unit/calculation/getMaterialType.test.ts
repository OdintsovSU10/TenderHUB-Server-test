/**
 * Unit тесты для функции getMaterialType
 * Тестирует определение типа материала на основе boq_item_type и material_type
 */

import { describe, it, expect } from 'vitest';
import { getMaterialType } from '../../../services/markupTactic/calculation';

describe('getMaterialType', () => {
  describe('материалы (мат)', () => {
    it('should return "basic" for basic material', () => {
      const result = getMaterialType('мат', 'основн.');
      expect(result).toBe('basic');
    });

    it('should return "auxiliary" for auxiliary material', () => {
      const result = getMaterialType('мат', 'вспомогат.');
      expect(result).toBe('auxiliary');
    });

    it('should return "basic" when material_type is null', () => {
      const result = getMaterialType('мат', null);
      expect(result).toBe('basic');
    });

    it('should return "basic" when material_type is undefined', () => {
      const result = getMaterialType('мат', undefined);
      expect(result).toBe('basic');
    });

    it('should return "basic" for unknown material_type', () => {
      const result = getMaterialType('мат', 'unknown');
      expect(result).toBe('basic');
    });
  });

  describe('компонентные материалы (мат-комп.)', () => {
    it('should return "component_material" for basic component material', () => {
      const result = getMaterialType('мат-комп.', 'основн.');
      expect(result).toBe('component_material');
    });

    it('should return "auxiliary" for auxiliary component material', () => {
      const result = getMaterialType('мат-комп.', 'вспомогат.');
      expect(result).toBe('auxiliary');
    });

    it('should return "component_material" when material_type is null', () => {
      const result = getMaterialType('мат-комп.', null);
      expect(result).toBe('component_material');
    });
  });

  describe('субподрядные материалы (суб-мат)', () => {
    it('should return "subcontract_basic" for basic subcontract material', () => {
      const result = getMaterialType('суб-мат', 'основн.');
      expect(result).toBe('subcontract_basic');
    });

    it('should return "subcontract_auxiliary" for auxiliary subcontract material', () => {
      const result = getMaterialType('суб-мат', 'вспомогат.');
      expect(result).toBe('subcontract_auxiliary');
    });

    it('should return "subcontract_basic" when material_type is null', () => {
      const result = getMaterialType('суб-мат', null);
      expect(result).toBe('subcontract_basic');
    });
  });

  describe('работы (раб)', () => {
    it('should return "work" for work item', () => {
      const result = getMaterialType('раб', null);
      expect(result).toBe('work');
    });

    it('should return "work" regardless of material_type', () => {
      expect(getMaterialType('раб', 'основн.')).toBe('work');
      expect(getMaterialType('раб', 'вспомогат.')).toBe('work');
      expect(getMaterialType('раб', undefined)).toBe('work');
    });
  });

  describe('компонентные работы (раб-комп.)', () => {
    it('should return "component_work" for component work item', () => {
      const result = getMaterialType('раб-комп.', null);
      expect(result).toBe('component_work');
    });

    it('should return "component_work" regardless of material_type', () => {
      expect(getMaterialType('раб-комп.', 'основн.')).toBe('component_work');
      expect(getMaterialType('раб-комп.', undefined)).toBe('component_work');
    });
  });

  describe('субподрядные работы (суб-раб)', () => {
    it('should return "work" for subcontract work item', () => {
      const result = getMaterialType('суб-раб', null);
      expect(result).toBe('work');
    });

    it('should return "work" regardless of material_type', () => {
      expect(getMaterialType('суб-раб', 'основн.')).toBe('work');
      expect(getMaterialType('суб-раб', undefined)).toBe('work');
    });
  });

  describe('unknown types', () => {
    it('should return null for unknown boq_item_type', () => {
      const result = getMaterialType('unknown', null);
      expect(result).toBeNull();
    });

    it('should return null for empty string boq_item_type', () => {
      const result = getMaterialType('', null);
      expect(result).toBeNull();
    });
  });
});
