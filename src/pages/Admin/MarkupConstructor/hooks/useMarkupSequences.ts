import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase } from '../../../../lib/supabase';
import { TabKey, MarkupSequences, MarkupStep } from '../types';
import { INITIAL_MARKUP_SEQUENCES } from '../constants';

export const useMarkupSequences = () => {
  const [markupSequences, setMarkupSequences] = useState<MarkupSequences>(INITIAL_MARKUP_SEQUENCES);
  const [loadingSequences, setLoadingSequences] = useState(false);

  // Загрузка последовательностей из БД для конкретной тактики
  const fetchSequences = useCallback(async (tacticId: string) => {
    setLoadingSequences(true);
    try {
      const { data, error } = await supabase
        .from('markup_tactics')
        .select('sequences')
        .eq('id', tacticId)
        .single();

      if (error) throw error;

      if (data && data.sequences) {
        // Преобразование из русского формата в английский
        const sequencesEn: MarkupSequences = {
          works: data.sequences['раб'] || [],
          materials: data.sequences['мат'] || [],
          subcontract_works: data.sequences['суб-раб'] || [],
          subcontract_materials: data.sequences['суб-мат'] || [],
          work_comp: data.sequences['раб-комп.'] || [],
          material_comp: data.sequences['мат-комп.'] || [],
        };

        setMarkupSequences(sequencesEn);
      } else {
        // Если нет сохраненных последовательностей, используем пустые
        setMarkupSequences(INITIAL_MARKUP_SEQUENCES);
      }
    } catch (error) {
      console.error('Error fetching sequences:', error);
      message.error('Ошибка загрузки последовательностей наценок');
      setMarkupSequences(INITIAL_MARKUP_SEQUENCES);
    } finally {
      setLoadingSequences(false);
    }
  }, []);

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
    loadingSequences,
    fetchSequences,
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
