/**
 * Фикстуры BOQ элементов для тестов
 */

import type { BoqItem, BoqItemType } from '../../lib/supabase';

/**
 * Базовый материал (основной)
 */
export const BASIC_MATERIAL_ITEM: Partial<BoqItem> = {
  id: 'test-mat-1',
  boq_item_type: 'мат' as BoqItemType,
  material_type: 'основн.',
  total_amount: 10000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Вспомогательный материал
 */
export const AUXILIARY_MATERIAL_ITEM: Partial<BoqItem> = {
  id: 'test-mat-2',
  boq_item_type: 'мат' as BoqItemType,
  material_type: 'вспомогат.',
  total_amount: 5000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Работа
 */
export const WORK_ITEM: Partial<BoqItem> = {
  id: 'test-work-1',
  boq_item_type: 'раб' as BoqItemType,
  material_type: null,
  total_amount: 20000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Субподрядная работа
 */
export const SUBCONTRACT_WORK_ITEM: Partial<BoqItem> = {
  id: 'test-sub-work-1',
  boq_item_type: 'суб-раб' as BoqItemType,
  material_type: null,
  total_amount: 50000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: 'category-1'
};

/**
 * Субподрядная работа с исключением
 */
export const EXCLUDED_SUBCONTRACT_WORK_ITEM: Partial<BoqItem> = {
  id: 'test-sub-work-excluded',
  boq_item_type: 'суб-раб' as BoqItemType,
  material_type: null,
  total_amount: 30000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: 'excluded-category-1'
};

/**
 * Субподрядный материал
 */
export const SUBCONTRACT_MATERIAL_ITEM: Partial<BoqItem> = {
  id: 'test-sub-mat-1',
  boq_item_type: 'суб-мат' as BoqItemType,
  material_type: 'основн.',
  total_amount: 15000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: 'category-2'
};

/**
 * Компонентный материал
 */
export const COMPONENT_MATERIAL_ITEM: Partial<BoqItem> = {
  id: 'test-mat-comp-1',
  boq_item_type: 'мат-комп.' as BoqItemType,
  material_type: 'основн.',
  total_amount: 8000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Компонентная работа
 */
export const COMPONENT_WORK_ITEM: Partial<BoqItem> = {
  id: 'test-work-comp-1',
  boq_item_type: 'раб-комп.' as BoqItemType,
  material_type: null,
  total_amount: 12000,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Элемент с нулевой стоимостью
 */
export const ZERO_AMOUNT_ITEM: Partial<BoqItem> = {
  id: 'test-zero',
  boq_item_type: 'мат' as BoqItemType,
  material_type: 'основн.',
  total_amount: 0,
  commercial_markup: null,
  total_commercial_material_cost: null,
  total_commercial_work_cost: null,
  detail_cost_category_id: null
};

/**
 * Создает BOQ элемент из частичных данных
 */
export function createBoqItem(partial: Partial<BoqItem>): BoqItem {
  return {
    id: partial.id || 'test-item',
    client_position_id: partial.client_position_id || 'test-position',
    tender_id: partial.tender_id || 'test-tender',
    boq_item_type: partial.boq_item_type || 'мат',
    material_type: partial.material_type || null,
    name: partial.name || 'Test Item',
    unit_id: partial.unit_id || null,
    quantity: partial.quantity || 1,
    unit_price: partial.unit_price || 0,
    total_amount: partial.total_amount || 0,
    commercial_markup: partial.commercial_markup || null,
    total_commercial_material_cost: partial.total_commercial_material_cost || null,
    total_commercial_work_cost: partial.total_commercial_work_cost || null,
    detail_cost_category_id: partial.detail_cost_category_id || null,
    created_at: partial.created_at || new Date().toISOString(),
    updated_at: partial.updated_at || new Date().toISOString()
  } as BoqItem;
}
