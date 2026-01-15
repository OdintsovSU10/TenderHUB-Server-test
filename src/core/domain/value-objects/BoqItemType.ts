/**
 * Value Object: Тип элемента BOQ (Bill of Quantities)
 *
 * Типы элементов:
 * - 'мат' - Материал (основной)
 * - 'суб-мат' - Субподрядный материал
 * - 'мат-комп.' - Компонентный материал
 * - 'раб' - Работа (основная)
 * - 'суб-раб' - Субподрядная работа
 * - 'раб-комп.' - Компонентная работа
 */
export type BoqItemType = 'мат' | 'суб-мат' | 'мат-комп.' | 'раб' | 'суб-раб' | 'раб-комп.';

/**
 * Подтип для материалов
 */
export type MaterialItemType = Extract<BoqItemType, 'мат' | 'суб-мат' | 'мат-комп.'>;

/**
 * Подтип для работ
 */
export type WorkItemType = Extract<BoqItemType, 'раб' | 'суб-раб' | 'раб-комп.'>;

/**
 * Проверка: является ли тип материалом
 */
export function isMaterialType(type: BoqItemType): type is MaterialItemType {
  return type === 'мат' || type === 'суб-мат' || type === 'мат-комп.';
}

/**
 * Проверка: является ли тип работой
 */
export function isWorkType(type: BoqItemType): type is WorkItemType {
  return type === 'раб' || type === 'суб-раб' || type === 'раб-комп.';
}

/**
 * Проверка: является ли тип субподрядным
 */
export function isSubcontractType(type: BoqItemType): boolean {
  return type === 'суб-мат' || type === 'суб-раб';
}

/**
 * Проверка: является ли тип компонентным
 */
export function isComponentType(type: BoqItemType): boolean {
  return type === 'мат-комп.' || type === 'раб-комп.';
}

/**
 * Маппинг UI ключей вкладок на boq_item_type
 */
export type TabKey = 'works' | 'materials' | 'subcontract_works' | 'subcontract_materials' | 'work_comp' | 'material_comp';

export const TAB_TO_BOQ_TYPE: Record<TabKey, BoqItemType> = {
  works: 'раб',
  materials: 'мат',
  subcontract_works: 'суб-раб',
  subcontract_materials: 'суб-мат',
  work_comp: 'раб-комп.',
  material_comp: 'мат-комп.',
};

export const BOQ_TYPE_TO_TAB: Record<BoqItemType, TabKey> = {
  'раб': 'works',
  'мат': 'materials',
  'суб-раб': 'subcontract_works',
  'суб-мат': 'subcontract_materials',
  'раб-комп.': 'work_comp',
  'мат-комп.': 'material_comp',
};
