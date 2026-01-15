import type { HousingClassType, ConstructionScopeType } from '../value-objects';

/**
 * Entity: Тендер
 * Основная сущность для управления тендерными проектами
 */
export interface Tender {
  id: string;
  title: string;
  description?: string;
  client_name: string;
  tender_number: string;
  submission_deadline: string;
  version?: number;
  area_client?: number;
  area_sp?: number;
  usd_rate?: number;
  eur_rate?: number;
  cny_rate?: number;
  upload_folder?: string;
  bsm_link?: string;
  tz_link?: string;
  qa_form_link?: string;
  project_folder_link?: string;
  markup_tactic_id?: string;
  housing_class?: HousingClassType;
  construction_scope?: ConstructionScopeType;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * DTO для создания тендера
 */
export interface TenderCreate {
  title: string;
  description?: string;
  client_name: string;
  tender_number: string;
  submission_deadline: string;
  version?: number;
  area_client?: number;
  area_sp?: number;
  usd_rate?: number;
  eur_rate?: number;
  cny_rate?: number;
  upload_folder?: string;
  bsm_link?: string;
  tz_link?: string;
  qa_form_link?: string;
  project_folder_link?: string;
  markup_tactic_id?: string;
  housing_class?: HousingClassType;
  construction_scope?: ConstructionScopeType;
  is_archived?: boolean;
}

/**
 * DTO для обновления тендера
 */
export type TenderUpdate = Partial<TenderCreate>;

/**
 * Проверка: истек ли дедлайн тендера
 */
export function isTenderDeadlineExpired(tender: Tender): boolean {
  const deadline = new Date(tender.submission_deadline);
  return deadline < new Date();
}

/**
 * Проверка: архивирован ли тендер
 */
export function isTenderArchived(tender: Tender): boolean {
  return tender.is_archived === true;
}

/**
 * Получить курс валюты для тендера
 */
export function getTenderCurrencyRate(tender: Tender, currency: 'USD' | 'EUR' | 'CNY'): number {
  switch (currency) {
    case 'USD':
      return tender.usd_rate ?? 1;
    case 'EUR':
      return tender.eur_rate ?? 1;
    case 'CNY':
      return tender.cny_rate ?? 1;
    default:
      return 1;
  }
}
