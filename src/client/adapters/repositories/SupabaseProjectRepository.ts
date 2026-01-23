import { supabase } from '../../../lib/supabase';
import type {
  IProjectRepository,
  IProjectAgreementRepository,
  IProjectCompletionRepository,
} from '@/core/ports/repositories';
import type {
  Project,
  ProjectFull,
  ProjectCreate,
  ProjectAgreement,
  ProjectAgreementCreate,
  ProjectCompletion,
  ProjectCompletionCreate,
} from '@/core/domain/entities';

/**
 * Supabase реализация репозитория проектов
 */
export class SupabaseProjectRepository implements IProjectRepository {
  async findAll(): Promise<ProjectFull[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tenders (
          id,
          title,
          tender_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projects = (data || []).map(this.mapToFull);

    // Загружаем дополнительные данные для расчёта полей
    return Promise.all(projects.map(async (project) => {
      const [agreements, completions] = await Promise.all([
        this.getAgreementsSum(project.id),
        this.getTotalCompletion(project.id),
      ]);

      const finalCost = project.contract_cost + agreements;
      const percentage = finalCost > 0 ? (completions / finalCost) * 100 : 0;

      return {
        ...project,
        additional_agreements_sum: agreements,
        final_contract_cost: finalCost,
        total_completion: completions,
        completion_percentage: percentage,
      };
    }));
  }

  async findById(id: string): Promise<ProjectFull | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tenders (
          id,
          title,
          tender_number
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const project = this.mapToFull(data);

    const [agreements, completions] = await Promise.all([
      this.getAgreementsSum(project.id),
      this.getTotalCompletion(project.id),
    ]);

    const finalCost = project.contract_cost + agreements;
    const percentage = finalCost > 0 ? (completions / finalCost) * 100 : 0;

    return {
      ...project,
      additional_agreements_sum: agreements,
      final_contract_cost: finalCost,
      total_completion: completions,
      completion_percentage: percentage,
    };
  }

  async findActive(): Promise<ProjectFull[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tenders (
          id,
          title,
          tender_number
        )
      `)
      .or('is_active.is.null,is_active.eq.true')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projects = (data || []).map(this.mapToFull);

    return Promise.all(projects.map(async (project) => {
      const [agreements, completions] = await Promise.all([
        this.getAgreementsSum(project.id),
        this.getTotalCompletion(project.id),
      ]);

      const finalCost = project.contract_cost + agreements;
      const percentage = finalCost > 0 ? (completions / finalCost) * 100 : 0;

      return {
        ...project,
        additional_agreements_sum: agreements,
        final_contract_cost: finalCost,
        total_completion: completions,
        completion_percentage: percentage,
      };
    }));
  }

  async findByTenderId(tenderId: string): Promise<ProjectFull | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tenders (
          id,
          title,
          tender_number
        )
      `)
      .eq('tender_id', tenderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const project = this.mapToFull(data);

    const [agreements, completions] = await Promise.all([
      this.getAgreementsSum(project.id),
      this.getTotalCompletion(project.id),
    ]);

    const finalCost = project.contract_cost + agreements;
    const percentage = finalCost > 0 ? (completions / finalCost) * 100 : 0;

    return {
      ...project,
      additional_agreements_sum: agreements,
      final_contract_cost: finalCost,
      total_completion: completions,
      completion_percentage: percentage,
    };
  }

  async create(data: ProjectCreate): Promise<Project> {
    const { data: result, error } = await supabase
      .from('projects')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<ProjectCreate>): Promise<Project> {
    const { data: result, error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  async activate(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Маппинг данных из БД в доменную модель с JOIN данными
   */
  private mapToFull(row: Record<string, unknown>): ProjectFull {
    const tender = row.tenders as { id: string; title: string; tender_number: string } | null;

    return {
      id: row.id as string,
      name: row.name as string,
      client_name: row.client_name as string,
      contract_cost: row.contract_cost as number,
      contract_date: row.contract_date as string | null,
      area: row.area as number | null,
      construction_end_date: row.construction_end_date as string | null,
      tender_id: row.tender_id as string | null,
      is_active: row.is_active as boolean | undefined,
      created_by: row.created_by as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      tender: tender,
      tender_name: tender?.title,
      tender_number: tender?.tender_number,
    };
  }

  /**
   * Получить сумму доп. соглашений проекта
   */
  private async getAgreementsSum(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('project_additional_agreements')
      .select('amount')
      .eq('project_id', projectId);

    if (error) return 0;
    return (data || []).reduce((sum, a) => sum + (a.amount || 0), 0);
  }

  /**
   * Получить общую сумму выполнения проекта
   */
  private async getTotalCompletion(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('project_monthly_completion')
      .select('actual_amount')
      .eq('project_id', projectId);

    if (error) return 0;
    return (data || []).reduce((sum, c) => sum + (c.actual_amount || 0), 0);
  }
}

/**
 * Supabase реализация репозитория дополнительных соглашений
 */
export class SupabaseProjectAgreementRepository implements IProjectAgreementRepository {
  async findByProjectId(projectId: string): Promise<ProjectAgreement[]> {
    const { data, error } = await supabase
      .from('project_additional_agreements')
      .select('*')
      .eq('project_id', projectId)
      .order('agreement_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<ProjectAgreement | null> {
    const { data, error } = await supabase
      .from('project_additional_agreements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(data: ProjectAgreementCreate): Promise<ProjectAgreement> {
    const { data: result, error } = await supabase
      .from('project_additional_agreements')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<ProjectAgreementCreate>): Promise<ProjectAgreement> {
    const { data: result, error } = await supabase
      .from('project_additional_agreements')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_additional_agreements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

/**
 * Supabase реализация репозитория выполнения проекта
 */
export class SupabaseProjectCompletionRepository implements IProjectCompletionRepository {
  async findByProjectId(projectId: string): Promise<ProjectCompletion[]> {
    const { data, error } = await supabase
      .from('project_monthly_completion')
      .select('*')
      .eq('project_id', projectId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findByProjectIdAndYear(projectId: string, year: number): Promise<ProjectCompletion[]> {
    const { data, error } = await supabase
      .from('project_monthly_completion')
      .select('*')
      .eq('project_id', projectId)
      .eq('year', year)
      .order('month', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<ProjectCompletion | null> {
    const { data, error } = await supabase
      .from('project_monthly_completion')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(data: ProjectCompletionCreate): Promise<ProjectCompletion> {
    const { data: result, error } = await supabase
      .from('project_monthly_completion')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: string, data: Partial<ProjectCompletionCreate>): Promise<ProjectCompletion> {
    const { data: result, error } = await supabase
      .from('project_monthly_completion')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_monthly_completion')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getTotalCompletion(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('project_monthly_completion')
      .select('actual_amount')
      .eq('project_id', projectId);

    if (error) throw error;
    return (data || []).reduce((sum, c) => sum + (c.actual_amount || 0), 0);
  }
}
