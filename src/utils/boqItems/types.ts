/**
 * Типы для операций с BOQ items
 */

/**
 * Результат копирования BOQ items (детальный формат)
 */
export interface CopyBoqItemsResult {
  /** Количество скопированных элементов */
  copied: number;
  /** Массив ошибок, если они возникли */
  errors: string[];
  /** Количество скопированных работ */
  worksCount?: number;
  /** Количество скопированных материалов */
  materialsCount?: number;
}

/**
 * Опции для копирования BOQ items
 */
export interface CopyBoqItemsOptions {
  /** ID исходной позиции */
  sourcePositionId: string;
  /** ID целевой позиции */
  targetPositionId: string;
  /** ID целевого тендера (опционально, для копирования между тендерами) */
  targetTenderId?: string;
  /** Сохранять ли связи parent_work_item_id (по умолчанию true) */
  preserveRelationships?: boolean;
  /** Копировать ли историю аудита (по умолчанию false) */
  copyAuditHistory?: boolean;
}
