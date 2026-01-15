/**
 * Value Object: Единица измерения
 * Представляет допустимые единицы измерения в системе
 */
export type UnitType = 'шт' | 'м' | 'м2' | 'м3' | 'кг' | 'т' | 'л' | 'компл' | 'м.п.';

/**
 * Список всех единиц измерения
 */
export const ALL_UNIT_TYPES: readonly UnitType[] = [
  'шт', 'м', 'м2', 'м3', 'кг', 'т', 'л', 'компл', 'м.п.'
] as const;

/**
 * Цвета для единиц измерения (используются в UI)
 */
export const UNIT_COLORS: Record<UnitType, string> = {
  'шт': 'blue',
  'м': 'green',
  'м2': 'cyan',
  'м3': 'purple',
  'кг': 'orange',
  'т': 'red',
  'л': 'magenta',
  'компл': 'volcano',
  'м.п.': 'geekblue',
};

/**
 * Проверка валидности единицы измерения
 */
export function isValidUnitType(value: string): value is UnitType {
  return ALL_UNIT_TYPES.includes(value as UnitType);
}
