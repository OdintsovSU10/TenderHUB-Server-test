import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase } from '../../../../lib/supabase';
import { TabKey, BaseCosts } from '../types';
import { INITIAL_BASE_COSTS } from '../constants';

/**
 * Хук для управления базовыми стоимостями для всех табов
 * Каждый TabKey имеет свою базовую стоимость
 */
export const useBaseCosts = () => {
  const [baseCosts, setBaseCosts] = useState<BaseCosts>(INITIAL_BASE_COSTS);
  const [loadingBaseCosts, setLoadingBaseCosts] = useState(false);

  /**
   * Загрузить базовые стоимости из БД для конкретной тактики
   */
  const fetchBaseCosts = useCallback(async (tacticId: string) => {
    setLoadingBaseCosts(true);
    try {
      const { data, error } = await supabase
        .from('markup_tactics')
        .select('base_costs')
        .eq('id', tacticId)
        .single();

      if (error) throw error;

      if (data && data.base_costs) {
        // Преобразование из русского формата в английский
        const baseCostsEn: BaseCosts = {
          works: data.base_costs['раб'] || 0,
          materials: data.base_costs['мат'] || 0,
          subcontract_works: data.base_costs['суб-раб'] || 0,
          subcontract_materials: data.base_costs['суб-мат'] || 0,
          work_comp: data.base_costs['раб-комп.'] || 0,
          material_comp: data.base_costs['мат-комп.'] || 0,
        };

        setBaseCosts(baseCostsEn);
      } else {
        setBaseCosts(INITIAL_BASE_COSTS);
      }
    } catch (error) {
      console.error('Error fetching base costs:', error);
      message.error('Ошибка загрузки базовых стоимостей');
      setBaseCosts(INITIAL_BASE_COSTS);
    } finally {
      setLoadingBaseCosts(false);
    }
  }, []);

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
    loadingBaseCosts,
    fetchBaseCosts,
    updateBaseCost,
    resetBaseCost,
    resetAllBaseCosts,
  };
};
