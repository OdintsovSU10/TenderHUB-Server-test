import { supabase } from './supabase';
import type { BoqItemInsert } from './supabase';

/**
 * Wrapper для INSERT операций с автоматическим audit логированием
 */
export async function insertBoqItemWithAudit(
  userId: string | undefined,
  data: Partial<BoqItemInsert>
) {
  if (!userId) {
    throw new Error('User ID required for audit operations');
  }

  const { data: result, error } = await supabase.rpc('insert_boq_item_with_audit', {
    p_user_id: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p_data: data as unknown as Record<string, any>,
  });

  if (error) throw error;
  return { data: result, error: null };
}

/**
 * Wrapper для UPDATE операций с автоматическим audit логированием
 */
export async function updateBoqItemWithAudit(
  userId: string | undefined,
  itemId: string,
  data: Partial<BoqItemInsert>
) {
  if (!userId) {
    throw new Error('User ID required for audit operations');
  }

  const { data: result, error } = await supabase.rpc('update_boq_item_with_audit', {
    p_user_id: userId,
    p_item_id: itemId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p_data: data as unknown as Record<string, any>,
  });

  if (error) throw error;
  return { data: result, error: null };
}

/**
 * Wrapper для DELETE операций с автоматическим audit логированием
 */
export async function deleteBoqItemWithAudit(
  userId: string | undefined,
  itemId: string
) {
  if (!userId) {
    throw new Error('User ID required for audit operations');
  }

  const { data: result, error } = await supabase.rpc('delete_boq_item_with_audit', {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) throw error;
  return { data: result, error: null };
}
