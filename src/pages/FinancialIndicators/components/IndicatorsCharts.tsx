import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Table, Button, Spin } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../contexts/ThemeContext';
import type { IndicatorRow } from '../hooks/useFinancialData';

const { Text, Title } = Typography;

interface IndicatorsChartsProps {
  data: IndicatorRow[];
  spTotal: number;
  formatNumber: (value: number | undefined) => string;
  selectedTenderId: string | null;
}

interface CategoryBreakdown {
  category_name: string;
  detail_name: string;
  location_name: string;
  total_amount: number;
  works_amount: number;
  materials_amount: number;
}

interface DrillDownLevel {
  type: 'root' | 'direct_costs' | 'markups' | 'indicator' | 'profit_breakdown' | 'ooz_breakdown' | 'cost_growth_breakdown';
  indicatorName?: string;
  rowNumber?: number;
}

interface PieDataItem {
  label: string;
  value: number;
  color: string;
}

interface BarDataItem {
  label: string;
  pricePerM2: number;
  color: string;
}

interface SummaryTableItem {
  key: number;
  indicator_name: string;
  amount: number;
  price_per_m2: number;
}

export const IndicatorsCharts: React.FC<IndicatorsChartsProps> = ({
  data,
  spTotal,
  formatNumber,
  selectedTenderId,
}) => {
  const { theme: currentTheme } = useTheme();
  const [selectedIndicator, setSelectedIndicator] = useState<number | null>(null);
  const [breakdownData, setBreakdownData] = useState<CategoryBreakdown[]>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [drillDownPath, setDrillDownPath] = useState<DrillDownLevel[]>([{ type: 'root' }]);

  const [referenceInfo, setReferenceInfo] = useState<{
    monolithPerM3: number;
    visPerM2: number;
    facadePerM2: number;
  }>({
    monolithPerM3: 0,
    visPerM2: 0,
    facadePerM2: 0,
  });

  const currentLevel = drillDownPath[drillDownPath.length - 1];

  // Pie chart data
  const pieChartData = useMemo((): PieDataItem[] => {
    if (data.length === 0) return [];

    if (currentLevel.type === 'root') {
      const baseData = data.filter(d =>
        !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 14
      );
      const directCosts = baseData
        .filter(d => d.row_number >= 2 && d.row_number <= 6)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);
      const markups = baseData
        .filter(d => d.row_number >= 7 && d.row_number <= 14)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);

      return [
        { label: 'Прямые затраты', value: directCosts, color: '#1890ff' },
        { label: 'Наценки', value: markups, color: '#52c41a' },
      ].sort((a, b) => b.value - a.value);
    }

    if (currentLevel.type === 'direct_costs') {
      const directCostsData = data.filter(d =>
        !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6
      );
      const colors = ['#ff4d4f', '#1890ff', '#52c41a', '#faad14', '#722ed1'];
      return directCostsData.map((d, idx) => ({
        label: d.indicator_name,
        value: d.total_cost || 0,
        color: colors[idx] || '#1890ff',
      })).sort((a, b) => b.value - a.value);
    }

    if (currentLevel.type === 'markups') {
      const markupsData = data.filter(d =>
        !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14
      );
      const profitRow = markupsData.find(d => d.row_number === 13);
      const profitSubRow = markupsData.find(d => d.row_number === 14);
      const combinedProfit = profitRow && profitSubRow ? {
        ...profitRow,
        indicator_name: 'Прибыль',
        total_cost: (profitRow.total_cost || 0) + (profitSubRow.total_cost || 0),
        row_number: 13,
      } : profitRow;

      const oozRow = markupsData.find(d => d.row_number === 10);
      const oozSubRow = markupsData.find(d => d.row_number === 11);
      const combinedOOZ = oozRow && oozSubRow ? {
        ...oozRow,
        indicator_name: 'ООЗ',
        total_cost: (oozRow.total_cost || 0) + (oozSubRow.total_cost || 0),
        row_number: 10,
      } : oozRow;

      const filteredMarkups = markupsData
        .filter(d => d.row_number !== 14 && d.row_number !== 11)
        .map(d => {
          if (d.row_number === 13) return combinedProfit;
          if (d.row_number === 10) return combinedOOZ;
          return d;
        })
        .filter(Boolean);

      const colors = ['#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#faad14', '#1890ff'];
      return filteredMarkups.map((d, idx) => ({
        label: d!.indicator_name,
        value: d!.total_cost || 0,
        color: colors[idx] || '#1890ff',
      })).sort((a, b) => b.value - a.value);
    }

    if (currentLevel.type === 'profit_breakdown') {
      const profitRow = data.find(d => d.row_number === 13);
      const profitSubRow = data.find(d => d.row_number === 14);
      if (profitRow && profitSubRow) {
        return [
          { label: 'Прибыль', value: profitRow.total_cost || 0, color: '#1890ff' },
          { label: 'Прибыль субподряд', value: profitSubRow.total_cost || 0, color: '#40a9ff' },
        ].sort((a, b) => b.value - a.value);
      }
    }

    if (currentLevel.type === 'ooz_breakdown') {
      const oozRow = data.find(d => d.row_number === 10);
      const oozSubRow = data.find(d => d.row_number === 11);
      if (oozRow && oozSubRow) {
        return [
          { label: 'ООЗ', value: oozRow.total_cost || 0, color: '#52c41a' },
          { label: 'ООЗ Субподряд', value: oozSubRow.total_cost || 0, color: '#95de64' },
        ].sort((a, b) => b.value - a.value);
      }
    }

    if (currentLevel.type === 'cost_growth_breakdown') {
      const costGrowthRow = data.find(d => d.row_number === 8);
      if (costGrowthRow) {
        return [
          { label: 'Рост работ СУ-10', value: costGrowthRow.works_su10_growth || 0, color: '#fa8c16' },
          { label: 'Рост материалов СУ-10', value: costGrowthRow.materials_su10_growth || 0, color: '#faad14' },
          { label: 'Рост субподрядных работ', value: costGrowthRow.works_sub_growth || 0, color: '#ff7a45' },
          { label: 'Рост субподрядных материалов', value: costGrowthRow.materials_sub_growth || 0, color: '#ffa940' },
        ].sort((a, b) => b.value - a.value);
      }
    }

    if (currentLevel.type === 'indicator' && breakdownData.length > 0) {
      const colors = [
        '#ff4d4f', '#1890ff', '#52c41a', '#faad14', '#722ed1',
        '#13c2c2', '#fa8c16', '#eb2f96', '#95de64', '#40a9ff',
        '#f759ab', '#fadb14', '#a0d911', '#36cfc9', '#597ef7',
      ];
      return breakdownData.map((item, idx) => ({
        label: item.category_name,
        value: item.total_amount,
        color: colors[idx % colors.length],
      }));
    }

    return [];
  }, [data, currentLevel, breakdownData]);

  // Bar chart data
  const barChartData = useMemo((): BarDataItem[] => {
    if (data.length === 0 || !selectedTenderId) return [];
    const totalAreaM2 = spTotal;

    let barItems: { label: string; cost: number; color: string }[] = [];

    if (currentLevel.type === 'root') {
      const directCosts = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);
      const markups = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);
      barItems = [
        { label: 'Прямые затраты', cost: directCosts, color: 'rgba(24, 144, 255, 0.6)' },
        { label: 'Наценки', cost: markups, color: 'rgba(82, 196, 26, 0.6)' },
      ].sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'direct_costs') {
      const directCostsData = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6);
      const colors = [
        'rgba(255, 77, 79, 0.6)', 'rgba(24, 144, 255, 0.6)', 'rgba(82, 196, 26, 0.6)',
        'rgba(250, 173, 20, 0.6)', 'rgba(114, 46, 209, 0.6)',
      ];
      barItems = directCostsData.map((d, idx) => ({
        label: d.indicator_name,
        cost: d.total_cost || 0,
        color: colors[idx] || 'rgba(24, 144, 255, 0.6)',
      })).sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'markups') {
      const markupsData = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14);
      const profitRow = markupsData.find(d => d.row_number === 13);
      const profitSubRow = markupsData.find(d => d.row_number === 14);
      const combinedProfit = profitRow && profitSubRow ? {
        ...profitRow, indicator_name: 'Прибыль',
        total_cost: (profitRow.total_cost || 0) + (profitSubRow.total_cost || 0),
      } : profitRow;

      const oozRow = markupsData.find(d => d.row_number === 10);
      const oozSubRow = markupsData.find(d => d.row_number === 11);
      const combinedOOZ = oozRow && oozSubRow ? {
        ...oozRow, indicator_name: 'ООЗ',
        total_cost: (oozRow.total_cost || 0) + (oozSubRow.total_cost || 0),
      } : oozRow;

      const filteredMarkups = markupsData
        .filter(d => d.row_number !== 14 && d.row_number !== 11)
        .map(d => {
          if (d.row_number === 13) return combinedProfit;
          if (d.row_number === 10) return combinedOOZ;
          return d;
        })
        .filter(Boolean);

      const colors = [
        'rgba(19, 194, 194, 0.6)', 'rgba(250, 140, 22, 0.6)', 'rgba(235, 47, 150, 0.6)',
        'rgba(82, 196, 26, 0.6)', 'rgba(250, 173, 20, 0.6)', 'rgba(24, 144, 255, 0.6)',
      ];
      barItems = filteredMarkups.map((d, idx) => ({
        label: d!.indicator_name,
        cost: d!.total_cost || 0,
        color: colors[idx] || 'rgba(24, 144, 255, 0.6)',
      })).sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'indicator' && breakdownData.length > 0) {
      const categoryMap = new Map<string, number>();
      breakdownData.forEach(item => {
        const current = categoryMap.get(item.category_name) || 0;
        categoryMap.set(item.category_name, current + item.total_amount);
      });
      const colors = [
        'rgba(255, 77, 79, 0.6)', 'rgba(24, 144, 255, 0.6)', 'rgba(82, 196, 26, 0.6)',
        'rgba(250, 173, 20, 0.6)', 'rgba(114, 46, 209, 0.6)', 'rgba(19, 194, 194, 0.6)',
        'rgba(250, 140, 22, 0.6)', 'rgba(235, 47, 150, 0.6)', 'rgba(149, 222, 100, 0.6)',
      ];
      barItems = Array.from(categoryMap.entries()).map(([categoryName, totalCost], idx) => ({
        label: categoryName,
        cost: totalCost,
        color: colors[idx % colors.length],
      })).sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'indicator' && selectedIndicator) {
      const indicator = data.find(d => d.row_number === selectedIndicator);
      if (indicator) {
        barItems = [{ label: indicator.indicator_name, cost: indicator.total_cost || 0, color: 'rgba(24, 144, 255, 0.6)' }];
      }
    } else if (currentLevel.type === 'profit_breakdown') {
      const profitItems = data.filter(d => d.row_number === 13 || d.row_number === 14);
      barItems = profitItems.map((d, idx) => ({
        label: d.indicator_name,
        cost: d.total_cost || 0,
        color: idx === 0 ? 'rgba(24, 144, 255, 0.6)' : 'rgba(64, 169, 255, 0.6)',
      })).sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'ooz_breakdown') {
      const oozItems = data.filter(d => d.row_number === 10 || d.row_number === 11);
      barItems = oozItems.map((d, idx) => ({
        label: d.indicator_name,
        cost: d.total_cost || 0,
        color: idx === 0 ? 'rgba(82, 196, 26, 0.6)' : 'rgba(149, 222, 100, 0.6)',
      })).sort((a, b) => b.cost - a.cost);
    } else if (currentLevel.type === 'cost_growth_breakdown') {
      const costGrowthRow = data.find(d => d.row_number === 8);
      if (costGrowthRow) {
        barItems = [
          { label: 'Рост работ СУ-10', cost: costGrowthRow.works_su10_growth || 0, color: 'rgba(250, 140, 22, 0.6)' },
          { label: 'Рост материалов СУ-10', cost: costGrowthRow.materials_su10_growth || 0, color: 'rgba(250, 173, 20, 0.6)' },
          { label: 'Рост субподрядных работ', cost: costGrowthRow.works_sub_growth || 0, color: 'rgba(255, 122, 69, 0.6)' },
          { label: 'Рост субподрядных материалов', cost: costGrowthRow.materials_sub_growth || 0, color: 'rgba(255, 169, 64, 0.6)' },
        ].sort((a, b) => b.cost - a.cost);
      }
    }

    return barItems.map(item => ({
      label: item.label,
      pricePerM2: totalAreaM2 > 0 ? Math.round(item.cost / totalAreaM2) : 0,
      color: item.color,
    }));
  }, [data, currentLevel, breakdownData, selectedIndicator, selectedTenderId, spTotal]);

  const hasDetailedBreakdown = (rowNumber: number): boolean => {
    return rowNumber === 2 || rowNumber === 3;
  };

  const fetchCategoryBreakdown = async (rowNumber: number) => {
    if (!selectedTenderId) return;
    setLoadingBreakdown(true);
    try {
      if (!hasDetailedBreakdown(rowNumber)) {
        setBreakdownData([]);
        setLoadingBreakdown(false);
        return;
      }

      let boqItemTypes: string[] = [];
      switch (rowNumber) {
        case 2: boqItemTypes = ['суб-раб', 'суб-мат']; break;
        case 3: boqItemTypes = ['раб', 'мат']; break;
        default: boqItemTypes = [];
      }

      const { data: boqItems, error } = await supabase
        .from('boq_items')
        .select(`
          boq_item_type, total_amount,
          detail_cost_category:detail_cost_categories(id, name, location, cost_category:cost_categories(id, name)),
          client_position:client_positions!inner(tender_id)
        `)
        .eq('client_position.tender_id', selectedTenderId)
        .in('boq_item_type', boqItemTypes);

      if (error) throw error;
      if (!boqItems || boqItems.length === 0) {
        setBreakdownData([]);
        return;
      }

      const categoryMap = new Map<string, CategoryBreakdown>();
      boqItems.forEach(item => {
        const detailCategory = Array.isArray(item.detail_cost_category) ? item.detail_cost_category[0] : item.detail_cost_category;
        const costCategory = detailCategory?.cost_category;
        const categoryObj = Array.isArray(costCategory) ? costCategory[0] : costCategory;
        const categoryName = categoryObj?.name || 'Без категории';
        const detailName = detailCategory?.name || 'Без вида';
        const locationName = detailCategory?.location || 'Без локализации';
        const amount = item.total_amount || 0;
        const isWork = item.boq_item_type === 'раб' || item.boq_item_type === 'суб-раб' || item.boq_item_type === 'раб-комп.';
        const key = `${categoryName}|${detailName}|${locationName}`;

        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category_name: categoryName,
            detail_name: detailName,
            location_name: locationName,
            total_amount: 0,
            works_amount: 0,
            materials_amount: 0,
          });
        }
        const cat = categoryMap.get(key)!;
        cat.total_amount += amount;
        if (isWork) cat.works_amount += amount;
        else cat.materials_amount += amount;
      });

      setBreakdownData(Array.from(categoryMap.values()).sort((a, b) => b.total_amount - a.total_amount));
    } catch (error) {
      console.error('Ошибка загрузки детализации:', error);
      setBreakdownData([]);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const fetchReferenceInfo = async () => {
    if (!selectedTenderId) return;
    try {
      const { data: boqItems, error } = await supabase
        .from('boq_items')
        .select(`
          boq_item_type, quantity, total_amount,
          detail_cost_category:detail_cost_categories(id, name, cost_category:cost_categories(id, name)),
          client_position:client_positions!inner(tender_id)
        `)
        .eq('client_position.tender_id', selectedTenderId);

      if (error) throw error;
      if (!boqItems || boqItems.length === 0) return;

      let monolithVolume = 0, monolithCost = 0;
      let visVolume = 0, visCost = 0;
      let facadeVolume = 0, facadeCost = 0;

      boqItems.forEach(item => {
        const detailCategory = Array.isArray(item.detail_cost_category) ? item.detail_cost_category[0] : item.detail_cost_category;
        const costCategory = detailCategory?.cost_category;
        const categoryObj = Array.isArray(costCategory) ? costCategory[0] : costCategory;
        const categoryName = categoryObj?.name || '';
        const quantity = item.quantity || 0;
        const totalAmount = item.total_amount || 0;

        if (categoryName === 'МОНОЛИТ') {
          monolithVolume += quantity;
          monolithCost += totalAmount;
        } else if (
          categoryName === 'ВИС / Электрические системы' ||
          categoryName === 'ВИС / Механические системы' ||
          categoryName === 'ВИС / Слаботочные системы'
        ) {
          visVolume += quantity;
          visCost += totalAmount;
        } else if (categoryName === 'ФАСАДНЫЕ РАБОТЫ') {
          facadeVolume += quantity;
          facadeCost += totalAmount;
        }
      });

      setReferenceInfo({
        monolithPerM3: monolithVolume > 0 ? monolithCost / monolithVolume : 0,
        visPerM2: visVolume > 0 ? visCost / visVolume : 0,
        facadePerM2: facadeVolume > 0 ? facadeCost / facadeVolume : 0,
      });
    } catch (error) {
      console.error('Ошибка загрузки справочной информации:', error);
    }
  };

  const handlePieClick = async (label: string, index: number) => {
    if (currentLevel.type === 'root') {
      if (label === 'Прямые затраты') {
        setDrillDownPath([...drillDownPath, { type: 'direct_costs', indicatorName: 'Прямые затраты' }]);
      } else if (label === 'Наценки') {
        setDrillDownPath([...drillDownPath, { type: 'markups', indicatorName: 'Наценки' }]);
      }
      return;
    }

    if (currentLevel.type === 'direct_costs') {
      const directCostsData = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6)
        .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
      const clickedRow = directCostsData[index];
      if (clickedRow) {
        setSelectedIndicator(clickedRow.row_number);
        setLoadingBreakdown(true);
        await fetchCategoryBreakdown(clickedRow.row_number);
        setDrillDownPath([...drillDownPath, { type: 'indicator', indicatorName: clickedRow.indicator_name, rowNumber: clickedRow.row_number }]);
      }
      return;
    }

    if (currentLevel.type === 'markups') {
      const markupsData = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14);
      const profitRow = markupsData.find(d => d.row_number === 13);
      const profitSubRow = markupsData.find(d => d.row_number === 14);
      const combinedProfit = profitRow && profitSubRow ? { ...profitRow, indicator_name: 'Прибыль', total_cost: (profitRow.total_cost || 0) + (profitSubRow.total_cost || 0), row_number: 13 } : profitRow;
      const oozRow = markupsData.find(d => d.row_number === 10);
      const oozSubRow = markupsData.find(d => d.row_number === 11);
      const combinedOOZ = oozRow && oozSubRow ? { ...oozRow, indicator_name: 'ООЗ', total_cost: (oozRow.total_cost || 0) + (oozSubRow.total_cost || 0), row_number: 10 } : oozRow;

      const filteredMarkups = markupsData
        .filter(d => d.row_number !== 14 && d.row_number !== 11)
        .map(d => { if (d.row_number === 13) return combinedProfit; if (d.row_number === 10) return combinedOOZ; return d; })
        .filter(Boolean)
        .sort((a, b) => (b!.total_cost || 0) - (a!.total_cost || 0));

      const clickedRow = filteredMarkups[index];
      if (clickedRow) {
        if (clickedRow.row_number === 13) {
          setDrillDownPath([...drillDownPath, { type: 'profit_breakdown', indicatorName: 'Прибыль', rowNumber: 13 }]);
        } else if (clickedRow.row_number === 10) {
          setDrillDownPath([...drillDownPath, { type: 'ooz_breakdown', indicatorName: 'ООЗ', rowNumber: 10 }]);
        } else if (clickedRow.row_number === 8) {
          setDrillDownPath([...drillDownPath, { type: 'cost_growth_breakdown', indicatorName: 'Рост стоимости', rowNumber: 8 }]);
        } else {
          setSelectedIndicator(clickedRow.row_number);
          setLoadingBreakdown(true);
          await fetchCategoryBreakdown(clickedRow.row_number);
          setDrillDownPath([...drillDownPath, { type: 'indicator', indicatorName: clickedRow.indicator_name, rowNumber: clickedRow.row_number }]);
        }
      }
    }
  };

  const handleBarClick = async (label: string) => {
    if (currentLevel.type === 'root') {
      if (label === 'Прямые затраты') setDrillDownPath([...drillDownPath, { type: 'direct_costs' }]);
      else if (label === 'Наценки') setDrillDownPath([...drillDownPath, { type: 'markups' }]);
    }
  };

  const handleDrillUp = () => {
    if (drillDownPath.length > 1) {
      const newPath = drillDownPath.slice(0, -1);
      setDrillDownPath(newPath);
      if (newPath.length === 1) {
        setSelectedIndicator(null);
        setBreakdownData([]);
      }
    }
  };

  useEffect(() => {
    setSelectedIndicator(null);
    setBreakdownData([]);
    setDrillDownPath([{ type: 'root' }]);
    fetchReferenceInfo();
  }, [selectedTenderId]);

  useEffect(() => {
    if (currentLevel.type !== 'indicator') {
      setSelectedIndicator(null);
      setBreakdownData([]);
    }
  }, [drillDownPath]);

  const getSummaryTableData = () => {
    const totalAreaM2 = spTotal;

    if (currentLevel.type === 'root') {
      const directCosts = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);
      const markups = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14)
        .reduce((sum, d) => sum + (d.total_cost || 0), 0);
      return [
        { key: 0, indicator_name: 'Прямые затраты', amount: directCosts, price_per_m2: totalAreaM2 > 0 ? directCosts / totalAreaM2 : 0 },
        { key: 1, indicator_name: 'Наценки', amount: markups, price_per_m2: totalAreaM2 > 0 ? markups / totalAreaM2 : 0 },
      ].sort((a, b) => b.amount - a.amount);
    } else if (currentLevel.type === 'direct_costs') {
      return data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6)
        .map((d, idx) => ({ key: idx, indicator_name: d.indicator_name, amount: d.total_cost || 0, price_per_m2: totalAreaM2 > 0 ? (d.total_cost || 0) / totalAreaM2 : 0 }))
        .sort((a, b) => b.amount - a.amount);
    } else if (currentLevel.type === 'markups') {
      const markupsData = data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14);
      const profitRow = markupsData.find(d => d.row_number === 13);
      const profitSubRow = markupsData.find(d => d.row_number === 14);
      const combinedProfit = profitRow && profitSubRow ? { ...profitRow, indicator_name: 'Прибыль', total_cost: (profitRow.total_cost || 0) + (profitSubRow.total_cost || 0) } : profitRow;
      const oozRow = markupsData.find(d => d.row_number === 10);
      const oozSubRow = markupsData.find(d => d.row_number === 11);
      const combinedOOZ = oozRow && oozSubRow ? { ...oozRow, indicator_name: 'ООЗ', total_cost: (oozRow.total_cost || 0) + (oozSubRow.total_cost || 0) } : oozRow;

      const filteredMarkups = markupsData
        .filter(d => d.row_number !== 14 && d.row_number !== 11)
        .map(d => { if (d.row_number === 13) return combinedProfit; if (d.row_number === 10) return combinedOOZ; return d; })
        .filter(Boolean);

      return filteredMarkups.map((d, idx) => ({ key: idx, indicator_name: d!.indicator_name, amount: d!.total_cost || 0, price_per_m2: totalAreaM2 > 0 ? (d!.total_cost || 0) / totalAreaM2 : 0 })).sort((a, b) => b.amount - a.amount);
    } else if (currentLevel.type === 'profit_breakdown') {
      return data.filter(d => d.row_number === 13 || d.row_number === 14)
        .map((d, idx) => ({ key: idx, indicator_name: d.indicator_name, amount: d.total_cost || 0, price_per_m2: totalAreaM2 > 0 ? (d.total_cost || 0) / totalAreaM2 : 0 }))
        .sort((a, b) => b.amount - a.amount);
    } else if (currentLevel.type === 'ooz_breakdown') {
      return data.filter(d => d.row_number === 10 || d.row_number === 11)
        .map((d, idx) => ({ key: idx, indicator_name: d.indicator_name, amount: d.total_cost || 0, price_per_m2: totalAreaM2 > 0 ? (d.total_cost || 0) / totalAreaM2 : 0 }))
        .sort((a, b) => b.amount - a.amount);
    } else if (currentLevel.type === 'cost_growth_breakdown') {
      const costGrowthRow = data.find(d => d.row_number === 8);
      if (costGrowthRow) {
        const items = [
          { key: 0, indicator_name: 'Рост работ СУ-10', amount: costGrowthRow.works_su10_growth || 0 },
          { key: 1, indicator_name: 'Рост материалов СУ-10', amount: costGrowthRow.materials_su10_growth || 0 },
          { key: 2, indicator_name: 'Рост субподрядных работ', amount: costGrowthRow.works_sub_growth || 0 },
          { key: 3, indicator_name: 'Рост субподрядных материалов', amount: costGrowthRow.materials_sub_growth || 0 },
        ];
        return items.map(i => ({ ...i, price_per_m2: totalAreaM2 > 0 ? i.amount / totalAreaM2 : 0 })).sort((a, b) => b.amount - a.amount);
      }
    }
    return [];
  };

  const breakdownColumns = [
    { title: '№', dataIndex: 'key', key: 'key', width: 50, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: 'Категория затрат', dataIndex: 'category_name', key: 'category_name', width: 200 },
    { title: 'Вид затрат', dataIndex: 'detail_name', key: 'detail_name', width: 200 },
    { title: 'Локализация', dataIndex: 'location_name', key: 'location_name', width: 150 },
    { title: 'Работы (руб.)', dataIndex: 'works_amount', key: 'works_amount', width: 150, align: 'right' as const, render: (val: number) => formatNumber(val) },
    { title: 'Материалы (руб.)', dataIndex: 'materials_amount', key: 'materials_amount', width: 150, align: 'right' as const, render: (val: number) => formatNumber(val) },
    { title: 'Итого (руб.)', dataIndex: 'total_amount', key: 'total_amount', width: 150, align: 'right' as const, render: (val: number) => <Text strong>{formatNumber(val)}</Text> },
  ];

  const summaryTableColumns = [
    { title: '№', dataIndex: 'key', key: 'key', width: 50, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: 'Показатель', dataIndex: 'indicator_name', key: 'indicator_name', width: 300 },
    { title: 'Сумма (руб.)', dataIndex: 'amount', key: 'amount', width: 150, align: 'right' as const, render: (val: number) => <Text strong>{formatNumber(val)}</Text> },
    { title: 'Цена за м² (руб./м²)', dataIndex: 'price_per_m2', key: 'price_per_m2', width: 150, align: 'right' as const, render: (val: number) => <Text>{formatNumber(Math.round(val))}</Text> },
  ];

  const selectedIndicatorName = selectedIndicator ? data.find(d => d.row_number === selectedIndicator)?.indicator_name : null;

  const pieConfig = {
    data: pieChartData,
    angleField: 'value',
    colorField: 'label',
    color: pieChartData.map(d => d.color),
    radius: 0.9,
    innerRadius: 0.6,
    label: { text: 'label', position: 'outside' as const, style: { fontSize: 11 } },
    legend: {
      color: { position: 'right' as const, itemLabelFill: currentTheme === 'dark' ? '#ffffff' : '#000000' },
    },
    tooltip: {
      title: 'label',
      items: [{ channel: 'y', name: 'Сумма', valueFormatter: (v: number) => `${v.toLocaleString('ru-RU')} руб.` }],
    },
    state: { active: { style: { stroke: '#fff', lineWidth: 2 } } },
    interaction: { elementHighlight: true },
    onReady: (plot: { chart: { on: (event: string, callback: (e: { data: { data: PieDataItem } }) => void) => void } }) => {
      plot.chart.on('element:click', (e: { data: { data: PieDataItem } }) => {
        const clickedData = e.data?.data;
        if (clickedData) {
          const idx = pieChartData.findIndex(d => d.label === clickedData.label);
          handlePieClick(clickedData.label, idx);
        }
      });
    },
  };

  const columnConfig = {
    data: barChartData,
    xField: 'label',
    yField: 'pricePerM2',
    color: barChartData.map(d => d.color),
    columnStyle: { radius: [4, 4, 0, 0] },
    label: { text: (d: BarDataItem) => `${d.pricePerM2.toLocaleString('ru-RU')}`, position: 'top' as const, style: { fill: currentTheme === 'dark' ? '#fff' : '#000' } },
    axis: {
      x: { labelAutoRotate: false, style: { labelFill: currentTheme === 'dark' ? '#ffffff85' : '#00000073' } },
      y: { labelFormatter: (v: number) => v.toLocaleString('ru-RU'), style: { labelFill: currentTheme === 'dark' ? '#ffffff85' : '#00000073' } },
    },
    tooltip: { title: 'label', items: [{ channel: 'y', name: 'Цена за м²', valueFormatter: (v: number) => `${v.toLocaleString('ru-RU')} руб./м²` }] },
    onReady: (plot: { chart: { on: (event: string, callback: (e: { data: { data: BarDataItem } }) => void) => void } }) => {
      plot.chart.on('element:click', (e: { data: { data: BarDataItem } }) => {
        const clickedData = e.data?.data;
        if (clickedData) handleBarClick(clickedData.label);
      });
    },
  };

  const getCurrentTotal = () => {
    if (drillDownPath.length === 1) return data.find(d => d.is_total)?.total_cost;
    if (currentLevel.type === 'direct_costs') return data.filter(d => !d.is_header && !d.is_total && d.row_number >= 2 && d.row_number <= 6).reduce((sum, d) => sum + (d.total_cost || 0), 0);
    if (currentLevel.type === 'markups') return data.filter(d => !d.is_header && !d.is_total && d.row_number >= 7 && d.row_number <= 14).reduce((sum, d) => sum + (d.total_cost || 0), 0);
    if (currentLevel.type === 'indicator' && selectedIndicator) return data.find(d => d.row_number === selectedIndicator)?.total_cost;
    if (currentLevel.type === 'profit_breakdown') return data.filter(d => d.row_number === 13 || d.row_number === 14).reduce((sum, d) => sum + (d.total_cost || 0), 0);
    return data.find(d => d.is_total)?.total_cost;
  };

  const getCurrentPricePerM2 = () => {
    const totalAreaM2 = spTotal;
    const currentCost = getCurrentTotal() || 0;
    return totalAreaM2 > 0 ? Math.round(currentCost / totalAreaM2) : 0;
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card bordered style={{ height: 450, background: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Title level={5} style={{ margin: 0, color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>Структура Цены</Title>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {data.length > 0 && (
                    <Text strong style={{ fontSize: 16, color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>
                      {formatNumber(getCurrentTotal())} Руб.
                    </Text>
                  )}
                  {drillDownPath.length > 1 && (
                    <Button size="small" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }} onClick={handleDrillUp}>← Назад</Button>
                  )}
                </div>
              </div>

              {drillDownPath.length > 1 && (
                <div style={{ marginBottom: 8 }}>
                  {drillDownPath.map((level, idx) => (
                    <span key={idx}>
                      {idx > 0 && <Text type="secondary"> → </Text>}
                      <Text
                        type={idx === drillDownPath.length - 1 ? undefined : 'secondary'}
                        style={{
                          cursor: idx < drillDownPath.length - 1 ? 'pointer' : 'default',
                          fontWeight: idx === drillDownPath.length - 1 ? 600 : 400,
                          color: idx === drillDownPath.length - 1 ? '#1890ff' : undefined,
                        }}
                        onClick={() => {
                          if (idx < drillDownPath.length - 1) {
                            setDrillDownPath(drillDownPath.slice(0, idx + 1));
                            if (idx === 0) { setSelectedIndicator(null); setBreakdownData([]); }
                          }
                        }}
                      >
                        {level.type === 'root' ? 'Все показатели' : level.type === 'direct_costs' ? 'Прямые затраты' : level.type === 'markups' ? 'Наценки' : level.type === 'profit_breakdown' ? 'Детализация прибыли' : level.indicatorName || 'Детализация'}
                      </Text>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {drillDownPath.length === 1 ? 'Кликните для детализации' : currentLevel.type === 'indicator' ? 'Детализация по категориям затрат' : 'Детализация по показателям'}
                </Text>
              </div>
            </div>
            <Spin spinning={loadingBreakdown}>
              {pieChartData.length > 0 ? (
                <div style={{ height: 320 }}>
                  <Pie {...pieConfig} />
                </div>
              ) : drillDownPath.length > 1 ? (
                <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 16, marginBottom: 12 }}>📊 Детализация недоступна</Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>Для показателя "{currentLevel.indicatorName}"</Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>детализация по категориям затрат не предусмотрена</Text>
                  <Button type="primary" onClick={handleDrillUp} style={{ marginTop: 16 }}>Вернуться к общему обзору</Button>
                </div>
              ) : null}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card bordered style={{ height: 450, background: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0, color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>Стоимость за м²</Title>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {data.length > 0 && (
                    <Text strong style={{ fontSize: 16, color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>
                      {formatNumber(getCurrentPricePerM2())} Руб./м²
                    </Text>
                  )}
                  {drillDownPath.length > 1 && (
                    <Button size="small" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }} onClick={handleDrillUp}>← Назад</Button>
                  )}
                </div>
              </div>
            </div>
            {barChartData.length > 0 && (
              <div style={{ height: 350 }}>
                <Column {...columnConfig} />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {selectedIndicator && (selectedIndicator === 2 || selectedIndicator === 3) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card bordered style={{ background: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>Детализация по категориям затрат</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{selectedIndicatorName}</Text>
              </div>
              <Spin spinning={loadingBreakdown}>
                <Table
                  dataSource={breakdownData}
                  columns={breakdownColumns}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 1200 }}
                  summary={(tableData: readonly CategoryBreakdown[]) => {
                    const totalWorks = tableData.reduce((sum, item) => sum + item.works_amount, 0);
                    const totalMaterials = tableData.reduce((sum, item) => sum + item.materials_amount, 0);
                    const total = tableData.reduce((sum, item) => sum + item.total_amount, 0);
                    return (
                      <Table.Summary.Row style={{ background: currentTheme === 'dark' ? '#262626' : '#fafafa' }}>
                        <Table.Summary.Cell index={0} colSpan={4}><Text strong>ИТОГО:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text strong>{formatNumber(totalWorks)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><Text strong>{formatNumber(totalMaterials)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: '#1890ff' }}>{formatNumber(total)}</Text></Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </Spin>
            </Card>
          </Col>
        </Row>
      )}

      {!(selectedIndicator && (selectedIndicator === 2 || selectedIndicator === 3)) && (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card bordered style={{ background: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>Краткая сводка</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {drillDownPath.length === 1 ? 'Общая структура затрат' : currentLevel.type === 'direct_costs' ? 'Состав прямых затрат' : currentLevel.type === 'markups' ? 'Состав наценок' : currentLevel.type === 'profit_breakdown' ? 'Детализация прибыли' : currentLevel.type === 'ooz_breakdown' ? 'Детализация ООЗ' : currentLevel.type === 'cost_growth_breakdown' ? 'Детализация роста стоимости' : currentLevel.indicatorName || 'Детализация'}
                </Text>
              </div>
              <Table
                dataSource={getSummaryTableData()}
                columns={summaryTableColumns}
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 650 }}
                summary={(pageData: readonly SummaryTableItem[]) => {
                  const totalAmount = pageData.reduce((sum, item) => sum + item.amount, 0);
                  const avgPricePerM2 = spTotal > 0 ? totalAmount / spTotal : 0;
                  return (
                    <Table.Summary.Row style={{ background: currentTheme === 'dark' ? '#262626' : '#fafafa' }}>
                      <Table.Summary.Cell index={0} colSpan={2}><Text strong>ИТОГО:</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: '#1890ff' }}>{formatNumber(totalAmount)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><Text strong>{formatNumber(Math.round(avgPricePerM2))}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card bordered style={{ background: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff' }}>
            <Title level={5} style={{ marginBottom: 16 }}>Справочная информация</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>1. Стоимость монолита за м³</Text>
                <Text strong style={{ fontSize: 16 }}>{formatNumber(Math.round(referenceInfo.monolithPerM3))} руб/м³</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>2. Стоимость ВИСов за м²</Text>
                <Text strong style={{ fontSize: 16 }}>{formatNumber(Math.round(referenceInfo.visPerM2))} руб/м²</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>3. Стоимость Фасадов за м²</Text>
                <Text strong style={{ fontSize: 16 }}>{formatNumber(Math.round(referenceInfo.facadePerM2))} руб/м²</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
