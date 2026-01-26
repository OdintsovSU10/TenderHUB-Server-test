/**
 * Runtime верификация расчетов наценок
 * Запускается при загрузке страницы Commerce для проверки корректности расчетов
 */

import { applyOperation, calculateMarkupResult, type CalculationContext } from '../markupCalculator';
import type { MarkupStep } from '../../lib/supabase';

/**
 * Результат верификации
 */
export interface VerificationResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failures: VerificationFailure[];
  executionTime: number;
}

/**
 * Информация об упавшем тесте
 */
export interface VerificationFailure {
  testName: string;
  expected: number;
  actual: number;
  difference: number;
  percentDiff: number;
}

/**
 * Допустимая погрешность (1 копейка)
 */
const VERIFICATION_TOLERANCE = 0.01;

/**
 * Тестовые сценарии для проверки при запуске
 */
interface VerificationTest {
  name: string;
  run: () => number;
  expected: number;
}

/**
 * Стандартные параметры наценок для верификации
 */
const VERIFICATION_PARAMS = new Map<string, number>([
  ['material_cost_growth', 10],
  ['works_cost_growth', 10],
  ['overhead_own_forces', 10],
  ['nds_22', 22]
]);

/**
 * Встроенные тесты для runtime проверки
 */
const VERIFICATION_TESTS: VerificationTest[] = [
  // Базовые операции
  {
    name: 'multiply: 1000 × 1.5',
    run: () => applyOperation(1000, 'multiply', 1.5),
    expected: 1500
  },
  {
    name: 'multiply: 1000 × 1.10 (10% markup)',
    run: () => applyOperation(1000, 'multiply', 1.10),
    expected: 1100
  },
  {
    name: 'multiply: 1000 × 1.22 (22% VAT)',
    run: () => applyOperation(1000, 'multiply', 1.22),
    expected: 1220
  },
  {
    name: 'divide: 1000 / 2',
    run: () => applyOperation(1000, 'divide', 2),
    expected: 500
  },
  {
    name: 'add: 1000 + 500',
    run: () => applyOperation(1000, 'add', 500),
    expected: 1500
  },
  {
    name: 'subtract: 1000 - 300',
    run: () => applyOperation(1000, 'subtract', 300),
    expected: 700
  },

  // Расчет с одним шагом
  {
    name: 'single step: 10000 × (1 + 10%)',
    run: () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'markup',
          operand1Key: 'material_cost_growth',
          operand1MultiplyFormat: 'addOne'
        }],
        markupParameters: VERIFICATION_PARAMS
      };
      return calculateMarkupResult(context).commercialCost;
    },
    expected: 11000
  },

  // Расчет с двумя шагами (рост + НДС)
  {
    name: 'two steps: 10000 × 1.10 × 1.22',
    run: () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [
          {
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'material_cost_growth',
            operand1MultiplyFormat: 'addOne'
          },
          {
            baseIndex: 0,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'nds_22',
            operand1MultiplyFormat: 'addOne'
          }
        ],
        markupParameters: VERIFICATION_PARAMS
      };
      return calculateMarkupResult(context).commercialCost;
    },
    expected: 13420
  },

  // Расчет с тремя шагами
  {
    name: 'three steps: 10000 × 1.10 × 1.10 × 1.22',
    run: () => {
      const context: CalculationContext = {
        baseAmount: 10000,
        itemType: 'мат',
        markupSequence: [
          {
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'material_cost_growth',
            operand1MultiplyFormat: 'addOne'
          },
          {
            baseIndex: 0,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'overhead_own_forces',
            operand1MultiplyFormat: 'addOne'
          },
          {
            baseIndex: 1,
            action1: 'multiply',
            operand1Type: 'markup',
            operand1Key: 'nds_22',
            operand1MultiplyFormat: 'addOne'
          }
        ],
        markupParameters: VERIFICATION_PARAMS
      };
      return calculateMarkupResult(context).commercialCost;
    },
    // 10000 * 1.10 * 1.10 * 1.22 = 14762.0 (точное значение)
    expected: 14762
  },

  // Проверка с нулевой базой
  {
    name: 'zero base: 0 × 1.10',
    run: () => {
      const context: CalculationContext = {
        baseAmount: 0,
        itemType: 'мат',
        markupSequence: [{
          baseIndex: -1,
          action1: 'multiply',
          operand1Type: 'number',
          operand1Key: 1.10
        }],
        markupParameters: new Map()
      };
      return calculateMarkupResult(context).commercialCost;
    },
    expected: 0
  }
];

/**
 * Выполняет все тесты верификации
 */
export function runMarkupVerification(): VerificationResult {
  const startTime = performance.now();
  const failures: VerificationFailure[] = [];
  let passedTests = 0;

  for (const test of VERIFICATION_TESTS) {
    try {
      const actual = test.run();
      const difference = Math.abs(actual - test.expected);

      if (difference <= VERIFICATION_TOLERANCE) {
        passedTests++;
      } else {
        failures.push({
          testName: test.name,
          expected: test.expected,
          actual,
          difference,
          percentDiff: test.expected !== 0 ? (difference / test.expected) * 100 : 100
        });
      }
    } catch (error) {
      failures.push({
        testName: test.name,
        expected: test.expected,
        actual: NaN,
        difference: Infinity,
        percentDiff: 100
      });
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    passed: failures.length === 0,
    totalTests: VERIFICATION_TESTS.length,
    passedTests,
    failures,
    executionTime
  };
}

/**
 * Логирует результаты верификации в консоль
 */
export function logVerificationResults(result: VerificationResult): void {
  if (result.passed) {
    console.log(
      `%c[MARKUP VERIFICATION] ✓ All ${result.totalTests} tests passed (${result.executionTime.toFixed(2)}ms)`,
      'color: #10b981; font-weight: bold'
    );
  } else {
    console.error(
      `%c[MARKUP VERIFICATION] ✗ ${result.failures.length} of ${result.totalTests} tests FAILED!`,
      'color: #ef4444; font-weight: bold'
    );
    console.group('Failed tests:');
    result.failures.forEach(f => {
      console.error(
        `  ${f.testName}: expected ${f.expected}, got ${f.actual} (diff: ${f.difference.toFixed(4)})`
      );
    });
    console.groupEnd();
  }
}

/**
 * Форматирует результат для отображения пользователю
 */
export function formatVerificationMessage(result: VerificationResult): string {
  if (result.passed) {
    return `Верификация расчетов: ${result.passedTests}/${result.totalTests} тестов пройдено`;
  }

  const failedNames = result.failures.map(f => f.testName).join(', ');
  return `Ошибка верификации расчетов! Упавшие тесты: ${failedNames}`;
}
