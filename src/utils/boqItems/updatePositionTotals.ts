import { supabase } from '../../lib/supabase';

/**
 * Пересчитать и обновить итоговые суммы позиции
 *
 * @param positionId - ID позиции для пересчета
 * @returns Обновленные итоговые суммы или ошибка
 */
export async function updatePositionTotals(positionId: string): Promise<{
  totalMaterial: number;
  totalWorks: number;
  error?: string;
}> {
  const { data: totals, error: totalsError } = await supabase
    .from('boq_items')
    .select('boq_item_type, total_amount')
    .eq('client_position_id', positionId);

  if (totalsError || !totals) {
    return {
      totalMaterial: 0,
      totalWorks: 0,
      error: `Ошибка загрузки элементов: ${totalsError?.message}`,
    };
  }

  const totalMaterial = totals
    .filter((item) => ['мат', 'суб-мат', 'мат-комп.'].includes(item.boq_item_type))
    .reduce((sum, item) => sum + (item.total_amount || 0), 0);

  const totalWorks = totals
    .filter((item) => ['раб', 'суб-раб', 'раб-комп.'].includes(item.boq_item_type))
    .reduce((sum, item) => sum + (item.total_amount || 0), 0);

  // Обновить итоговые суммы в позиции
  const { error: updateError } = await supabase
    .from('client_positions')
    .update({
      total_material: totalMaterial,
      total_works: totalWorks,
    })
    .eq('id', positionId);

  if (updateError) {
    return {
      totalMaterial,
      totalWorks,
      error: `Ошибка обновления итогов: ${updateError.message}`,
    };
  }

  return { totalMaterial, totalWorks };
}

/**
 * Получить количество BOQ items у позиции
 */
export async function getBoqItemsCount(positionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('boq_items')
    .select('id', { count: 'exact', head: true })
    .eq('client_position_id', positionId);

  if (error) {
    console.error('Ошибка подсчета boq_items:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Проверить наличие BOQ items у позиции
 */
export async function hasBoqItems(positionId: string): Promise<boolean> {
  const count = await getBoqItemsCount(positionId);
  return count > 0;
}
