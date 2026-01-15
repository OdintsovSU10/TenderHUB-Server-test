import { supabase } from '../../../lib/supabase';
import type { IClientPositionRepository } from '@/core/ports/repositories';
import type { ClientPosition, ClientPositionCreate, ClientPositionUpdate } from '@/core/domain/entities';

/**
 * Supabase реализация репозитория позиций заказчика
 */
export class SupabaseClientPositionRepository implements IClientPositionRepository {
  async findByTenderId(tenderId: string): Promise<ClientPosition[]> {
    const { data, error } = await supabase
      .from('client_positions')
      .select('*')
      .eq('tender_id', tenderId)
      .order('position_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<ClientPosition | null> {
    const { data, error } = await supabase
      .from('client_positions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findChildren(parentPositionId: string): Promise<ClientPosition[]> {
    const { data, error } = await supabase
      .from('client_positions')
      .select('*')
      .eq('parent_position_id', parentPositionId)
      .order('position_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findRootPositions(tenderId: string): Promise<ClientPosition[]> {
    const { data, error } = await supabase
      .from('client_positions')
      .select('*')
      .eq('tender_id', tenderId)
      .is('parent_position_id', null)
      .order('position_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async create(data: ClientPositionCreate): Promise<ClientPosition> {
    const { data: result, error } = await supabase
      .from('client_positions')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async createMany(items: ClientPositionCreate[]): Promise<ClientPosition[]> {
    if (items.length === 0) return [];

    const { data, error } = await supabase
      .from('client_positions')
      .insert(items)
      .select();

    if (error) throw error;
    return data || [];
  }

  async update(id: string, data: ClientPositionUpdate): Promise<ClientPosition> {
    const { data: result, error } = await supabase
      .from('client_positions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_positions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deleteByTenderId(tenderId: string): Promise<void> {
    const { error } = await supabase
      .from('client_positions')
      .delete()
      .eq('tender_id', tenderId);

    if (error) throw error;
  }

  async updateTotals(
    id: string,
    totals: {
      total_material?: number;
      total_works?: number;
      material_cost_per_unit?: number;
      work_cost_per_unit?: number;
      total_commercial_material?: number;
      total_commercial_work?: number;
      total_commercial_material_per_unit?: number;
      total_commercial_work_per_unit?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('client_positions')
      .update(totals)
      .eq('id', id);

    if (error) throw error;
  }

  async updatePositionNumbers(items: { id: string; position_number: number }[]): Promise<void> {
    // Use batch updates for efficiency
    const updates = items.map(item =>
      supabase
        .from('client_positions')
        .update({ position_number: item.position_number })
        .eq('id', item.id)
    );

    const results = await Promise.all(updates);
    const errorResult = results.find(r => r.error);
    if (errorResult?.error) throw errorResult.error;
  }
}
