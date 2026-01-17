import { supabase } from '../../../lib/supabase';
import type {
  IBoqItemWriteService,
  BoqItemWriteResult,
  BoqItemBatchInsertResult,
} from '@/core/ports/services';
import type { BoqItem, BoqItemCreate } from '@/core/domain/entities';

/**
 * Supabase реализация сервиса записи BOQ элементов
 *
 * Использует RPC функции для автоматического audit логирования:
 * - insert_boq_item_with_audit
 * - update_boq_item_with_audit
 * - delete_boq_item_with_audit
 */
export class SupabaseBoqItemWriteService implements IBoqItemWriteService {
  private userId: string | null = null;

  setUser(userId: string): void {
    this.userId = userId;
  }

  private ensureUser(): string {
    if (!this.userId) {
      throw new Error('User ID not set. Call setUser() before performing operations.');
    }
    return this.userId;
  }

  async create(data: BoqItemCreate): Promise<BoqItemWriteResult> {
    try {
      const userId = this.ensureUser();

      const { data: result, error } = await supabase.rpc('insert_boq_item_with_audit', {
        p_user_id: userId,
        p_data: data,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, item: result as BoqItem };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async createMany(items: BoqItemCreate[]): Promise<BoqItemBatchInsertResult> {
    try {
      const userId = this.ensureUser();
      const insertedItems: BoqItem[] = [];
      const idMapping = new Map<number, string>();

      for (let i = 0; i < items.length; i++) {
        const { data: result, error } = await supabase.rpc('insert_boq_item_with_audit', {
          p_user_id: userId,
          p_data: items[i],
        });

        if (error) {
          console.error(`[BoqItemWriteService] Error inserting item ${i}:`, error.message);
          continue;
        }

        if (result) {
          const item = result as BoqItem;
          insertedItems.push(item);
          idMapping.set(i, item.id);
        }
      }

      return {
        success: insertedItems.length > 0,
        insertedItems,
        idMapping,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, insertedItems: [], idMapping: new Map(), error: message };
    }
  }

  async update(
    id: string,
    data: Partial<BoqItemCreate>,
    expectedVersion?: number
  ): Promise<BoqItemWriteResult> {
    try {
      const userId = this.ensureUser();

      const { data: result, error } = await supabase.rpc('update_boq_item_with_audit', {
        p_user_id: userId,
        p_item_id: id,
        p_data: data,
        p_expected_version: expectedVersion ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Проверяем на конфликт версий
      const response = result as Record<string, unknown>;
      if (response.error === 'CONFLICT') {
        return {
          success: false,
          conflict: true,
          error: (response.message as string) || 'Row was modified by another user',
          currentItem: response.current_data as BoqItem,
        };
      }

      return { success: true, item: result as BoqItem };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async updateMany(
    items: { id: string; data: Partial<BoqItemCreate> }[]
  ): Promise<BoqItemWriteResult> {
    try {
      const userId = this.ensureUser();
      const updatedItems: BoqItem[] = [];

      for (const item of items) {
        const { data: result, error } = await supabase.rpc('update_boq_item_with_audit', {
          p_user_id: userId,
          p_item_id: item.id,
          p_data: item.data,
        });

        if (error) {
          console.error(`[BoqItemWriteService] Error updating item ${item.id}:`, error.message);
          continue;
        }

        if (result) {
          updatedItems.push(result as BoqItem);
        }
      }

      return { success: updatedItems.length > 0, items: updatedItems };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async delete(id: string): Promise<BoqItemWriteResult> {
    try {
      const userId = this.ensureUser();

      const { error } = await supabase.rpc('delete_boq_item_with_audit', {
        p_user_id: userId,
        p_item_id: id,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async deleteMany(ids: string[]): Promise<BoqItemWriteResult> {
    try {
      const userId = this.ensureUser();
      let deletedCount = 0;

      for (const id of ids) {
        const { error } = await supabase.rpc('delete_boq_item_with_audit', {
          p_user_id: userId,
          p_item_id: id,
        });

        if (error) {
          console.error(`[BoqItemWriteService] Error deleting item ${id}:`, error.message);
          continue;
        }

        deletedCount++;
      }

      return { success: deletedCount > 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async rollback(
    boqItemId: string,
    oldData: Partial<BoqItemCreate>
  ): Promise<BoqItemWriteResult> {
    // Rollback is just an update with the old data
    return this.update(boqItemId, oldData);
  }

  // ========== Batch Operations (без audit, системные) ==========

  async swapSortNumbers(itemId1: string, itemId2: string): Promise<BoqItemWriteResult> {
    try {
      const { data: result, error } = await supabase.rpc('boq_swap_sort_numbers', {
        p_item_id_1: itemId1,
        p_item_id_2: itemId2,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const response = result as { success: boolean; error?: string };
      if (!response.success) {
        return { success: false, error: response.error || 'Swap failed' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async recalcLinkedMaterials(workId: string): Promise<BoqItemWriteResult> {
    try {
      const { data: result, error } = await supabase.rpc('boq_recalc_linked_materials', {
        p_work_id: workId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const response = result as { success: boolean; updated_count: number; error?: string };
      if (!response.success) {
        return { success: false, error: response.error || 'Recalc failed' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async recalcPositionTotals(positionId: string): Promise<BoqItemWriteResult> {
    try {
      const { data: result, error } = await supabase.rpc('boq_recalc_position_totals', {
        p_position_id: positionId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const response = result as { success: boolean; error?: string };
      if (!response.success) {
        return { success: false, error: response.error || 'Recalc totals failed' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }
}
