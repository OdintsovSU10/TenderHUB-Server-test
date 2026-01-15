import { supabase } from '../../lib/supabase';

/**
 * Вставить новые элементы BOQ
 *
 * @param sourceItems - Исходные элементы для копирования
 * @param targetPositionId - ID целевой позиции
 * @param targetTenderId - ID целевого тендера
 * @returns Новые вставленные элементы
 */
export async function insertItems(
  sourceItems: any[],
  targetPositionId: string,
  targetTenderId: string
): Promise<any[]> {
  const itemsToInsert = sourceItems.map((item, index) => ({
    tender_id: targetTenderId,
    client_position_id: targetPositionId,
    sort_number: item.sort_number || index + 1,
    boq_item_type: item.boq_item_type,
    material_type: item.material_type,
    material_name_id: item.material_name_id,
    work_name_id: item.work_name_id,
    unit_code: item.unit_code,
    quantity: item.quantity,
    base_quantity: item.base_quantity,
    consumption_coefficient: item.consumption_coefficient,
    conversion_coefficient: item.conversion_coefficient,
    parent_work_item_id: null, // Будет восстановлено позже
    delivery_price_type: item.delivery_price_type,
    delivery_amount: item.delivery_amount,
    currency_type: item.currency_type,
    unit_rate: item.unit_rate,
    total_amount: item.total_amount,
    detail_cost_category_id: item.detail_cost_category_id,
    quote_link: item.quote_link,
    description: item.description,
    commercial_markup: item.commercial_markup,
    total_commercial_material_cost: item.total_commercial_material_cost,
    total_commercial_work_cost: item.total_commercial_work_cost,
  }));

  const { data: newItems, error: insertError } = await supabase
    .from('boq_items')
    .insert(itemsToInsert)
    .select();

  if (insertError || !newItems) {
    throw new Error(`Ошибка вставки элементов: ${insertError?.message}`);
  }

  return newItems;
}
