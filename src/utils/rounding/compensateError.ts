import type { RoundingTrackingItem } from './types';

/**
 * Компенсирует ошибку округления, корректируя цены с наибольшими дробными частями
 *
 * Алгоритм:
 * 1. Сортирует элементы по убыванию дробной части
 * 2. Для элементов с максимальной дробной частью корректирует цену
 * 3. Корректировка происходит с шагом 5 (кратно 5 рублям)
 * 4. Продолжает пока не компенсирует всю ошибку
 *
 * @param items - Массив элементов с информацией об округлении
 * @param totalError - Общая ошибка округления для компенсации
 * @param adjustmentStep - Шаг корректировки (по умолчанию 5)
 * @returns Map индексов элементов и их скорректированных цен
 */
export function compensateError(
  items: RoundingTrackingItem[],
  totalError: number,
  adjustmentStep: number = 5
): Map<number, number> {
  const adjustments = new Map<number, number>();

  // Если ошибка меньше 1 рубля - игнорируем
  if (Math.abs(totalError) < 1) {
    return adjustments;
  }

  // Сортируем по убыванию дробной части
  const sortedItems = [...items].sort((a, b) => b.fractionalPart - a.fractionalPart);

  let remainingError = totalError;
  const errorSign = totalError > 0 ? 1 : -1;

  for (const item of sortedItems) {
    if (Math.abs(remainingError) < adjustmentStep) {
      break;
    }

    // Вычисляем максимальную корректировку для этого элемента
    const maxAdjustment =
      Math.floor(Math.abs(remainingError) / (item.quantity * adjustmentStep)) * adjustmentStep;

    if (maxAdjustment >= adjustmentStep) {
      const adjustment = maxAdjustment * errorSign;
      adjustments.set(item.index, item.roundedPrice + adjustment);
      remainingError -= adjustment * item.quantity;
    }
  }

  return adjustments;
}
