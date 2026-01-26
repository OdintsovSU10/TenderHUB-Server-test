/**
 * Серверная верификация расчетов через PostgreSQL
 * Сравнивает результат клиентского расчета с серверным
 */

import { supabase } from '../../lib/supabase';
import type { MarkupStep } from '../../lib/supabase';

/**
 * Результат серверной верификации
 */
export interface ServerVerificationResult {
  passed: boolean;
  serverResult: number | null;
  clientResult: number;
  difference: number | null;
  errorMessage: string | null;
}

/**
 * Верифицирует расчет через сервер
 * Вызывает PostgreSQL функцию verify_markup_calculation
 *
 * @param baseAmount - Базовая стоимость
 * @param markupParameters - Параметры наценок
 * @param sequence - Последовательность операций
 * @param clientResult - Результат клиентского расчета
 * @returns Результат сравнения
 */
export async function verifyWithServer(
  baseAmount: number,
  markupParameters: Map<string, number>,
  sequence: MarkupStep[],
  clientResult: number
): Promise<ServerVerificationResult> {
  try {
    // Конвертируем Map в объект для передачи в PostgreSQL
    const parametersJson = Object.fromEntries(markupParameters);

    const { data, error } = await supabase.rpc('verify_markup_calculation', {
      p_base_amount: baseAmount,
      p_markup_percentages: parametersJson,
      p_sequence: sequence,
      p_expected_result: clientResult
    });

    if (error) {
      return {
        passed: false,
        serverResult: null,
        clientResult,
        difference: null,
        errorMessage: `Ошибка вызова функции: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      return {
        passed: false,
        serverResult: null,
        clientResult,
        difference: null,
        errorMessage: 'Функция не вернула результат'
      };
    }

    const result = data[0];
    return {
      passed: result.passed,
      serverResult: result.server_result,
      clientResult,
      difference: result.difference,
      errorMessage: result.error_message
    };
  } catch (error) {
    return {
      passed: false,
      serverResult: null,
      clientResult,
      difference: null,
      errorMessage: `Исключение: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

/**
 * Выполняет пакетную верификацию нескольких расчетов
 *
 * @param calculations - Массив расчетов для проверки
 * @returns Массив результатов верификации
 */
export async function batchVerifyWithServer(
  calculations: Array<{
    baseAmount: number;
    markupParameters: Map<string, number>;
    sequence: MarkupStep[];
    clientResult: number;
  }>
): Promise<ServerVerificationResult[]> {
  const results = await Promise.all(
    calculations.map(calc =>
      verifyWithServer(
        calc.baseAmount,
        calc.markupParameters,
        calc.sequence,
        calc.clientResult
      )
    )
  );

  return results;
}

/**
 * Логирует результат серверной верификации
 */
export function logServerVerificationResult(result: ServerVerificationResult): void {
  if (result.passed) {
    console.log(
      `%c[SERVER VERIFICATION] ✓ Passed: client=${result.clientResult}, server=${result.serverResult}`,
      'color: #10b981; font-weight: bold'
    );
  } else {
    console.error(
      `%c[SERVER VERIFICATION] ✗ Failed: client=${result.clientResult}, server=${result.serverResult}, diff=${result.difference}`,
      'color: #ef4444; font-weight: bold'
    );
    if (result.errorMessage) {
      console.error(`  Error: ${result.errorMessage}`);
    }
  }
}
