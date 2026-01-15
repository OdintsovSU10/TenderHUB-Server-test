/**
 * Value Object: Тип валюты
 */
export type CurrencyType = 'RUB' | 'USD' | 'EUR' | 'CNY';

/**
 * Список всех валют
 */
export const ALL_CURRENCY_TYPES: readonly CurrencyType[] = ['RUB', 'USD', 'EUR', 'CNY'] as const;

/**
 * Символы валют для отображения
 */
export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  CNY: '¥',
};

/**
 * Названия валют
 */
export const CURRENCY_NAMES: Record<CurrencyType, string> = {
  RUB: 'Рубль',
  USD: 'Доллар США',
  EUR: 'Евро',
  CNY: 'Юань',
};

/**
 * Проверка валидности типа валюты
 */
export function isValidCurrencyType(value: string): value is CurrencyType {
  return ALL_CURRENCY_TYPES.includes(value as CurrencyType);
}
