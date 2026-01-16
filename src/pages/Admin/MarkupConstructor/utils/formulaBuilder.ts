/**
 * Утилита для построения текстовых формул из шагов наценок
 */

import type { FormInstance } from 'antd';
import type { MarkupStep, MarkupParameter } from '../../../lib/supabase';
import { ACTIONS } from '../constants';

/**
 * Построить текстовую формулу для шага наценки
 * @param step - Шаг наценки
 * @param baseName - Название базы для шага
 * @param markupParameters - Список параметров наценок
 * @param form - Экземпляр формы для получения значений наценок
 * @param allSteps - Все шаги последовательности (для получения названий предыдущих шагов)
 * @returns Текстовая формула вида "Базовая × Наценка1 (10%) + Операнд2..."
 */
export function buildFormula(
  step: MarkupStep,
  baseName: string,
  markupParameters: MarkupParameter[],
  form: FormInstance,
  allSteps?: MarkupStep[]
): string {
  let formula = baseName;

  // Функция для получения имени и значения операнда
  const getOperandInfo = (
    operandType?: 'markup' | 'step' | 'number',
    operandKey?: string | number,
    operandIndex?: number
  ): { name: string; value: string } => {
    if (!operandType) return { name: '?', value: '' };

    switch (operandType) {
      case 'markup': {
        if (!operandKey) return { name: '?', value: '' };
        const markup = markupParameters.find((m) => m.key === operandKey);
        const markupValue = form.getFieldValue(String(operandKey)) || 0;
        return {
          name: markup?.label || String(operandKey),
          value: ` (${markupValue}%)`,
        };
      }

      case 'step': {
        if (operandIndex === undefined) return { name: '?', value: '' };
        if (operandIndex === -1) {
          return { name: 'Базовая стоимость', value: '' };
        }
        if (allSteps && allSteps[operandIndex]) {
          const stepName = allSteps[operandIndex].name || `Пункт ${operandIndex + 1}`;
          return { name: stepName, value: '' };
        }
        return { name: `Пункт ${operandIndex + 1}`, value: '' };
      }

      case 'number': {
        if (typeof operandKey === 'number') {
          return { name: String(operandKey), value: '' };
        }
        return { name: '?', value: '' };
      }

      default:
        return { name: '?', value: '' };
    }
  };

  // Операция 1 (обязательная)
  const action1Obj = ACTIONS.find((a) => a.value === step.action1);
  const operand1 = getOperandInfo(step.operand1Type, step.operand1Key, step.operand1Index);
  formula += ` ${action1Obj?.symbol || '?'} ${operand1.name}${operand1.value}`;

  // Операция 2 (опциональная)
  if (step.action2 && step.operand2Type) {
    const action2Obj = ACTIONS.find((a) => a.value === step.action2);
    const operand2 = getOperandInfo(step.operand2Type, step.operand2Key, step.operand2Index);
    formula += ` ${action2Obj?.symbol || '?'} ${operand2.name}${operand2.value}`;
  }

  // Операция 3 (опциональная)
  if (step.action3 && step.operand3Type) {
    const action3Obj = ACTIONS.find((a) => a.value === step.action3);
    const operand3 = getOperandInfo(step.operand3Type, step.operand3Key, step.operand3Index);
    formula += ` ${action3Obj?.symbol || '?'} ${operand3.name}${operand3.value}`;
  }

  // Операция 4 (опциональная)
  if (step.action4 && step.operand4Type) {
    const action4Obj = ACTIONS.find((a) => a.value === step.action4);
    const operand4 = getOperandInfo(step.operand4Type, step.operand4Key, step.operand4Index);
    formula += ` ${action4Obj?.symbol || '?'} ${operand4.name}${operand4.value}`;
  }

  // Операция 5 (опциональная)
  if (step.action5 && step.operand5Type) {
    const action5Obj = ACTIONS.find((a) => a.value === step.action5);
    const operand5 = getOperandInfo(step.operand5Type, step.operand5Key, step.operand5Index);
    formula += ` ${action5Obj?.symbol || '?'} ${operand5.name}${operand5.value}`;
  }

  return formula;
}

/**
 * Форматировать число в валюту с пробелами
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
