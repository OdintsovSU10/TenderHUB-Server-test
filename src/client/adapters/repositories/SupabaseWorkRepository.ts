import { supabase } from '../../../lib/supabase';
import type {
  IWorkNameRepository,
  IWorkLibraryRepository,
} from '@/core/ports/repositories';
import type {
  WorkName,
  WorkNameCreate,
  WorkLibrary,
  WorkLibraryFull,
  WorkLibraryCreate,
} from '@/core/domain/entities';
import type { WorkItemType } from '@/core/domain/value-objects';

/**
 * Supabase реализация репозитория наименований работ
 */
export class SupabaseWorkNameRepository implements IWorkNameRepository {
  async findAll(): Promise<WorkName[]> {
    const { data, error } = await supabase
      .from('work_names')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<WorkName | null> {
    const { data, error } = await supabase
      .from('work_names')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async search(query: string): Promise<WorkName[]> {
    const { data, error } = await supabase
      .from('work_names')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async create(data: WorkNameCreate): Promise<WorkName> {
    const { data: result, error } = await supabase
      .from('work_names')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<WorkNameCreate>): Promise<WorkName> {
    const { data: result, error } = await supabase
      .from('work_names')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_names')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

/**
 * Supabase реализация репозитория библиотеки работ
 */
export class SupabaseWorkLibraryRepository implements IWorkLibraryRepository {
  async findAll(): Promise<WorkLibraryFull[]> {
    const { data, error } = await supabase
      .from('works_library')
      .select(`
        *,
        work_names!inner (
          name,
          unit
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async findById(id: string): Promise<WorkLibraryFull | null> {
    const { data, error } = await supabase
      .from('works_library')
      .select(`
        *,
        work_names!inner (
          name,
          unit
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToFull(data);
  }

  async findByWorkNameId(workNameId: string): Promise<WorkLibraryFull[]> {
    const { data, error } = await supabase
      .from('works_library')
      .select(`
        *,
        work_names!inner (
          name,
          unit
        )
      `)
      .eq('work_name_id', workNameId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async findByItemType(itemType: WorkItemType): Promise<WorkLibraryFull[]> {
    const { data, error } = await supabase
      .from('works_library')
      .select(`
        *,
        work_names!inner (
          name,
          unit
        )
      `)
      .eq('item_type', itemType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async search(query: string): Promise<WorkLibraryFull[]> {
    const { data, error } = await supabase
      .from('works_library')
      .select(`
        *,
        work_names!inner (
          name,
          unit
        )
      `)
      .ilike('work_names.name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async create(data: WorkLibraryCreate): Promise<WorkLibrary> {
    const { data: result, error } = await supabase
      .from('works_library')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<WorkLibraryCreate>): Promise<WorkLibrary> {
    const { data: result, error } = await supabase
      .from('works_library')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('works_library')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Маппинг данных из БД в доменную модель с JOIN данными
   */
  private mapToFull(row: Record<string, unknown>): WorkLibraryFull {
    const workNames = row.work_names as { name: string; unit: string } | null;

    return {
      id: row.id as string,
      work_name_id: row.work_name_id as string,
      item_type: row.item_type as WorkLibraryFull['item_type'],
      unit_rate: row.unit_rate as number,
      currency_type: row.currency_type as WorkLibraryFull['currency_type'],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      work_name: workNames?.name || '',
      unit: (workNames?.unit || 'шт') as WorkLibraryFull['unit'],
    };
  }
}
