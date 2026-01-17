import type {
  BoqItemType,
  MaterialType,
  CurrencyType,
  DeliveryPriceType,
  UnitType,
} from '../value-objects';

/**
 * Entity: Элемент BOQ (Bill of Quantities)
 * Представляет материал или работу в позиции заказчика
 */
export interface BoqItem {
  id: string;

  // Связи
  tender_id: string;
  client_position_id: string;

  // Сортировка
  sort_number?: number;

  // Типы элементов
  boq_item_type: BoqItemType;
  material_type?: MaterialType | null;

  // Наименования (FK)
  material_name_id?: string | null;
  work_name_id?: string | null;

  // Единица измерения
  unit_code?: string | null;

  // Количественные показатели
  quantity?: number | null;
  base_quantity?: number | null;
  consumption_coefficient?: number | null;
  conversion_coefficient?: number | null;

  // Привязка материала к работе
  parent_work_item_id?: string | null;

  // Доставка
  delivery_price_type?: DeliveryPriceType | null;
  delivery_amount?: number | null;

  // Валюта и суммы
  currency_type?: CurrencyType;
  unit_rate?: number | null;
  total_amount?: number | null;

  // Затрата на строительство
  detail_cost_category_id?: string | null;

  // Примечание
  quote_link?: string | null;
  description?: string | null;

  // Коммерческие показатели
  commercial_markup?: number | null;
  total_commercial_material_cost?: number | null;
  total_commercial_work_cost?: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Optimistic concurrency
  row_version: number;
}

/**
 * Расширенный тип с JOIN данными для отображения
 */
export interface BoqItemFull extends BoqItem {
  // Данные из material_names
  material_name?: string;
  material_unit?: UnitType;

  // Данные из work_names
  work_name?: string;
  work_unit?: UnitType;

  // Данные из detail_cost_categories
  detail_cost_category_name?: string;
  detail_cost_category_full?: string; // Format: "Category / Detail / Location"

  // Данные из units
  unit_name?: string;

  // Данные родительской работы (для привязанных материалов)
  parent_work_name?: string;
  parent_work_unit?: UnitType;
  parent_work_quantity?: number;
}

/**
 * DTO для создания элемента BOQ
 */
export interface BoqItemCreate {
  tender_id: string;
  client_position_id: string;
  boq_item_type: BoqItemType;
  sort_number?: number;
  material_type?: MaterialType | null;
  material_name_id?: string | null;
  work_name_id?: string | null;
  unit_code?: string | null;
  quantity?: number | null;
  base_quantity?: number | null;
  consumption_coefficient?: number | null;
  conversion_coefficient?: number | null;
  parent_work_item_id?: string | null;
  delivery_price_type?: DeliveryPriceType | null;
  delivery_amount?: number | null;
  currency_type?: CurrencyType;
  unit_rate?: number | null;
  total_amount?: number | null;
  detail_cost_category_id?: string | null;
  quote_link?: string | null;
  description?: string | null;
}

/**
 * DTO для обновления коммерческих показателей
 */
export interface BoqItemCommercialUpdate {
  id: string;
  commercial_markup?: number | null;
  total_commercial_material_cost?: number | null;
  total_commercial_work_cost?: number | null;
}

/**
 * Проверка: является ли элемент материалом
 */
export function isBoqItemMaterial(item: BoqItem): boolean {
  return ['мат', 'суб-мат', 'мат-комп.'].includes(item.boq_item_type);
}

/**
 * Проверка: является ли элемент работой
 */
export function isBoqItemWork(item: BoqItem): boolean {
  return ['раб', 'суб-раб', 'раб-комп.'].includes(item.boq_item_type);
}

/**
 * Проверка: привязан ли материал к работе
 */
export function hasParentWork(item: BoqItem): boolean {
  return item.parent_work_item_id !== null && item.parent_work_item_id !== undefined;
}

/**
 * Расчет общей стоимости элемента
 */
export function calculateBoqItemTotal(item: BoqItem): number {
  if (item.total_amount !== null && item.total_amount !== undefined) {
    return item.total_amount;
  }
  const quantity = item.quantity ?? 0;
  const unitRate = item.unit_rate ?? 0;
  return quantity * unitRate;
}
