import type { RoundableItem, RoundedResult, RoundingOptions, RoundingTrackingItem } from './types';
import { roundTo5 } from './roundTo5';
import { compensateError } from './compensateError';

/**
 * Применяет умное округление к массиву элементов
 *
 * Умное округление:
 * 1. Округляет цены за единицу до кратных 5 рублям
 * 2. Компенсирует ошибку округления, чтобы сумма оставалась близкой к оригиналу
 * 3. Корректирует элементы с наибольшей дробной частью
 *
 * @template T - Тип исходного элемента
 * @param items - Массив элементов для округления
 * @param extractors - Функции для извлечения полей из элементов
 * @param options - Опции округления
 * @returns Массив элементов с добавленными полями округленных значений
 */
export function smartRound<T extends object>(
  items: T[],
  extractors: {
    getQuantity: (item: T) => number;
    getMaterialTotal?: (item: T) => number;
    getWorkTotal?: (item: T) => number;
  },
  options: RoundingOptions = {}
): RoundedResult<T>[] {
  const {
    debug = false,
    minimumValue = 2.5,
    roundingStep = 5,
  } = options;

  const materialItems: RoundingTrackingItem[] = [];
  const workItems: RoundingTrackingItem[] = [];

  // Собираем данные для округления
  items.forEach((item, index) => {
    const quantity = extractors.getQuantity(item);

    if (quantity <= 0) return;

    // Материалы
    if (extractors.getMaterialTotal) {
      const materialTotal = extractors.getMaterialTotal(item) || 0;
      if (materialTotal > 0) {
        const originalPrice = materialTotal / quantity;
        const roundedPrice = roundTo5(originalPrice, minimumValue);
        const fractionalPart = originalPrice - Math.floor(originalPrice);
        const error = (roundedPrice - originalPrice) * quantity;

        materialItems.push({
          index,
          originalPrice,
          roundedPrice,
          error,
          fractionalPart,
          quantity,
        });
      }
    }

    // Работы
    if (extractors.getWorkTotal) {
      const workTotal = extractors.getWorkTotal(item) || 0;
      if (workTotal > 0) {
        const originalPrice = workTotal / quantity;
        const roundedPrice = roundTo5(originalPrice, minimumValue);
        const fractionalPart = originalPrice - Math.floor(originalPrice);
        const error = (roundedPrice - originalPrice) * quantity;

        workItems.push({
          index,
          originalPrice,
          roundedPrice,
          error,
          fractionalPart,
          quantity,
        });
      }
    }
  });

  // Вычисляем общую ошибку
  const totalMaterialError = materialItems.reduce((sum, item) => sum + item.error, 0);
  const totalWorkError = workItems.reduce((sum, item) => sum + item.error, 0);

  // Выводим отладочную информацию только в DEV режиме
  if (debug && import.meta.env.DEV) {
    console.log('🔄 Округление:');
    console.log(`  Материалы: ошибка ${totalMaterialError.toFixed(2)} руб`);
    console.log(`  Работы: ошибка ${totalWorkError.toFixed(2)} руб`);
  }

  // Компенсируем ошибку
  const materialAdjustments = compensateError(materialItems, totalMaterialError, roundingStep);
  const workAdjustments = compensateError(workItems, totalWorkError, roundingStep);

  // Применяем округление и компенсацию
  const roundedItems = items.map((item, index) => {
    const result: RoundedResult<T> = { ...item };
    const quantity = extractors.getQuantity(item);

    if (quantity <= 0) return result;

    // Округляем материалы
    if (extractors.getMaterialTotal) {
      const materialTotal = extractors.getMaterialTotal(item) || 0;
      if (materialTotal > 0) {
        const roundedPrice = materialAdjustments.get(index) ?? roundTo5(materialTotal / quantity, minimumValue);
        result.rounded_material_unit_price = roundedPrice;
        result.rounded_material_total = roundedPrice * quantity;
      } else {
        result.rounded_material_unit_price = 0;
        result.rounded_material_total = 0;
      }
    }

    // Округляем работы
    if (extractors.getWorkTotal) {
      const workTotal = extractors.getWorkTotal(item) || 0;
      if (workTotal > 0) {
        const roundedPrice = workAdjustments.get(index) ?? roundTo5(workTotal / quantity, minimumValue);
        result.rounded_work_unit_price = roundedPrice;
        result.rounded_work_total = roundedPrice * quantity;
      } else {
        result.rounded_work_unit_price = 0;
        result.rounded_work_total = 0;
      }
    }

    return result;
  });

  return roundedItems;
}
