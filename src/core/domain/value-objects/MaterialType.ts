/**
 * Value Object: Тип материала
 * - 'основн.' - Основной материал
 * - 'вспомогат.' - Вспомогательный материал
 */
export type MaterialType = 'основн.' | 'вспомогат.';

/**
 * Список всех типов материалов
 */
export const ALL_MATERIAL_TYPES: readonly MaterialType[] = ['основн.', 'вспомогат.'] as const;

/**
 * Проверка валидности типа материала
 */
export function isValidMaterialType(value: string): value is MaterialType {
  return ALL_MATERIAL_TYPES.includes(value as MaterialType);
}

/**
 * Проверка: является ли материал основным
 */
export function isBasicMaterial(type: MaterialType): boolean {
  return type === 'основн.';
}

/**
 * Проверка: является ли материал вспомогательным
 */
export function isAuxiliaryMaterial(type: MaterialType): boolean {
  return type === 'вспомогат.';
}
