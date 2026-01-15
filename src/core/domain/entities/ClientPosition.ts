/**
 * Entity: Позиция заказчика
 * Представляет позицию из BOQ заказчика
 */
export interface ClientPosition {
  id: string;
  tender_id: string;
  position_number: number;
  unit_code?: string | null;
  volume?: number | null;
  client_note?: string | null;
  item_no?: string | null;
  work_name: string;
  manual_volume?: number | null;
  manual_note?: string | null;
  hierarchy_level?: number;
  is_additional?: boolean;
  parent_position_id?: string | null;

  // Итоговые суммы (рассчитываются из boq_items)
  total_material?: number;
  total_works?: number;
  material_cost_per_unit?: number;
  work_cost_per_unit?: number;

  // Коммерческие итоги
  total_commercial_material?: number;
  total_commercial_work?: number;
  total_commercial_material_per_unit?: number;
  total_commercial_work_per_unit?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * DTO для создания позиции заказчика
 */
export interface ClientPositionCreate {
  tender_id: string;
  position_number: number;
  work_name: string;
  unit_code?: string | null;
  volume?: number | null;
  client_note?: string | null;
  item_no?: string | null;
  manual_volume?: number | null;
  manual_note?: string | null;
  hierarchy_level?: number;
  is_additional?: boolean;
  parent_position_id?: string | null;
}

/**
 * DTO для обновления позиции заказчика
 */
export type ClientPositionUpdate = Partial<ClientPositionCreate>;

/**
 * Проверка: является ли позиция дополнительной
 */
export function isAdditionalPosition(position: ClientPosition): boolean {
  return position.is_additional === true;
}

/**
 * Проверка: имеет ли позиция родителя (вложенная позиция)
 */
export function hasParentPosition(position: ClientPosition): boolean {
  return position.parent_position_id !== null && position.parent_position_id !== undefined;
}

/**
 * Получить эффективный объем позиции (ручной или от заказчика)
 */
export function getEffectiveVolume(position: ClientPosition): number {
  return position.manual_volume ?? position.volume ?? 0;
}

/**
 * Расчет общей стоимости позиции
 */
export function calculatePositionTotal(position: ClientPosition): number {
  const materialTotal = position.total_material ?? 0;
  const workTotal = position.total_works ?? 0;
  return materialTotal + workTotal;
}

/**
 * Расчет коммерческой стоимости позиции
 */
export function calculatePositionCommercialTotal(position: ClientPosition): number {
  const materialTotal = position.total_commercial_material ?? 0;
  const workTotal = position.total_commercial_work ?? 0;
  return materialTotal + workTotal;
}
