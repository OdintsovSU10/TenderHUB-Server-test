import { useMemo } from 'react';
import { TabKey } from '../types';
import { calculateIntermediateResults, calculateFinalResult } from '../utils/calculations';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';

/**
 * Хук для расчета промежуточных и финального результатов наценок
 * Использует чистую функцию из utils/calculations.ts с инъекцией зависимостей
 */
export const useMarkupCalculator = (tabKey: TabKey) => {
  const { sequences, baseCosts, form } = useMarkupConstructorContext();

  const intermediateResults = useMemo(() => {
    const markupValues = form.getFieldsValue();
    const sequence = sequences.markupSequences[tabKey] || [];
    const baseCost = baseCosts.baseCosts[tabKey] || 0;

    return calculateIntermediateResults(sequence, baseCost, markupValues);
  }, [sequences.markupSequences, tabKey, baseCosts.baseCosts, form]);

  const finalResult = useMemo(() => {
    const markupValues = form.getFieldsValue();
    const sequence = sequences.markupSequences[tabKey] || [];
    const baseCost = baseCosts.baseCosts[tabKey] || 0;

    return calculateFinalResult(sequence, baseCost, markupValues);
  }, [sequences.markupSequences, tabKey, baseCosts.baseCosts, form]);

  return {
    intermediateResults,
    finalResult,
  };
};
