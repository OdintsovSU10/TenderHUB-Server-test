/**
 * Value Object: Тип цены доставки
 * - 'в цене' - Доставка включена в цену материала
 * - 'не в цене' - Доставка не включена в цену
 * - 'суммой' - Доставка указана отдельной суммой
 */
export type DeliveryPriceType = 'в цене' | 'не в цене' | 'суммой';

/**
 * Список всех типов цены доставки
 */
export const ALL_DELIVERY_PRICE_TYPES: readonly DeliveryPriceType[] = [
  'в цене', 'не в цене', 'суммой'
] as const;

/**
 * Проверка валидности типа цены доставки
 */
export function isValidDeliveryPriceType(value: string): value is DeliveryPriceType {
  return ALL_DELIVERY_PRICE_TYPES.includes(value as DeliveryPriceType);
}
