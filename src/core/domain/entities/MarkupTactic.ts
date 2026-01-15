import type { BoqItemType } from '../value-objects';

/**
 * Структура шага наценки
 * Определяет одну операцию в цепочке расчета наценки
 */
export interface MarkupStep {
  name?: string;
  baseIndex: number; // -1 для базовой стоимости, или индекс пункта в массиве

  // Первая операция (обязательная)
  action1: MarkupAction;
  operand1Type: MarkupOperandType;
  operand1Key?: string | number;
  operand1Index?: number;
  operand1MultiplyFormat?: MarkupMultiplyFormat;

  // Вторая операция (опциональная)
  action2?: MarkupAction;
  operand2Type?: MarkupOperandType;
  operand2Key?: string | number;
  operand2Index?: number;
  operand2MultiplyFormat?: MarkupMultiplyFormat;

  // Третья операция (опциональная)
  action3?: MarkupAction;
  operand3Type?: MarkupOperandType;
  operand3Key?: string | number;
  operand3Index?: number;
  operand3MultiplyFormat?: MarkupMultiplyFormat;

  // Четвертая операция (опциональная)
  action4?: MarkupAction;
  operand4Type?: MarkupOperandType;
  operand4Key?: string | number;
  operand4Index?: number;
  operand4MultiplyFormat?: MarkupMultiplyFormat;

  // Пятая операция (опциональная)
  action5?: MarkupAction;
  operand5Type?: MarkupOperandType;
  operand5Key?: string | number;
  operand5Index?: number;
  operand5MultiplyFormat?: MarkupMultiplyFormat;
}

/**
 * Тип арифметической операции
 */
export type MarkupAction = 'multiply' | 'divide' | 'add' | 'subtract';

/**
 * Тип операнда в расчете
 */
export type MarkupOperandType = 'markup' | 'step' | 'number';

/**
 * Формат умножения
 * - 'addOne': (1 + %) - для наценок типа "прибавить процент"
 * - 'direct': % - для прямого умножения на процент
 */
export type MarkupMultiplyFormat = 'addOne' | 'direct';

/**
 * Структура последовательностей наценок по типам BOQ
 */
export interface MarkupSequences {
  'раб': MarkupStep[];
  'мат': MarkupStep[];
  'суб-раб': MarkupStep[];
  'суб-мат': MarkupStep[];
  'раб-комп.': MarkupStep[];
  'мат-комп.': MarkupStep[];
}

/**
 * Базовые стоимости по типам BOQ
 */
export interface BaseCosts {
  'раб': number;
  'мат': number;
  'суб-раб': number;
  'суб-мат': number;
  'раб-комп.': number;
  'мат-комп.': number;
}

/**
 * Entity: Тактика наценок
 * Определяет правила расчета коммерческой стоимости
 */
export interface MarkupTactic {
  id: string;
  name?: string;
  sequences: MarkupSequences;
  base_costs: BaseCosts;
  user_id?: string;
  is_global?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * DTO для создания тактики наценок
 */
export interface MarkupTacticCreate {
  name?: string;
  sequences: MarkupSequences;
  base_costs: BaseCosts;
  user_id?: string;
  is_global?: boolean;
}

/**
 * Получить последовательность шагов для типа BOQ
 */
export function getSequenceForType(tactic: MarkupTactic, boqType: BoqItemType): MarkupStep[] {
  return tactic.sequences[boqType] ?? [];
}

/**
 * Получить базовую стоимость для типа BOQ
 */
export function getBaseCostForType(tactic: MarkupTactic, boqType: BoqItemType): number {
  return tactic.base_costs[boqType] ?? 0;
}

/**
 * Создать пустую тактику наценок
 */
export function createEmptyMarkupTactic(): MarkupTacticCreate {
  return {
    sequences: {
      'раб': [],
      'мат': [],
      'суб-раб': [],
      'суб-мат': [],
      'раб-комп.': [],
      'мат-комп.': [],
    },
    base_costs: {
      'раб': 0,
      'мат': 0,
      'суб-раб': 0,
      'суб-мат': 0,
      'раб-комп.': 0,
      'мат-комп.': 0,
    },
    is_global: false,
  };
}
