import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  public client!: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.config.get<string>('supabase.url');
    const serviceRoleKey = this.config.get<string>('supabase.serviceRoleKey');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Batch insert BOQ items with audit via RPC
   */
  async insertBoqItemsBatch(
    items: Record<string, unknown>[],
    userId: string,
  ): Promise<{ success: boolean; insertedCount: number; insertedIds: string[] }> {
    const { data, error } = await this.client.rpc('insert_boq_items_batch', {
      p_items: items,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Batch insert failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Get tender with organization check
   */
  async getTender(tenderId: string) {
    const { data, error } = await this.client
      .from('tenders')
      .select('*, organizations(name)')
      .eq('id', tenderId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get positions for a tender
   */
  async getPositionsByTender(tenderId: string) {
    const { data, error } = await this.client
      .from('client_positions')
      .select('*')
      .eq('tender_id', tenderId)
      .order('position_number');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get BOQ items for a tender
   */
  async getBoqItemsByTender(tenderId: string) {
    const { data, error } = await this.client
      .from('boq_items')
      .select(`
        *,
        material_names(name, unit),
        work_names(name, unit),
        detail_cost_categories(name, location, cost_categories(name))
      `)
      .eq('tender_id', tenderId)
      .order('sort_number');

    if (error) throw error;
    return data || [];
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  /**
   * Check user membership in organization
   */
  async checkOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const { data } = await this.client
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    return !!data;
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<string[]> {
    const { data } = await this.client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    return data?.map((m) => m.organization_id) || [];
  }
}
