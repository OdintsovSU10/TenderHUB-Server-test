/**
 * Чистые функции для расчета наценок
 * БЕЗ зависимостей от React - только чистая логика
 */

import type { MarkupStep } from '../types';

type ActionType = 'multiply' | 'divide' | 'add' | 'subtract';
type OperandType = 'markup' | 'step' | 'number';
type MultiplyFormat = 'addOne' | 'direct';

/**
 * Применить одну операцию к базовому значению
 * @param base - Базовое значение
 * @param action - Тип операции
 * @param operand - Операнд
 * @param type - Тип операнда (markup, step, number)
 * @param multiplyFormat - Формат умножения для markup (addOne = 1+%, direct = %)
 */
function applyAction(
  base: number,
  action: ActionType,
  operand: number,
  type: OperandType,
  multiplyFormat?: MultiplyFormat
): number {
  switch (action) {
    case 'multiply':
      if (type === 'markup') {
        // Для наценки: если multiplyFormat = 'addOne', то (1 + %/100), иначе %/100
        if (multiplyFormat === 'addOne') {
          return base * (1 + operand / 100);
        } else {
          return base * (operand / 100);
        }
      }
      return base * operand;

    case 'divide':
      if (operand === 0) return base;
      if (type === 'markup') {
        // Для наценки при делении
        if (multiplyFormat === 'addOne') {
          return base / (1 + operand / 100);
        } else {
          return base / (operand / 100);
        }
      }
      return base / operand;

    case 'add':
      if (type === 'markup') {
        // Для наценки: добавить процент от базы
        return base + (base * operand / 100);
      }
      return base + operand;

    case 'subtract':
      if (type === 'markup') {
        // Для наценки: вычесть процент от базы
        return base - (base * operand / 100);
      }
      return base - operand;

    default:
      return base;
  }
}

/**
 * Получить значение операнда
 * @param type - Тип операнда
 * @param key - Ключ операнда (для markup) или число
 * @param index - Индекс шага (для step)
 * @param markupValues - Значения наценок из формы
 * @param stepResults - Результаты предыдущих шагов
 * @param baseCost - Базовая стоимость
 */
function getOperandValue(
  type: OperandType | undefined,
  key: string | number | undefined,
  index: number | undefined,
  markupValues: Record<string, number>,
  stepResults: number[],
  baseCost: number
): number {
  if (!type) return 0;

  switch (type) {
    case 'markup':
      if (!key) return 0;
      return markupValues[String(key)] || 0;

    case 'step':
      if (index === undefined) return 0;
      if (index === -1) return baseCost; // -1 означает базовую стоимость
      return stepResults[index] || 0;

    case 'number':
      if (typeof key === 'number') return key;
      return 0;

    default:
      return 0;
  }
}

/**
 * Рассчитать промежуточные результаты для последовательности шагов
 * @param sequence - Последовательность шагов наценок
 * @param baseCost - Базовая стоимость
 * @param markupValues - Значения наценок из формы (Record<string, number>)
 * @returns Массив промежуточных результатов для каждого шага
 */
export function calculateIntermediateResults(
  sequence: MarkupStep[],
  baseCost: number,
  markupValues: Record<string, number>
): number[] {
  const results: number[] = [];

  sequence.forEach((step) => {
    // Определяем базовое значение для этого шага
    let baseValue: number;
    if (step.baseIndex === -1) {
      baseValue = baseCost;
    } else {
      baseValue = results[step.baseIndex] || baseCost;
    }

    // Начинаем с базового значения
    let result = baseValue;

    // Применяем операцию 1 (обязательная)
    const operand1 = getOperandValue(
      step.operand1Type,
      step.operand1Key,
      step.operand1Index,
      markupValues,
      results,
      baseCost
    );
    result = applyAction(result, step.action1, operand1, step.operand1Type, step.operand1MultiplyFormat);

    // Применяем операцию 2 (опциональная)
    if (step.action2 && step.operand2Type) {
      const operand2 = getOperandValue(
        step.operand2Type,
        step.operand2Key,
        step.operand2Index,
        markupValues,
        results,
        baseCost
      );
      result = applyAction(result, step.action2, operand2, step.operand2Type, step.operand2MultiplyFormat);
    }

    // Применяем операцию 3 (опциональная)
    if (step.action3 && step.operand3Type) {
      const operand3 = getOperandValue(
        step.operand3Type,
        step.operand3Key,
        step.operand3Index,
        markupValues,
        results,
        baseCost
      );
      result = applyAction(result, step.action3, operand3, step.operand3Type, step.operand3MultiplyFormat);
    }

    // Применяем операцию 4 (опциональная)
    if (step.action4 && step.operand4Type) {
      const operand4 = getOperandValue(
        step.operand4Type,
        step.operand4Key,
        step.operand4Index,
        markupValues,
        results,
        baseCost
      );
      result = applyAction(result, step.action4, operand4, step.operand4Type, step.operand4MultiplyFormat);
    }

    // Применяем операцию 5 (опциональная)
    if (step.action5 && step.operand5Type) {
      const operand5 = getOperandValue(
        step.operand5Type,
        step.operand5Key,
        step.operand5Index,
        markupValues,
        results,
        baseCost
      );
      result = applyAction(result, step.action5, operand5, step.operand5Type, step.operand5MultiplyFormat);
    }

    // Добавляем результат в массив
    results.push(result);
  });

  return results;
}

/**
 * Получить финальный результат последовательности
 * @param sequence - Последовательность шагов
 * @param baseCost - Базовая стоимость
 * @param markupValues - Значения наценок
 * @returns Финальный результат (последний элемент массива результатов)
 */
export function calculateFinalResult(
  sequence: MarkupStep[],
  baseCost: number,
  markupValues: Record<string, number>
): number {
  if (sequence.length === 0) return baseCost;

  const results = calculateIntermediateResults(sequence, baseCost, markupValues);
  return results[results.length - 1] || baseCost;
}
