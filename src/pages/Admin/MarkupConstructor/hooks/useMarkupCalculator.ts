import { useMemo } from 'react';
import { TabKey } from '../types';
import { calculateIntermediateResults, calculateFinalResult } from '../utils/calculations';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';

/**
 * Хук для расчета промежуточных и финального результатов наценок
 * Использует чистую функцию из utils/calculations.ts с инъекцией зависимостей
 */
export const useMarkupCalculator = (tabKey: TabKey) => {
  const { sequences, baseCosts, parameters } = useMarkupConstructorContext();

  const intermediateResults = useMemo(() => {
    // Преобразуем параметры наценок в формат Record<string, number>
    const markupValues: Record<string, number> = {};
    parameters.markupParameters.forEach((param) => {
      markupValues[param.key] = param.default_value || 0;
    });

    const sequence = sequences.markupSequences[tabKey] || [];
    const baseCost = baseCosts.baseCosts[tabKey] || 0;

    return calculateIntermediateResults(sequence, baseCost, markupValues);
  }, [sequences.markupSequences, tabKey, baseCosts.baseCosts, parameters.markupParameters]);

  const finalResult = useMemo(() => {
    // Преобразуем параметры наценок в формат Record<string, number>
    const markupValues: Record<string, number> = {};
    parameters.markupParameters.forEach((param) => {
      markupValues[param.key] = param.default_value || 0;
    });

    const sequence = sequences.markupSequences[tabKey] || [];
    const baseCost = baseCosts.baseCosts[tabKey] || 0;

    return calculateFinalResult(sequence, baseCost, markupValues);
  }, [sequences.markupSequences, tabKey, baseCosts.baseCosts, parameters.markupParameters]);

  return {
    intermediateResults,
    finalResult,
  };
};
