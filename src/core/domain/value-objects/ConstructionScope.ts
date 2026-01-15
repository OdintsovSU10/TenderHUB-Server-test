/**
 * Value Object: Объем строительных работ
 */
export type ConstructionScopeType = 'генподряд' | 'коробка' | 'монолит';

/**
 * Список всех типов объема работ
 */
export const ALL_CONSTRUCTION_SCOPES: readonly ConstructionScopeType[] = [
  'генподряд', 'коробка', 'монолит'
] as const;

/**
 * Проверка валидности типа объема работ
 */
export function isValidConstructionScope(value: string): value is ConstructionScopeType {
  return ALL_CONSTRUCTION_SCOPES.includes(value as ConstructionScopeType);
}
