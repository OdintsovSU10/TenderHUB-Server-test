import { supabase } from '../../../lib/supabase';
import type {
  IBoqItemRepository,
} from '@/core/ports/repositories';
import type {
  BoqItem,
  BoqItemFull,
  BoqItemCreate,
  BoqItemCommercialUpdate,
} from '@/core/domain/entities';
import type { BoqItemType } from '@/core/domain/value-objects';

/**
 * Supabase реализация репозитория элементов BOQ
 */
export class SupabaseBoqItemRepository implements IBoqItemRepository {
  private readonly selectQuery = `
    *,
    material_names(name, unit),
    work_names(name, unit),
    parent_work:parent_work_item_id(work_names(name)),
    detail_cost_categories(name, cost_categories(name), location)
  `;

  async findByPositionId(positionId: string): Promise<BoqItemFull[]> {
    const { data, error } = await supabase
      .from('boq_items')
      .select(this.selectQuery)
      .eq('client_position_id', positionId)
      .order('sort_number', { ascending: true });

    if (error) throw error;
    return this.mapToFull(data || []);
  }

  async findByTenderId(tenderId: string): Promise<BoqItemFull[]> {
    const { data, error } = await supabase
      .from('boq_items')
      .select(this.selectQuery)
      .eq('tender_id', tenderId)
      .order('sort_number', { ascending: true });

    if (error) throw error;
    return this.mapToFull(data || []);
  }

  async findById(id: string): Promise<BoqItemFull | null> {
    const { data, error } = await supabase
      .from('boq_items')
      .select(this.selectQuery)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapItemToFull(data);
  }

  async findByTenderIdAndType(tenderId: string, type: BoqItemType): Promise<BoqItemFull[]> {
    const { data, error } = await supabase
      .from('boq_items')
      .select(this.selectQuery)
      .eq('tender_id', tenderId)
      .eq('boq_item_type', type)
      .order('sort_number', { ascending: true });

    if (error) throw error;
    return this.mapToFull(data || []);
  }

  async findChildMaterials(parentWorkItemId: string): Promise<BoqItemFull[]> {
    const { data, error } = await supabase
      .from('boq_items')
      .select(this.selectQuery)
      .eq('parent_work_item_id', parentWorkItemId)
      .order('sort_number', { ascending: true });

    if (error) throw error;
    return this.mapToFull(data || []);
  }

  async create(data: BoqItemCreate): Promise<BoqItem> {
    const { data: result, error } = await supabase
      .from('boq_items')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async createMany(items: BoqItemCreate[]): Promise<BoqItem[]> {
    const { data, error } = await supabase
      .from('boq_items')
      .insert(items)
      .select();

    if (error) throw error;
    return data || [];
  }

  async update(id: string, data: Partial<BoqItemCreate>): Promise<BoqItem> {
    const { data: result, error } = await supabase
      .from('boq_items')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('boq_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deleteByPositionId(positionId: string): Promise<void> {
    const { error } = await supabase
      .from('boq_items')
      .delete()
      .eq('client_position_id', positionId);

    if (error) throw error;
  }

  async updateCommercialCosts(items: BoqItemCommercialUpdate[]): Promise<void> {
    // Supabase не поддерживает batch update, поэтому делаем последовательно
    for (const item of items) {
      const { error } = await supabase
        .from('boq_items')
        .update({
          commercial_markup: item.commercial_markup,
          total_commercial_material_cost: item.total_commercial_material_cost,
          total_commercial_work_cost: item.total_commercial_work_cost,
        })
        .eq('id', item.id);

      if (error) throw error;
    }
  }

  async updateSortOrder(items: { id: string; sort_number: number }[]): Promise<void> {
    for (const item of items) {
      const { error } = await supabase
        .from('boq_items')
        .update({ sort_number: item.sort_number })
        .eq('id', item.id);

      if (error) throw error;
    }
  }

  private mapToFull(data: any[]): BoqItemFull[] {
    return data.map((item) => this.mapItemToFull(item));
  }

  private mapItemToFull(item: any): BoqItemFull {
    let detailCostCategoryFull = '-';
    if (item.detail_cost_categories) {
      const categoryName = item.detail_cost_categories.cost_categories?.name || '';
      const detailName = item.detail_cost_categories.name || '';
      const location = item.detail_cost_categories.location || '';
      detailCostCategoryFull = `${categoryName} / ${detailName} / ${location}`;
    }

    return {
      ...item,
      material_name: item.material_names?.name,
      material_unit: item.material_names?.unit,
      work_name: item.work_names?.name,
      work_unit: item.work_names?.unit,
      parent_work_name: item.parent_work?.work_names?.name,
      detail_cost_category_full: detailCostCategoryFull,
    };
  }
}
