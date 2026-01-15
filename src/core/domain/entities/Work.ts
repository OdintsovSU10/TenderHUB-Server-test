import type { UnitType, CurrencyType, WorkItemType } from '../value-objects';

/**
 * Entity: Наименование работы (справочник)
 */
export interface WorkName {
  id: string;
  name: string;
  unit: UnitType;
  created_at: string;
  updated_at: string;
}

/**
 * Entity: Работа в библиотеке (с расценками)
 */
export interface WorkLibrary {
  id: string;
  work_name_id: string;
  item_type: WorkItemType;
  unit_rate: number;
  currency_type?: CurrencyType;
  created_at: string;
  updated_at: string;
}

/**
 * Расширенный тип работы с JOIN данными
 */
export interface WorkLibraryFull extends WorkLibrary {
  work_name: string;
  unit: UnitType;
}

/**
 * DTO для создания наименования работы
 */
export interface WorkNameCreate {
  name: string;
  unit: UnitType;
}

/**
 * DTO для создания записи в библиотеке работ
 */
export interface WorkLibraryCreate {
  work_name_id: string;
  item_type: WorkItemType;
  unit_rate: number;
  currency_type?: CurrencyType;
}

/**
 * Проверка: является ли работа субподрядной
 */
export function isSubcontractWork(work: WorkLibrary): boolean {
  return work.item_type === 'суб-раб';
}

/**
 * Проверка: является ли работа компонентной
 */
export function isComponentWork(work: WorkLibrary): boolean {
  return work.item_type === 'раб-комп.';
}
