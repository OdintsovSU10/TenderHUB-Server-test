import { useState, useCallback } from 'react';
import { TabKey, MarkupSequences, MarkupStep } from '../types';
import { INITIAL_MARKUP_SEQUENCES } from '../constants';

export const useMarkupSequences = () => {
  const [markupSequences, setMarkupSequences] = useState<MarkupSequences>(INITIAL_MARKUP_SEQUENCES);

  const addStep = useCallback((tab: TabKey, step: MarkupStep) => {
    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      return {
        ...prev,
        [tab]: [...tabSteps, step],
      };
    });
  }, []);

  const updateStep = useCallback((tab: TabKey, index: number, step: MarkupStep) => {
    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      return {
        ...prev,
        [tab]: tabSteps.map((s: MarkupStep, i: number) => (i === index ? step : s)),
      };
    });
  }, []);

  const deleteStep = useCallback((tab: TabKey, index: number) => {
    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      return {
        ...prev,
        [tab]: tabSteps.filter((_: MarkupStep, i: number) => i !== index),
      };
    });
  }, []);

  const moveStepUp = useCallback((tab: TabKey, index: number) => {
    if (index === 0) return;

    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      const newSteps = [...tabSteps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      return { ...prev, [tab]: newSteps };
    });
  }, []);

  const moveStepDown = useCallback((tab: TabKey, index: number) => {
    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      if (index >= tabSteps.length - 1) return prev;

      const newSteps = [...tabSteps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      return { ...prev, [tab]: newSteps };
    });
  }, []);

  const insertStep = useCallback((tab: TabKey, index: number, step: MarkupStep) => {
    setMarkupSequences(prev => {
      const tabSteps = prev[tab];
      const newSteps = [...tabSteps];
      newSteps.splice(index, 0, step);
      return { ...prev, [tab]: newSteps };
    });
  }, []);

  const resetSequences = useCallback(() => {
    setMarkupSequences(INITIAL_MARKUP_SEQUENCES);
  }, []);

  const setSequencesForTab = useCallback((tab: TabKey, steps: MarkupStep[]) => {
    setMarkupSequences(prev => ({
      ...prev,
      [tab]: steps,
    }));
  }, []);

  return {
    markupSequences,
    setMarkupSequences,
    addStep,
    updateStep,
    deleteStep,
    moveStepUp,
    moveStepDown,
    insertStep,
    resetSequences,
    setSequencesForTab,
  };
};
