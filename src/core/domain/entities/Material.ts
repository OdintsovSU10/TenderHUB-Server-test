import type { UnitType, MaterialType, CurrencyType, DeliveryPriceType, MaterialItemType } from '../value-objects';

/**
 * Entity: Наименование материала (справочник)
 */
export interface MaterialName {
  id: string;
  name: string;
  unit: UnitType;
  created_at: string;
  updated_at: string;
}

/**
 * Entity: Материал в библиотеке (с расценками)
 */
export interface MaterialLibrary {
  id: string;
  material_type: MaterialType;
  item_type: MaterialItemType;
  consumption_coefficient?: number;
  unit_rate: number;
  currency_type?: CurrencyType;
  delivery_price_type?: DeliveryPriceType;
  delivery_amount?: number;
  material_name_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Расширенный тип материала с JOIN данными
 */
export interface MaterialLibraryFull extends MaterialLibrary {
  material_name: string;
  unit: UnitType;
}

/**
 * DTO для создания наименования материала
 */
export interface MaterialNameCreate {
  name: string;
  unit: UnitType;
}

/**
 * DTO для создания записи в библиотеке материалов
 */
export interface MaterialLibraryCreate {
  material_type: MaterialType;
  item_type: MaterialItemType;
  consumption_coefficient?: number;
  unit_rate: number;
  currency_type?: CurrencyType;
  delivery_price_type?: DeliveryPriceType;
  delivery_amount?: number;
  material_name_id: string;
}

/**
 * Расчет полной стоимости материала с учетом доставки
 */
export function calculateMaterialTotalRate(material: MaterialLibrary): number {
  const baseRate = material.unit_rate;

  if (material.delivery_price_type === 'суммой' && material.delivery_amount) {
    return baseRate + material.delivery_amount;
  }

  return baseRate;
}

/**
 * Проверка: является ли материал основным
 */
export function isBasicMaterialLibrary(material: MaterialLibrary): boolean {
  return material.material_type === 'основн.';
}

/**
 * Проверка: является ли материал вспомогательным
 */
export function isAuxiliaryMaterialLibrary(material: MaterialLibrary): boolean {
  return material.material_type === 'вспомогат.';
}
