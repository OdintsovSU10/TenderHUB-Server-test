import { supabase } from '../../../lib/supabase';
import type { ITenderRepository } from '@/core/ports/repositories';
import type { Tender, TenderCreate, TenderUpdate } from '@/core/domain/entities';

/**
 * Supabase реализация репозитория тендеров
 */
export class SupabaseTenderRepository implements ITenderRepository {
  async findAll(): Promise<Tender[]> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<Tender | null> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findByNumber(tenderNumber: string): Promise<Tender[]> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .ilike('tender_number', `%${tenderNumber}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByClient(clientName: string): Promise<Tender[]> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .ilike('client_name', `%${clientName}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findActive(): Promise<Tender[]> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .or('is_archived.is.null,is_archived.eq.false')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findArchived(): Promise<Tender[]> {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .eq('is_archived', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(data: TenderCreate): Promise<Tender> {
    const { data: result, error } = await supabase
      .from('tenders')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: TenderUpdate): Promise<Tender> {
    const { data: result, error } = await supabase
      .from('tenders')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenders')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) throw error;
  }

  async unarchive(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenders')
      .update({ is_archived: false })
      .eq('id', id);

    if (error) throw error;
  }
}
