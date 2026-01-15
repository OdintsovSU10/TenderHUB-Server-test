/**
 * Утилиты для работы с BOQ Items
 *
 * Предоставляет функции для копирования BOQ items между позициями
 * с сохранением связей и пересчетом итогов.
 */

export { copyBoqItems } from './copyBoqItems';
export { getBoqItemsCount, hasBoqItems, updatePositionTotals } from './updatePositionTotals';
export type { CopyBoqItemsOptions, CopyBoqItemsResult } from './types';
