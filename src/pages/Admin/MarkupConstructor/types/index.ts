/**
 * Типы для конструктора наценок
 */

/**
 * Шаг в последовательности наценок
 * Поддерживает до 5 операций (action1-action5)
 */
export interface MarkupStep {
  name?: string; // Название пункта
  baseIndex: number; // -1 для базовой стоимости, или индекс пункта в массиве

  // Первая операция
  action1: 'multiply' | 'divide' | 'add' | 'subtract';
  operand1Type: 'markup' | 'step' | 'number'; // наценка, результат другого шага или число
  operand1Key?: string | number; // ключ наценки (если operand1Type = 'markup') или число
  operand1Index?: number; // индекс шага (если operand1Type = 'step')
  operand1MultiplyFormat?: 'addOne' | 'direct'; // формат умножения: 'addOne' = (1 + %), 'direct' = %

  // Вторая операция (опциональная)
  action2?: 'multiply' | 'divide' | 'add' | 'subtract';
  operand2Type?: 'markup' | 'step' | 'number';
  operand2Key?: string | number;
  operand2Index?: number;
  operand2MultiplyFormat?: 'addOne' | 'direct';

  // Третья операция (опциональная)
  action3?: 'multiply' | 'divide' | 'add' | 'subtract';
  operand3Type?: 'markup' | 'step' | 'number';
  operand3Key?: string | number;
  operand3Index?: number;
  operand3MultiplyFormat?: 'addOne' | 'direct';

  // Четвертая операция (опциональная)
  action4?: 'multiply' | 'divide' | 'add' | 'subtract';
  operand4Type?: 'markup' | 'step' | 'number';
  operand4Key?: string | number;
  operand4Index?: number;
  operand4MultiplyFormat?: 'addOne' | 'direct';

  // Пятая операция (опциональная)
  action5?: 'multiply' | 'divide' | 'add' | 'subtract';
  operand5Type?: 'markup' | 'step' | 'number';
  operand5Key?: string | number;
  operand5Index?: number;
  operand5MultiplyFormat?: 'addOne' | 'direct';
}

/**
 * Ключи вкладок в конструкторе наценок
 * Каждая вкладка представляет отдельный тип BOQ элемента
 */
export type TabKey =
  | 'works'                  // Работы
  | 'materials'              // Материалы
  | 'subcontract_works'      // Субподрядные работы
  | 'subcontract_materials'  // Субподрядные материалы
  | 'work_comp'              // Компонентные работы
  | 'material_comp';         // Компонентные материалы
