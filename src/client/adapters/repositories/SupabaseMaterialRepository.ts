import { supabase } from '../../../lib/supabase';
import type {
  IMaterialNameRepository,
  IMaterialLibraryRepository,
} from '@/core/ports/repositories';
import type {
  MaterialName,
  MaterialNameCreate,
  MaterialLibrary,
  MaterialLibraryFull,
  MaterialLibraryCreate,
} from '@/core/domain/entities';
import type { MaterialType } from '@/core/domain/value-objects';

/**
 * Supabase реализация репозитория наименований материалов
 */
export class SupabaseMaterialNameRepository implements IMaterialNameRepository {
  async findAll(): Promise<MaterialName[]> {
    const { data, error } = await supabase
      .from('material_names')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<MaterialName | null> {
    const { data, error } = await supabase
      .from('material_names')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async search(query: string): Promise<MaterialName[]> {
    const { data, error } = await supabase
      .from('material_names')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async create(data: MaterialNameCreate): Promise<MaterialName> {
    const { data: result, error } = await supabase
      .from('material_names')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<MaterialNameCreate>): Promise<MaterialName> {
    const { data: result, error } = await supabase
      .from('material_names')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('material_names')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

/**
 * Supabase реализация репозитория библиотеки материалов
 */
export class SupabaseMaterialLibraryRepository implements IMaterialLibraryRepository {
  async findAll(): Promise<MaterialLibraryFull[]> {
    const { data, error } = await supabase
      .from('materials_library')
      .select(`
        *,
        material_names!inner (
          name,
          unit
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async findById(id: string): Promise<MaterialLibraryFull | null> {
    const { data, error } = await supabase
      .from('materials_library')
      .select(`
        *,
        material_names!inner (
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

  async findByMaterialNameId(materialNameId: string): Promise<MaterialLibraryFull[]> {
    const { data, error } = await supabase
      .from('materials_library')
      .select(`
        *,
        material_names!inner (
          name,
          unit
        )
      `)
      .eq('material_name_id', materialNameId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async findByMaterialType(materialType: MaterialType): Promise<MaterialLibraryFull[]> {
    const { data, error } = await supabase
      .from('materials_library')
      .select(`
        *,
        material_names!inner (
          name,
          unit
        )
      `)
      .eq('material_type', materialType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async search(query: string): Promise<MaterialLibraryFull[]> {
    const { data, error } = await supabase
      .from('materials_library')
      .select(`
        *,
        material_names!inner (
          name,
          unit
        )
      `)
      .ilike('material_names.name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map(this.mapToFull);
  }

  async create(data: MaterialLibraryCreate): Promise<MaterialLibrary> {
    const { data: result, error } = await supabase
      .from('materials_library')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<MaterialLibraryCreate>): Promise<MaterialLibrary> {
    const { data: result, error } = await supabase
      .from('materials_library')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials_library')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Маппинг данных из БД в доменную модель с JOIN данными
   */
  private mapToFull(row: Record<string, unknown>): MaterialLibraryFull {
    const materialNames = row.material_names as { name: string; unit: string } | null;

    return {
      id: row.id as string,
      material_type: row.material_type as MaterialLibraryFull['material_type'],
      item_type: row.item_type as MaterialLibraryFull['item_type'],
      consumption_coefficient: row.consumption_coefficient as number | undefined,
      unit_rate: row.unit_rate as number,
      currency_type: row.currency_type as MaterialLibraryFull['currency_type'],
      delivery_price_type: row.delivery_price_type as MaterialLibraryFull['delivery_price_type'],
      delivery_amount: row.delivery_amount as number | undefined,
      material_name_id: row.material_name_id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      material_name: materialNames?.name || '',
      unit: (materialNames?.unit || 'шт') as MaterialLibraryFull['unit'],
    };
  }
}
