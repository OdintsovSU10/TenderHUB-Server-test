/**
 * Загрузка параметров наценок для тендеров
 */

import { supabase } from '../../lib/supabase';

/**
 * Загружает параметры наценок для тендера
 * @param tenderId ID тендера
 * @returns Map с параметрами наценок (ключ -> значение)
 */
export async function loadMarkupParameters(tenderId: string): Promise<Map<string, number>> {
  // ИСПРАВЛЕННАЯ ВЕРСИЯ: Загружаем параметры напрямую из tender_markup_percentage
  const parametersMap = new Map<string, number>();

  try {
    // Определяем соответствие ID -> ключ параметра
    const PARAMETER_KEYS: Record<string, string> = {
      '2c487a7b-bfb2-4315-84e2-47204ef1b4d8': 'mechanization_service',
      '69bb3c39-68b6-4738-b1ad-855b06ef65b6': 'mbp_gsm',
      '4c7f6c87-5603-49de-ab14-a41e4cc1576d': 'warranty_period',
      '8025d9c4-7702-4f3a-a496-1eca820345e6': 'works_16_markup',
      'be99baf4-2afe-4387-8591-decb50cc44e4': 'works_cost_growth',
      '78b4763a-1b67-4079-a0ec-fe40c8a05e00': 'material_cost_growth',
      '4961e7f2-4abc-4d3c-8213-6f49424387f8': 'subcontract_works_cost_growth',
      '214d9304-a070-4a82-a302-1d880efa7fdd': 'subcontract_materials_cost_growth',
      '4952629e-3026-47f3-a7de-1f0166de75d4': 'contingency_costs',
      '227c4abd-e3bd-471c-95ea-d0c1d0100506': 'overhead_own_forces',
      'e322a83d-ad51-45d9-b809-b56904971f40': 'overhead_subcontract',
      'd40f22a5-119c-47ed-817d-ce58603b398d': 'general_costs_without_subcontract',
      '369e3c15-a03e-475c-bdd4-a91a0b70a4e9': 'profit_own_forces',
      '46be3bc8-80a9-4eda-b8b2-a1f8a550bbfc': 'profit_subcontract'
    };

    // Загружаем значения из tender_markup_percentage
    const { data: tenderPercentages, error } = await supabase
      .from('tender_markup_percentage')
      .select('markup_parameter_id, value')
      .eq('tender_id', tenderId);

    if (error) {
      console.error('Ошибка загрузки параметров тендера:', error);
      return getFallbackParameters();
    }

    if (tenderPercentages && tenderPercentages.length > 0) {
      // Заполняем Map параметрами из БД
      for (const param of tenderPercentages) {
        const key = PARAMETER_KEYS[param.markup_parameter_id];
        if (key) {
          parametersMap.set(key, param.value);
          if (key === 'material_cost_growth') {
            console.log(`✅ Загружен material_cost_growth = ${param.value}% из БД`);
          }
        }
      }

      console.log('Загружены параметры из БД:', {
        size: parametersMap.size,
        entries: Array.from(parametersMap.entries())
      });
    }

    // Если параметров мало, используем фоллбэк
    if (parametersMap.size === 0) {
      console.warn('Параметры не найдены, используем фоллбэк');
      return getFallbackParameters();
    }

    return parametersMap;

  } catch (error) {
    console.error('Ошибка загрузки параметров:', error);
    return getFallbackParameters();
  }
}

/**
 * Возвращает фоллбэк параметры для случаев когда БД недоступна
 */
export function getFallbackParameters(): Map<string, number> {
  const parametersMap = new Map<string, number>();

  // Базовые параметры для расчета коэффициентов
  parametersMap.set('mechanization_service', 5);
  parametersMap.set('mbp_gsm', 5);
  parametersMap.set('warranty_period', 5);
  parametersMap.set('works_16_markup', 60);
  parametersMap.set('works_cost_growth', 10);
  parametersMap.set('material_cost_growth', 10);
  parametersMap.set('subcontract_works_cost_growth', 10);
  parametersMap.set('subcontract_materials_cost_growth', 10);
  parametersMap.set('contingency_costs', 3);
  parametersMap.set('overhead_own_forces', 10);
  parametersMap.set('overhead_subcontract', 10);
  parametersMap.set('general_costs_without_subcontract', 20);
  parametersMap.set('profit_own_forces', 10);
  parametersMap.set('profit_subcontract', 16);

  console.log('Используются фоллбэк параметры наценок');
  return parametersMap;
}
