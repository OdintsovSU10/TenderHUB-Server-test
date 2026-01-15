import type {
  MarkupStep,
  MarkupAction,
  MarkupOperandType,
  MarkupMultiplyFormat,
} from '../../domain/entities';
import type { BoqItemType } from '../../domain/value-objects';
import type { ILoggerService } from '../../ports/services';

/**
 * Контекст для расчета наценок
 */
export interface CalculationContext {
  /** Базовая стоимость из total_amount */
  baseAmount: number;
  /** Тип элемента BOQ */
  itemType: BoqItemType;
  /** Последовательность операций наценок */
  markupSequence: MarkupStep[];
  /** Параметры наценок (ключ -> значение в процентах) */
  markupParameters: Map<string, number>;
  /** Базовая стоимость из тактики (если задана) */
  baseCost?: number;
}

/**
 * Результат расчета наценки
 */
export interface CalculationResult {
  /** Итоговая коммерческая стоимость */
  commercialCost: number;
  /** Итоговый коэффициент наценки */
  markupCoefficient: number;
  /** Результаты каждого шага расчета */
  stepResults: number[];
  /** Ошибки расчета (если были) */
  errors?: string[];
}

/**
 * Сервис расчета наценок
 * Реализует логику расчета коммерческой стоимости на основе тактик наценок
 */
export class MarkupCalculatorService {
  private logger?: ILoggerService;

  constructor(logger?: ILoggerService) {
    this.logger = logger;
  }

