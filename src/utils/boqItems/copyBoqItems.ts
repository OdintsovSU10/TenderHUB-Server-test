import { supabase } from '../../lib/supabase';
import type { CopyBoqItemsOptions, CopyBoqItemsResult } from './types';
import { validatePositions } from './validatePositions';
import { insertItems } from './insertItems';
import { mapItemRelationships } from './mapItemRelationships';
import { updatePositionTotals } from './updatePositionTotals';

/**
 * Копировать все BOQ items из одной позиции в другую
 *
 * Поддерживает:
 * - Копирование в пределах одного тендера
 * - Копирование между тендерами (версионирование)
 * - Сохранение связей parent_work_item_id
 * - Автоматический пересчет итогов позиции
 *
 * @param options - Опции копирования
 * @returns Результат с количеством скопированных элементов и ошибками
 */
export async function copyBoqItems(
  options: CopyBoqItemsOptions
): Promise<CopyBoqItemsResult> {
  const {
    sourcePositionId,
    targetPositionId,
    targetTenderId,
    preserveRelationships = true,
  } = options;

  const result: CopyBoqItemsResult = {
    copied: 0,
    errors: [],
    worksCount: 0,
    materialsCount: 0,
  };

  try {
    // 1. Валидация позиций
    const { sourceTenderId, targetTenderId: detectedTargetTenderId } =
      await validatePositions(
        sourcePositionId,
        targetPositionId,
        !targetTenderId // Если targetTenderId не указан, требуем одинаковый тендер
      );

    const finalTargetTenderId = targetTenderId || detectedTargetTenderId;

    // 2. Загрузить все boq_items исходной позиции
    const { data: sourceItems, error: fetchError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('client_position_id', sourcePositionId)
      .order('sort_number', { ascending: true });

    if (fetchError) {
      result.errors.push(`Ошибка загрузки элементов: ${fetchError.message}`);
      return result;
    }

    if (!sourceItems || sourceItems.length === 0) {
      result.errors.push('Нет элементов для копирования');
      return result;
    }

    // 3. Вставить новые элементы (без parent_work_item_id)
    const newItems = await insertItems(
      sourceItems,
      targetPositionId,
      finalTargetTenderId
    );

    result.copied = newItems.length;

    // Подсчитать количество работ и материалов
    result.worksCount = sourceItems.filter((item) => item.work_name_id).length;
    result.materialsCount = sourceItems.filter((item) => item.material_name_id).length;

    // 4. Восстановить связи parent_work_item_id (если требуется)
    if (preserveRelationships) {
      const { updated, errors } = await mapItemRelationships(sourceItems, newItems);

      if (errors.length > 0) {
        result.errors.push(...errors);
      }

      if (import.meta.env.DEV) {
        console.log(`Восстановлено связей: ${updated}`);
      }
    }

    // 5. Пересчитать итоговые суммы позиции
    const { totalMaterial, totalWorks, error: totalsError } =
      await updatePositionTotals(targetPositionId);

    if (totalsError) {
      result.errors.push(totalsError);
    }

    if (import.meta.env.DEV) {
      console.log(`Пересчет итогов позиции:`);
      console.log(`  Материалы: ${totalMaterial.toFixed(2)} руб`);
      console.log(`  Работы: ${totalWorks.toFixed(2)} руб`);
    }
  } catch (error: any) {
    result.errors.push(`Неожиданная ошибка: ${error.message}`);
  }

  return result;
}
