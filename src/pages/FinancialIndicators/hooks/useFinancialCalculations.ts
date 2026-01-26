/**
 * Хук для расчёта финансовых показателей
 * Использует пошаговую агрегацию тактики наценок для соответствия с Формой КП
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/debug';
import { loadMarkupParameters } from '../../../services/markupTactic/parameters';
import {
  loadSubcontractGrowthExclusions,
  type SubcontractGrowthExclusions
} from '../../../services/markupTactic/calculation';
import {
  calculateTenderMarkupAggregation,
  getMarkupByParameter,
  type TenderMarkupAggregation
} from '../../../services/markupTactic/aggregation';
import type { BoqItem } from '../../../lib/supabase';

export interface IndicatorRow {
  key: string;
  row_number: number;
  indicator_name: string;
  coefficient?: string;
  sp_cost?: number;
  customer_cost?: number;
  total_cost?: number;
  is_header?: boolean;
  is_total?: boolean;
  is_yellow?: boolean;
  tooltip?: string;
  // Промежуточные расчеты для роста стоимости (для drill-down в графиках)
  works_su10_growth?: number;
  materials_su10_growth?: number;
  works_sub_growth?: number;
  materials_sub_growth?: number;
}

interface MarkupParameterInfo {
  id: string;
  key: string;
  label: string;
  default_value: number;
}

const addNotification = async (
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'pending' = 'warning'
) => {
  try {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      is_read: false,
    });
  } catch (error) {
    logger.error('Ошибка создания уведомления:', error);
  }
};

/**
 * Загружает тактику наценок для тендера
 */
async function loadTacticForTender(tacticId: string) {
  const { data, error } = await supabase
    .from('markup_tactics')
    .select('*')
    .eq('id', tacticId)
    .single();

  if (error) {
    logger.error('Ошибка загрузки тактики:', error);
    return null;
  }

  return data;
}

/**
 * Загружает BOQ элементы для тендера с батчингом
 */
