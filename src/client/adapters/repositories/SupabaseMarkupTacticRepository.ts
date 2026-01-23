import { supabase } from '../../../lib/supabase';
import type { IMarkupTacticRepository } from '@/core/ports/repositories';
import type { MarkupTactic, MarkupTacticCreate } from '@/core/domain/entities';

/**
 * Supabase реализация репозитория тактик наценок
 */
export class SupabaseMarkupTacticRepository implements IMarkupTacticRepository {
  async findAll(): Promise<MarkupTactic[]> {
    const { data, error } = await supabase
      .from('markup_tactics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async findById(id: string): Promise<MarkupTactic | null> {
    const { data, error } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToEntity(data);
  }

  async findGlobal(): Promise<MarkupTactic[]> {
    const { data, error } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('is_global', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async findByUserId(userId: string): Promise<MarkupTactic[]> {
    const { data, error } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async findByTenderId(tenderId: string): Promise<MarkupTactic | null> {
    // Сначала получаем ID тактики из tender_markup_percentage
    const { data: linkData, error: linkError } = await supabase
      .from('tender_markup_percentage')
      .select('markup_tactic_id')
      .eq('tender_id', tenderId)
      .single();

    if (linkError) {
      if (linkError.code === 'PGRST116') return null;
      throw linkError;
    }

    if (!linkData?.markup_tactic_id) return null;

    return this.findById(linkData.markup_tactic_id);
  }

  async create(data: MarkupTacticCreate): Promise<MarkupTactic> {
    const { data: result, error } = await supabase
      .from('markup_tactics')
      .insert([this.mapToDb(data)])
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(result);
  }

  async update(id: string, data: Partial<MarkupTacticCreate>): Promise<MarkupTactic> {
    const { data: result, error } = await supabase
      .from('markup_tactics')
      .update(this.mapToDb(data))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('markup_tactics')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async clone(id: string, newName?: string): Promise<MarkupTactic> {
    const original = await this.findById(id);
    if (!original) {
      throw new Error(`Тактика с ID ${id} не найдена`);
    }

    const cloneData: MarkupTacticCreate = {
      name: newName || `${original.name || 'Тактика'} (копия)`,
      sequences: original.sequences,
      base_costs: original.base_costs,
      user_id: original.user_id,
      is_global: false,
    };

    return this.create(cloneData);
  }

  async attachToTender(tacticId: string, tenderId: string): Promise<void> {
    // Сначала отвязываем существующую тактику
    await this.detachFromTender(tenderId);

    // Привязываем новую
    const { error } = await supabase
      .from('tender_markup_percentage')
      .insert([{
        tender_id: tenderId,
        markup_tactic_id: tacticId,
      }]);

    if (error) throw error;
  }

  async detachFromTender(tenderId: string): Promise<void> {
    const { error } = await supabase
      .from('tender_markup_percentage')
      .delete()
      .eq('tender_id', tenderId);

    // Игнорируем ошибку, если записи не было
    if (error && error.code !== 'PGRST116') throw error;
  }

  /**
   * Маппинг данных из БД в доменную модель
   */
  private mapToEntity(row: Record<string, unknown>): MarkupTactic {
    return {
      id: row.id as string,
      name: row.name as string | undefined,
      sequences: row.sequences as MarkupTactic['sequences'],
      base_costs: row.base_costs as MarkupTactic['base_costs'],
      user_id: row.user_id as string | undefined,
      is_global: row.is_global as boolean | undefined,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  /**
   * Маппинг данных для записи в БД
   */
  private mapToDb(data: Partial<MarkupTacticCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (data.name !== undefined) result.name = data.name;
    if (data.sequences !== undefined) result.sequences = data.sequences;
    if (data.base_costs !== undefined) result.base_costs = data.base_costs;
    if (data.user_id !== undefined) result.user_id = data.user_id;
    if (data.is_global !== undefined) result.is_global = data.is_global;

    return result;
  }
}
