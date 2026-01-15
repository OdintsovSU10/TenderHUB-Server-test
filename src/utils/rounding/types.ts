/**
 * Типы для утилит умного округления
 */

/**
 * Минимальный интерфейс для объектов, поддерживающих округление
 */
export interface RoundableItem {
  /** Количество единиц */
  quantity: number;
  /** Общая стоимость материалов */
  materialTotal?: number;
  /** Общая стоимость работ */
  workTotal?: number;
}

/**
 * Расширенный результат с добавленными полями округления
 */
export interface RoundedResult<T> extends T {
  /** Округленная цена за единицу (материалы) */
  rounded_material_unit_price?: number;
  /** Округленная цена за единицу (работы) */
  rounded_work_unit_price?: number;
  /** Округленная общая стоимость (материалы) */
  rounded_material_total?: number;
  /** Округленная общая стоимость (работы) */
  rounded_work_total?: number;
}

/**
 * Внутренний тип для отслеживания округления
 */
export interface RoundingTrackingItem {
  index: number;
  originalPrice: number;
  roundedPrice: number;
  error: number;
  fractionalPart: number;
  quantity: number;
}

/**
 * Опции для процесса округления
 */
export interface RoundingOptions {
  /** Выводить ли отладочную информацию в консоль (только в DEV) */
  debug?: boolean;
  /** Минимальное значение для округления (по умолчанию 2.5) */
  minimumValue?: number;
  /** Шаг округления (по умолчанию 5) */
  roundingStep?: number;
}