async function loadBoqItems(tenderId: string): Promise<BoqItem[]> {
  const allItems: BoqItem[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('boq_items')
      .select(`
        *,
        client_position:client_positions!inner(tender_id)
      `)
      .eq('client_position.tender_id', tenderId)
      .range(from, from + batchSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allItems.push(...data);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allItems;
}

/**
 * Загружает информацию о параметрах наценок для отображения коэффициентов
 */
async function loadMarkupParametersInfo(tenderId: string): Promise<{
  params: MarkupParameterInfo[];
  valuesMap: Map<string, number>;
}> {
  const { data: tenderMarkupPercentages } = await supabase
    .from('tender_markup_percentage')
    .select(`
      *,
      markup_parameter:markup_parameters(*)
    `)
    .eq('tender_id', tenderId);

  const params: MarkupParameterInfo[] = (tenderMarkupPercentages || [])
    .map(tmp => tmp.markup_parameter)
    .filter(Boolean);

  const valuesMap = new Map<string, number>();
  tenderMarkupPercentages?.forEach(tmp => {
    if (tmp.markup_parameter?.key) {
      valuesMap.set(tmp.markup_parameter.key, tmp.value ?? tmp.markup_parameter.default_value ?? 0);
    }
  });

  return { params, valuesMap };
}

/**
 * Находит параметр по ключевым словам
 */
function findParamByKeywords(
  params: MarkupParameterInfo[],
  keywords: string[],
  excludeKeywords: string[] = []
): MarkupParameterInfo | undefined {
  return params.find(p => {
    const label = p.label.toLowerCase();
    const key = p.key.toLowerCase();
    const matchesInclude = keywords.every(kw => label.includes(kw) || key.includes(kw));
    const matchesExclude = excludeKeywords.length === 0 || !excludeKeywords.some(kw => label.includes(kw));
    return matchesInclude && matchesExclude;
  });
}

/**
 * Получает значение коэффициента
 */
function getCoeffValue(
  param: MarkupParameterInfo | undefined,
  valuesMap: Map<string, number>
): number {
  if (!param) return 0;
  return valuesMap.get(param.key) ?? param.default_value ?? 0;
}

export const useFinancialCalculations = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IndicatorRow[]>([]);
  const [spTotal, setSpTotal] = useState<number>(0);
  const [customerTotal, setCustomerTotal] = useState<number>(0);
  const [aggregation, setAggregation] = useState<TenderMarkupAggregation | null>(null);

  const fetchFinancialIndicators = useCallback(async (selectedTenderId: string | null) => {
    if (!selectedTenderId) return;

    setLoading(true);
    try {
      // 1. Загружаем тендер
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', selectedTenderId)
        .single();

      if (tenderError) {
        await addNotification('Ошибка загрузки тендера', tenderError.message, 'warning');
        throw tenderError;
      }

      const areaSp = tender?.area_sp || 0;
      const areaClient = tender?.area_client || 0;

      // 2. Загружаем тактику
      if (!tender.markup_tactic_id) {
        await addNotification('Тактика не назначена', 'Для тендера не назначена тактика наценок', 'warning');
        setData([]);
        return;
      }

      const tactic = await loadTacticForTender(tender.markup_tactic_id);
      if (!tactic) {
        await addNotification('Тактика не найдена', 'Не удалось загрузить тактику наценок', 'warning');
        setData([]);
        return;
      }

      // 3. Загружаем параметры наценок
      const markupParameters = await loadMarkupParameters(selectedTenderId);

      // 4. Загружаем исключения роста субподряда
      const exclusions = await loadSubcontractGrowthExclusions(selectedTenderId);

      // 5. Загружаем BOQ элементы
      const boqItems = await loadBoqItems(selectedTenderId);

      if (boqItems.length === 0) {
        setData([]);
        return;
      }

      // 6. Выполняем агрегацию (КЛЮЧЕВОЙ РАСЧЁТ)
      const agg = calculateTenderMarkupAggregation(
        boqItems,
        tactic,
        markupParameters,
        exclusions
      );
      setAggregation(agg);

      // 7. Загружаем информацию о параметрах для отображения коэффициентов
      const { params, valuesMap } = await loadMarkupParametersInfo(selectedTenderId);

      // 8. Находим параметры по ключевым словам (для отображения коэффициентов)
      const mechanizationParam = findParamByKeywords(params, ['механизац']);
      const mvpGsmParam = findParamByKeywords(params, ['мвп', 'гсм']);
      const warrantyParam = findParamByKeywords(params, ['гарант']);
      const coefficient06Param = findParamByKeywords(params, ['1,6', '1.6', 'works_16']);
      const worksCostGrowthParam = findParamByKeywords(params, ['рост', 'работ'], ['субподряд']);
      const materialCostGrowthParam = findParamByKeywords(params, ['рост', 'материал'], ['субподряд']);
      const subWorksCostGrowthParam = findParamByKeywords(params, ['рост', 'работ', 'субподряд']);
      const subMatCostGrowthParam = findParamByKeywords(params, ['рост', 'материал', 'субподряд']);
      const overheadOwnForcesParam = findParamByKeywords(params, ['ооз'], ['субподряд']);
      const overheadSubcontractParam = findParamByKeywords(params, ['ооз', 'субподряд']);
      const generalCostsParam = findParamByKeywords(params, ['офз']);
      const profitOwnForcesParam = findParamByKeywords(params, ['прибыль'], ['субподряд']);
      const profitSubcontractParam = findParamByKeywords(params, ['прибыль', 'субподряд']);
      const unforeseeableParam = findParamByKeywords(params, ['непредвид']);
      const vatParam = findParamByKeywords(params, ['ндс']);

      // 9. Получаем коэффициенты для отображения
      const mechanizationCoeff = getCoeffValue(mechanizationParam, valuesMap);
      const mvpGsmCoeff = getCoeffValue(mvpGsmParam, valuesMap);
      const warrantyCoeff = getCoeffValue(warrantyParam, valuesMap);
      const coefficient06 = getCoeffValue(coefficient06Param, valuesMap);
      const worksCostGrowth = getCoeffValue(worksCostGrowthParam, valuesMap);
      const materialCostGrowth = getCoeffValue(materialCostGrowthParam, valuesMap);
      const subWorksCostGrowth = getCoeffValue(subWorksCostGrowthParam, valuesMap);
      const subMatCostGrowth = getCoeffValue(subMatCostGrowthParam, valuesMap);
      const overheadOwnForcesCoeff = getCoeffValue(overheadOwnForcesParam, valuesMap);
      const overheadSubcontractCoeff = getCoeffValue(overheadSubcontractParam, valuesMap);
      const generalCostsCoeff = getCoeffValue(generalCostsParam, valuesMap);
      const profitOwnForcesCoeff = getCoeffValue(profitOwnForcesParam, valuesMap);
      const profitSubcontractCoeff = getCoeffValue(profitSubcontractParam, valuesMap);
      const unforeseeableCoeff = getCoeffValue(unforeseeableParam, valuesMap);
      const vatCoeff = getCoeffValue(vatParam, valuesMap);

      // 10. Получаем данные из агрегации
      const { directCosts } = agg;
      const subcontractTotal = directCosts.subcontractWorks + directCosts.subcontractMaterials;
      const su10Total = directCosts.works + directCosts.materials + directCosts.worksComp + directCosts.materialsComp;

      // Наценки из агрегации (пошаговый расчёт как в КП)
      const mechanizationCost = getMarkupByParameter(agg, 'mechanization_service');
      const mvpGsmCost = getMarkupByParameter(agg, 'mbp_gsm');
      const warrantyCost = getMarkupByParameter(agg, 'warranty_period');
      const coefficient06Cost = getMarkupByParameter(agg, 'works_16_markup');
      const worksCostGrowthAmount = getMarkupByParameter(agg, 'works_cost_growth');
      const materialCostGrowthAmount = getMarkupByParameter(agg, 'material_cost_growth');
      const subWorksCostGrowthAmount = getMarkupByParameter(agg, 'subcontract_works_cost_growth');
      const subMatCostGrowthAmount = getMarkupByParameter(agg, 'subcontract_materials_cost_growth');
      const unforeseeableCost = getMarkupByParameter(agg, 'contingency_costs');
      const overheadOwnForcesCost = getMarkupByParameter(agg, 'overhead_own_forces');
      const overheadSubcontractCost = getMarkupByParameter(agg, 'overhead_subcontract');
      const generalCostsCost = getMarkupByParameter(agg, 'general_costs_without_subcontract');
      const profitOwnForcesCost = getMarkupByParameter(agg, 'profit_own_forces');
      const profitSubcontractCost = getMarkupByParameter(agg, 'profit_subcontract');
      const vatCost = getMarkupByParameter(agg, 'nds_22');

      const totalCostGrowth = worksCostGrowthAmount + materialCostGrowthAmount +
                              subWorksCostGrowthAmount + subMatCostGrowthAmount;

      const grandTotal = agg.totalCommercialCost;
      const grandTotalBeforeVAT = grandTotal - vatCost;

      logger.debug('=== Financial Indicators from Aggregation ===');
      logger.debug('Direct costs:', directCosts.total);
      logger.debug('Mechanization:', mechanizationCost);
      logger.debug('MVP+GSM:', mvpGsmCost);
      logger.debug('Warranty:', warrantyCost);
      logger.debug('1.6k:', coefficient06Cost);
      logger.debug('Cost growth:', totalCostGrowth);
      logger.debug('Unforeseeable:', unforeseeableCost);
      logger.debug('Overhead own:', overheadOwnForcesCost);
      logger.debug('Overhead sub:', overheadSubcontractCost);
      logger.debug('General costs:', generalCostsCost);
      logger.debug('Profit own:', profitOwnForcesCost);
      logger.debug('Profit sub:', profitSubcontractCost);
      logger.debug('VAT:', vatCost);
      logger.debug('GRAND TOTAL:', grandTotal);

      // 11. Формируем данные таблицы
      const tableData: IndicatorRow[] = [
        {
          key: '1',
          row_number: 1,
          indicator_name: 'Прямые затраты, в т.ч.',
          coefficient: '',
          sp_cost: areaSp > 0 ? directCosts.total / areaSp : 0,
          customer_cost: areaClient > 0 ? directCosts.total / areaClient : 0,
          total_cost: directCosts.total,
          tooltip: `Состав прямых затрат (из агрегации BOQ):\n` +
                   `Субподряд работы: ${directCosts.subcontractWorks.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `+ Субподряд материалы: ${directCosts.subcontractMaterials.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `+ Работы СУ-10: ${directCosts.works.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `+ Материалы СУ-10: ${directCosts.materials.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `+ Работы комп.: ${directCosts.worksComp.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `+ Материалы комп.: ${directCosts.materialsComp.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `= ${directCosts.total.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '2',
          row_number: 2,
          indicator_name: 'Субподряд',
          sp_cost: areaSp > 0 ? subcontractTotal / areaSp : 0,
          customer_cost: areaClient > 0 ? subcontractTotal / areaClient : 0,
          total_cost: subcontractTotal
        },
        {
          key: '3',
          row_number: 3,
          indicator_name: 'Работы + Материалы СУ-10',
          sp_cost: areaSp > 0 ? su10Total / areaSp : 0,
          customer_cost: areaClient > 0 ? su10Total / areaClient : 0,
          total_cost: su10Total
        },
        {
          key: '4',
          row_number: 4,
          indicator_name: 'Служба механизации',
          coefficient: mechanizationCoeff > 0 ? `${parseFloat(mechanizationCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? mechanizationCost / areaSp : 0,
          customer_cost: areaClient > 0 ? mechanizationCost / areaClient : 0,
          total_cost: mechanizationCost,
          tooltip: `Сумма наценок по параметру "mechanization_service"\n` +
                   `Коэффициент: ${mechanizationCoeff}%\n` +
                   `Итого: ${mechanizationCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.\n` +
                   `(рассчитано пошагово для каждого BOQ элемента)`
        },
        {
          key: '5',
          row_number: 5,
          indicator_name: 'МБП+ГСМ',
          coefficient: mvpGsmCoeff > 0 ? `${parseFloat(mvpGsmCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? mvpGsmCost / areaSp : 0,
          customer_cost: areaClient > 0 ? mvpGsmCost / areaClient : 0,
          total_cost: mvpGsmCost,
          tooltip: `Сумма наценок по параметру "mbp_gsm"\n` +
                   `Коэффициент: ${mvpGsmCoeff}%\n` +
                   `Итого: ${mvpGsmCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '6',
          row_number: 6,
          indicator_name: 'Гарантийный период',
          coefficient: warrantyCoeff > 0 ? `${parseFloat(warrantyCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? warrantyCost / areaSp : 0,
          customer_cost: areaClient > 0 ? warrantyCost / areaClient : 0,
          total_cost: warrantyCost,
          tooltip: `Сумма наценок по параметру "warranty_period"\n` +
                   `Коэффициент: ${warrantyCoeff}%\n` +
                   `Итого: ${warrantyCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '7',
          row_number: 7,
          indicator_name: '1,6',
          coefficient: coefficient06 > 0 ? `${parseFloat(coefficient06.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? coefficient06Cost / areaSp : 0,
          customer_cost: areaClient > 0 ? coefficient06Cost / areaClient : 0,
          total_cost: coefficient06Cost,
          tooltip: `Сумма наценок по параметру "works_16_markup"\n` +
                   `Коэффициент: ${coefficient06}%\n` +
                   `Итого: ${coefficient06Cost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '8',
          row_number: 8,
          indicator_name: 'Рост стоимости',
          coefficient: [
            worksCostGrowth > 0 ? `Раб:${parseFloat(worksCostGrowth.toFixed(5))}%` : '',
            materialCostGrowth > 0 ? `Мат:${parseFloat(materialCostGrowth.toFixed(5))}%` : '',
            subWorksCostGrowth > 0 ? `С.Раб:${parseFloat(subWorksCostGrowth.toFixed(5))}%` : '',
            subMatCostGrowth > 0 ? `С.Мат:${parseFloat(subMatCostGrowth.toFixed(5))}%` : ''
          ].filter(Boolean).join(', '),
          sp_cost: areaSp > 0 ? totalCostGrowth / areaSp : 0,
          customer_cost: areaClient > 0 ? totalCostGrowth / areaClient : 0,
          total_cost: totalCostGrowth,
          works_su10_growth: worksCostGrowthAmount,
          materials_su10_growth: materialCostGrowthAmount,
          works_sub_growth: subWorksCostGrowthAmount,
          materials_sub_growth: subMatCostGrowthAmount,
          tooltip: `Рост стоимости (из агрегации):\n` +
                   `Работы СУ-10 (works_cost_growth): ${worksCostGrowthAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `Материалы СУ-10 (material_cost_growth): ${materialCostGrowthAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `Работы субподряд (subcontract_works_cost_growth): ${subWorksCostGrowthAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `Материалы субподряд (subcontract_materials_cost_growth): ${subMatCostGrowthAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}\n` +
                   `Итого: ${totalCostGrowth.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '9',
          row_number: 9,
          indicator_name: 'Непредвиденные',
          coefficient: unforeseeableCoeff > 0 ? `${parseFloat(unforeseeableCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? unforeseeableCost / areaSp : 0,
          customer_cost: areaClient > 0 ? unforeseeableCost / areaClient : 0,
          total_cost: unforeseeableCost,
          tooltip: `Сумма наценок по параметру "contingency_costs"\n` +
                   `Коэффициент: ${unforeseeableCoeff}%\n` +
                   `Итого: ${unforeseeableCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '10',
          row_number: 10,
          indicator_name: 'ООЗ',
          coefficient: overheadOwnForcesCoeff > 0 ? `${parseFloat(overheadOwnForcesCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? overheadOwnForcesCost / areaSp : 0,
          customer_cost: areaClient > 0 ? overheadOwnForcesCost / areaClient : 0,
          total_cost: overheadOwnForcesCost,
          tooltip: `Сумма наценок по параметру "overhead_own_forces"\n` +
                   `Коэффициент: ${overheadOwnForcesCoeff}%\n` +
                   `Итого: ${overheadOwnForcesCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '11',
          row_number: 11,
          indicator_name: 'ООЗ Субподряд',
          coefficient: overheadSubcontractCoeff > 0 ? `${parseFloat(overheadSubcontractCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? overheadSubcontractCost / areaSp : 0,
          customer_cost: areaClient > 0 ? overheadSubcontractCost / areaClient : 0,
          total_cost: overheadSubcontractCost,
          tooltip: `Сумма наценок по параметру "overhead_subcontract"\n` +
                   `Коэффициент: ${overheadSubcontractCoeff}%\n` +
                   `Итого: ${overheadSubcontractCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '12',
          row_number: 12,
          indicator_name: 'ОФЗ',
          coefficient: generalCostsCoeff > 0 ? `${parseFloat(generalCostsCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? generalCostsCost / areaSp : 0,
          customer_cost: areaClient > 0 ? generalCostsCost / areaClient : 0,
          total_cost: generalCostsCost,
          tooltip: `Сумма наценок по параметру "general_costs_without_subcontract"\n` +
                   `Коэффициент: ${generalCostsCoeff}%\n` +
                   `Итого: ${generalCostsCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '13',
          row_number: 13,
          indicator_name: 'Прибыль',
          coefficient: profitOwnForcesCoeff > 0 ? `${parseFloat(profitOwnForcesCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? profitOwnForcesCost / areaSp : 0,
          customer_cost: areaClient > 0 ? profitOwnForcesCost / areaClient : 0,
          total_cost: profitOwnForcesCost,
          tooltip: `Сумма наценок по параметру "profit_own_forces"\n` +
                   `Коэффициент: ${profitOwnForcesCoeff}%\n` +
                   `Итого: ${profitOwnForcesCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '14',
          row_number: 14,
          indicator_name: 'Прибыль субподряд',
          coefficient: profitSubcontractCoeff > 0 ? `${parseFloat(profitSubcontractCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? profitSubcontractCost / areaSp : 0,
          customer_cost: areaClient > 0 ? profitSubcontractCost / areaClient : 0,
          total_cost: profitSubcontractCost,
          tooltip: `Сумма наценок по параметру "profit_subcontract"\n` +
                   `Коэффициент: ${profitSubcontractCoeff}%\n` +
                   `Итого: ${profitSubcontractCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '15',
          row_number: 15,
          indicator_name: 'НДС',
          coefficient: vatCoeff > 0 ? `${parseFloat(vatCoeff.toFixed(5))}%` : '',
          sp_cost: areaSp > 0 ? vatCost / areaSp : 0,
          customer_cost: areaClient > 0 ? vatCost / areaClient : 0,
          total_cost: vatCost,
          is_yellow: true,
          tooltip: `Сумма наценок по параметру "nds_22"\n` +
                   `Коэффициент: ${vatCoeff}%\n` +
                   `Итого: ${vatCost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`
        },
        {
          key: '16',
          row_number: 16,
          indicator_name: 'ИТОГО',
          coefficient: '',
          sp_cost: areaSp > 0 ? grandTotal / areaSp : 0,
          customer_cost: areaClient > 0 ? grandTotal / areaClient : 0,
          total_cost: grandTotal,
          is_total: true
        },
      ];

      setData(tableData);
      setSpTotal(areaSp);
      setCustomerTotal(areaClient);
    } catch (error) {
      logger.error('Ошибка загрузки показателей:', error);
      await addNotification(
        'Ошибка загрузки финансовых показателей',
        `Не удалось загрузить финансовые показатели: ${error instanceof Error ? error.message : String(error)}`,
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    spTotal,
    customerTotal,
    loading,
    fetchFinancialIndicators,
    aggregation, // Экспортируем агрегацию для возможной верификации
  };
};
