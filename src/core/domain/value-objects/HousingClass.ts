/**
 * Value Object: Класс жилья
 */
export type HousingClassType = 'комфорт' | 'бизнес' | 'премиум' | 'делюкс';

/**
 * Список всех классов жилья
 */
export const ALL_HOUSING_CLASSES: readonly HousingClassType[] = [
  'комфорт', 'бизнес', 'премиум', 'делюкс'
] as const;

/**
 * Проверка валидности класса жилья
 */
export function isValidHousingClass(value: string): value is HousingClassType {
  return ALL_HOUSING_CLASSES.includes(value as HousingClassType);
}
