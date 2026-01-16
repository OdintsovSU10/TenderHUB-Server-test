import { useState, useCallback } from 'react';
import { TabKey, BaseCosts } from '../types';
import { INITIAL_BASE_COSTS } from '../constants';

/**
 * Хук для управления базовыми стоимостями для всех табов
 * Каждый TabKey имеет свою базовую стоимость
 */
export const useBaseCosts = () => {
  const [baseCosts, setBaseCosts] = useState<BaseCosts>(INITIAL_BASE_COSTS);

  /**
   * Обновить базовую стоимость для конкретной вкладки
   */
  const updateBaseCost = useCallback((tabKey: TabKey, value: number) => {
    setBaseCosts(prev => ({
      ...prev,
      [tabKey]: value,
    }));
  }, []);

  /**
   * Сбросить базовую стоимость для конкретной вкладки
   */
  const resetBaseCost = useCallback((tabKey: TabKey) => {
    setBaseCosts(prev => ({
      ...prev,
      [tabKey]: 0,
    }));
  }, []);

  /**
   * Сбросить все базовые стоимости
   */
  const resetAllBaseCosts = useCallback(() => {
    setBaseCosts(INITIAL_BASE_COSTS);
  }, []);

  return {
    baseCosts,
    setBaseCosts,
    updateBaseCost,
    resetBaseCost,
    resetAllBaseCosts,
  };
};