  /**
   * Применяет последовательность операций наценок к базовой стоимости
   * @param context Контекст расчета
   * @returns Результат расчета коммерческой стоимости
   */
  calculate(context: CalculationContext): CalculationResult {
    const { baseAmount, markupSequence, markupParameters, baseCost } = context;
    const errors: string[] = [];
    const stepResults: number[] = [];

    this.logger?.debug('MarkupCalculatorService.calculate', {
      baseAmount,
      baseCost,
      sequenceLength: markupSequence?.length,
    });

    // Проверяем наличие последовательности
    if (!markupSequence || !Array.isArray(markupSequence)) {
      return {
        commercialCost: baseAmount,
        markupCoefficient: 1,
        stepResults: [],
        errors: ['Последовательность операций не определена'],
      };
    }

    if (markupSequence.length === 0) {
      return {
        commercialCost: baseAmount,
        markupCoefficient: 1,
        stepResults: [],
        errors: ['Последовательность операций пуста'],
      };
    }

    // Используем базовую стоимость из тактики или из элемента
    let currentAmount = baseCost ?? baseAmount;

    // Если базовая стоимость 0 или отрицательная, возвращаем ее без изменений
    if (currentAmount <= 0) {
      return {
        commercialCost: currentAmount,
        markupCoefficient: 1,
        stepResults: [],
        errors: currentAmount < 0 ? ['Базовая стоимость отрицательная'] : [],
      };
    }

    // Обрабатываем каждый шаг последовательности
    for (let i = 0; i < markupSequence.length; i++) {
      const step = markupSequence[i];

      try {
        // Получаем базовое значение для этого шага
        const baseValue = this.getBaseValue(step.baseIndex, baseAmount, stepResults);

        // Применяем до 5 операций (если они определены)
        let stepResult = baseValue;

        // Операция 1 (обязательная)
        const operand1 = this.getOperandValue(
          step.operand1Type,
          step.operand1Key,
          step.operand1Index,
          step.operand1MultiplyFormat,
          markupParameters,
          stepResults,
          baseAmount
        );
        stepResult = this.applyOperation(stepResult, step.action1, operand1);

        // Операция 2 (опциональная)
        if (step.action2 && step.operand2Type) {
          const operand2 = this.getOperandValue(
            step.operand2Type,
            step.operand2Key,
            step.operand2Index,
            step.operand2MultiplyFormat,
            markupParameters,
            stepResults,
            baseAmount
          );
          stepResult = this.applyOperation(stepResult, step.action2, operand2);
        }

        // Операция 3 (опциональная)
        if (step.action3 && step.operand3Type) {
          const operand3 = this.getOperandValue(
            step.operand3Type,
            step.operand3Key,
            step.operand3Index,
            step.operand3MultiplyFormat,
            markupParameters,
            stepResults,
            baseAmount
          );
          stepResult = this.applyOperation(stepResult, step.action3, operand3);
        }

        // Операция 4 (опциональная)
        if (step.action4 && step.operand4Type) {
          const operand4 = this.getOperandValue(
            step.operand4Type,
            step.operand4Key,
            step.operand4Index,
            step.operand4MultiplyFormat,
            markupParameters,
            stepResults,
            baseAmount
          );
          stepResult = this.applyOperation(stepResult, step.action4, operand4);
        }

        // Операция 5 (опциональная)
        if (step.action5 && step.operand5Type) {
          const operand5 = this.getOperandValue(
            step.operand5Type,
            step.operand5Key,
            step.operand5Index,
            step.operand5MultiplyFormat,
            markupParameters,
            stepResults,
            baseAmount
          );
          stepResult = this.applyOperation(stepResult, step.action5, operand5);
        }

        stepResults.push(stepResult);
        currentAmount = stepResult;
      } catch (error) {
        const errorMessage = `Ошибка в шаге ${i + 1}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
        errors.push(errorMessage);
        this.logger?.error(errorMessage, { step, error });

        // Продолжаем расчет, используя предыдущее значение
        stepResults.push(currentAmount);
      }
    }

    // Рассчитываем итоговый коэффициент наценки
    const markupCoefficient = baseAmount > 0 ? currentAmount / baseAmount : 1;

    return {
      commercialCost: currentAmount,
      markupCoefficient,
      stepResults,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Получает базовое значение для шага
   */
  private getBaseValue(
    baseIndex: number,
    baseAmount: number,
    stepResults: number[]
  ): number {
    if (baseIndex === -1) {
      return baseAmount;
    }

    if (baseIndex >= 0 && baseIndex < stepResults.length) {
      return stepResults[baseIndex];
    }

    throw new Error(`Недопустимый baseIndex: ${baseIndex}. Доступно шагов: ${stepResults.length}`);
  }

  /**
   * Получает значение операнда
   */
  private getOperandValue(
    operandType?: MarkupOperandType,
    operandKey?: string | number,
    operandIndex?: number,
    multiplyFormat?: MarkupMultiplyFormat,
    markupParameters?: Map<string, number>,
    stepResults?: number[],
    baseAmount?: number
  ): number {
    if (!operandType) {
      throw new Error('Не указан тип операнда');
    }

    switch (operandType) {
      case 'markup': {
        if (!operandKey || !markupParameters) {
          throw new Error('Не указан ключ наценки или отсутствуют параметры наценок');
        }

        const markupValue = markupParameters.get(String(operandKey));

        if (markupValue === undefined) {
          throw new Error(`Параметр наценки "${operandKey}" не найден`);
        }

        // Применяем формат умножения
        if (multiplyFormat === 'addOne') {
          // Формат (1 + %): например, 10% становится 1.1
          return 1 + markupValue / 100;
        } else {
          // Прямое значение: например, 10% становится 0.1
          return markupValue / 100;
        }
      }

      case 'step': {
        if (operandIndex === undefined || !stepResults) {
          throw new Error('Не указан индекс шага или отсутствуют результаты шагов');
        }

        // Специальный случай: -1 означает базовое значение (baseAmount)
        if (operandIndex === -1) {
          if (baseAmount === undefined) {
            throw new Error('Базовая сумма не передана для operandIndex = -1');
          }
          return baseAmount;
        }

        if (operandIndex < 0 || operandIndex >= stepResults.length) {
          throw new Error(`Недопустимый индекс шага: ${operandIndex}. Доступно шагов: ${stepResults.length}`);
        }

        return stepResults[operandIndex];
      }

      case 'number': {
        if (operandKey === undefined) {
          throw new Error('Не указано числовое значение');
        }

        return Number(operandKey);
      }

      default:
        throw new Error(`Неизвестный тип операнда: ${operandType}`);
    }
  }

  /**
   * Применяет операцию к базовому значению
   */
  private applyOperation(
    baseValue: number,
    operation: MarkupAction,
    operandValue: number
  ): number {
    switch (operation) {
      case 'multiply':
        return baseValue * operandValue;

      case 'divide':
        if (operandValue === 0) {
          throw new Error('Деление на ноль');
        }
        return baseValue / operandValue;

      case 'add':
        return baseValue + operandValue;

      case 'subtract':
        return baseValue - operandValue;

      default:
        throw new Error(`Неизвестная операция: ${operation}`);
    }
  }

  /**
   * Проверяет корректность последовательности наценок
   * @param sequence Последовательность операций
   * @returns Массив ошибок валидации (пустой, если все корректно)
   */
  validateSequence(sequence: MarkupStep[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      const stepNum = i + 1;

      // Проверка baseIndex
      if (step.baseIndex < -1 || step.baseIndex >= i) {
        errors.push(`Шаг ${stepNum}: недопустимый baseIndex (${step.baseIndex})`);
      }

      // Проверка обязательной первой операции
      if (!step.action1 || !step.operand1Type) {
        errors.push(`Шаг ${stepNum}: отсутствует обязательная первая операция`);
      }

      // Проверка операндов для типа 'step'
      const checkStepOperand = (
        operandType: MarkupOperandType | undefined,
        operandIndex: number | undefined,
        operandNum: number
      ) => {
        if (operandType === 'step' && (operandIndex === undefined || (operandIndex !== -1 && operandIndex >= i))) {
          errors.push(`Шаг ${stepNum}: недопустимый operand${operandNum}Index для типа 'step'`);
        }
      };

      checkStepOperand(step.operand1Type, step.operand1Index, 1);
      checkStepOperand(step.operand2Type, step.operand2Index, 2);
      checkStepOperand(step.operand3Type, step.operand3Index, 3);
      checkStepOperand(step.operand4Type, step.operand4Index, 4);
      checkStepOperand(step.operand5Type, step.operand5Index, 5);
    }

    return errors;
  }

  /**
   * Рассчитывает процент наценки
   * @param baseAmount Базовая стоимость
   * @param commercialCost Коммерческая стоимость
   * @returns Процент наценки
   */
  calculateMarkupPercentage(baseAmount: number, commercialCost: number): number {
    if (baseAmount === 0) {
      return 0;
    }

    return ((commercialCost - baseAmount) / baseAmount) * 100;
  }
}
