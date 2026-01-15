/**
 * Entity: Проект (Текущий объект)
 * Представляет строительный проект после выигранного тендера
 */
export interface Project {
  id: string;
  name: string;
  client_name: string;
  contract_cost: number;
  contract_date?: string | null;
  area?: number | null;
  construction_end_date?: string | null;
  tender_id?: string | null;
  is_active?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Расширенный тип проекта с вычисляемыми полями
 */
export interface ProjectFull extends Project {
  // Связанный тендер
  tender?: {
    id: string;
    title: string;
    tender_number: string;
  } | null;

  // Вычисляемые поля
  additional_agreements_sum?: number;
  final_contract_cost?: number;
  total_completion?: number;
  completion_percentage?: number;
  tender_name?: string;
  tender_number?: string;
}

/**
 * Entity: Дополнительное соглашение к проекту
 */
export interface ProjectAgreement {
  id: string;
  project_id: string;
  agreement_number: string;
  agreement_date: string;
  amount: number; // Может быть отрицательным
  description?: string | null;
  created_at: string;
}

/**
 * Entity: Ежемесячное выполнение проекта
 */
export interface ProjectCompletion {
  id: string;
  project_id: string;
  year: number;
  month: number;
  actual_amount: number;
  forecast_amount?: number | null;
  note?: string | null;
  created_at: string;
}

/**
 * DTO для создания проекта
 */
export interface ProjectCreate {
  name: string;
  client_name: string;
  contract_cost: number;
  contract_date?: string | null;
  area?: number | null;
  construction_end_date?: string | null;
  tender_id?: string | null;
  is_active?: boolean;
}

/**
 * DTO для создания доп. соглашения
 */
export interface ProjectAgreementCreate {
  project_id: string;
  agreement_number?: string;
  agreement_date: string;
  amount: number;
  description?: string | null;
}

/**
 * DTO для создания выполнения
 */
export interface ProjectCompletionCreate {
  project_id: string;
  year: number;
  month: number;
  actual_amount: number;
  forecast_amount?: number | null;
  note?: string | null;
}

/**
 * Расчет финальной стоимости договора с учетом доп. соглашений
 */
export function calculateFinalContractCost(
  project: Project,
  agreements: ProjectAgreement[]
): number {
  const agreementsSum = agreements.reduce((sum, a) => sum + a.amount, 0);
  return project.contract_cost + agreementsSum;
}

/**
 * Расчет процента выполнения проекта
 */
export function calculateCompletionPercentage(
  finalContractCost: number,
  totalCompletion: number
): number {
  if (finalContractCost === 0) return 0;
  return (totalCompletion / finalContractCost) * 100;
}

/**
 * Проверка: активен ли проект
 */
export function isProjectActive(project: Project): boolean {
  return project.is_active !== false;
}

/**
 * Проверка: связан ли проект с тендером
 */
export function hasLinkedTender(project: Project): boolean {
  return project.tender_id !== null && project.tender_id !== undefined;
}
