import { supabase } from '../../lib/supabase';

/**
 * Восстановить связи parent_work_item_id между элементами
 *
 * @param oldItems - Исходные элементы
 * @param newItems - Новые элементы (должны быть в том же порядке)
 * @returns Количество обновленных связей и массив ошибок
 */
export async function mapItemRelationships(
  oldItems: any[],
  newItems: any[]
): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  // Создать маппинг старый id → новый id
  const itemIdMap = new Map<string, string>();
  oldItems.forEach((oldItem, index) => {
    if (newItems[index]) {
      itemIdMap.set(oldItem.id, newItems[index].id);
    }
  });

  // Подготовить обновления
  const updatePromises: Promise<any>[] = [];

  for (const oldItem of oldItems) {
    if (oldItem.parent_work_item_id) {
      const newItemId = itemIdMap.get(oldItem.id);
      const newParentId = itemIdMap.get(oldItem.parent_work_item_id);

      if (newItemId && newParentId) {
        updatePromises.push(
          Promise.resolve(
            supabase
              .from('boq_items')
              .update({ parent_work_item_id: newParentId })
              .eq('id', newItemId)
          )
        );
      }
    }
  }

  // Выполнить все обновления параллельно
  if (updatePromises.length > 0) {
    const updateResults = await Promise.allSettled(updatePromises);

    // Собрать результаты
    updateResults.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        updated++;
      } else {
        errors.push(`Ошибка восстановления связи #${idx}: ${res.reason}`);
      }
    });
  }

  return { updated, errors };
}
