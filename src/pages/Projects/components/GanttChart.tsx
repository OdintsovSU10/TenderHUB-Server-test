import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Typography, Empty, Tooltip, Progress, Modal } from 'antd';
import { Area } from '@ant-design/charts';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ProjectFull, ProjectCompletion } from '../../../lib/supabase/types';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('ru');

const { Text } = Typography;

interface GanttChartProps {
  projects: ProjectFull[];
  completionData: ProjectCompletion[];
}

interface MonthData {
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  isCurrent: boolean;
  isPast: boolean;
}

const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#722ed1',
  '#eb2f96', '#13c2c2', '#fa541c', '#2f54eb',
];

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    if (billions % 1 === 0) {
      return `${billions.toFixed(0)} млрд`;
    }
    return `${billions.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} млрд`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    if (millions % 1 === 0) {
      return `${millions.toFixed(0)} млн`;
    }
    return `${millions.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} млн`;
  }
  return value.toLocaleString('ru-RU');
};

const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export const GanttChart: React.FC<GanttChartProps> = ({ projects, completionData }) => {
  const { theme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [chartModalProject, setChartModalProject] = useState<{ project: ProjectFull; colorIndex: number } | null>(null);
  const [summaryChartOpen, setSummaryChartOpen] = useState(false);

  // Generate months timeline - from earliest project date to current + 4 years
  const { months, monthWidth } = useMemo(() => {
    if (projects.length === 0) return { months: [], monthWidth: 80 };

    const now = dayjs();

    // Find earliest project start date
    let minDate = now.startOf('month');
    projects.forEach((p) => {
      if (p.contract_date) {
        const start = dayjs(p.contract_date).startOf('month');
        if (start.isBefore(minDate)) {
          minDate = start;
        }
      }
    });

    // Also check completion data for earlier dates
    completionData.forEach((c) => {
      const completionDate = dayjs(`${c.year}-${c.month}-01`);
      if (completionDate.isBefore(minDate)) {
        minDate = completionDate.startOf('month');
      }
    });

    // End date is current + 4 years
    const maxDate = now.add(4, 'year').endOf('month');

    const monthsList: MonthData[] = [];
    let current = minDate;

    while (current.isBefore(maxDate) || current.isSame(maxDate, 'month')) {
      const year = current.year();
      const month = current.month();

      monthsList.push({
        year,
        month: month + 1,
        label: `${MONTH_NAMES_SHORT[month]} ${year}`,
        shortLabel: MONTH_NAMES_SHORT[month],
        isCurrent: current.isSame(now, 'month'),
        isPast: current.isBefore(now, 'month'),
      });

      current = current.add(1, 'month');
    }

    return { months: monthsList, monthWidth: 80 };
  }, [projects, completionData]);

  // Calculate totals across all projects
  const totals = useMemo(() => {
    const totalContract = projects.reduce((sum, p) => sum + p.final_contract_cost, 0);
    const totalCompletion = projects.reduce((sum, p) => sum + p.total_completion, 0);
    const totalRemaining = totalContract - totalCompletion;
    const completionPercent = totalContract > 0 ? (totalCompletion / totalContract) * 100 : 0;
    return { totalContract, totalCompletion, totalRemaining, completionPercent };
  }, [projects]);

  // Calculate monthly totals (sum across all projects per month)
  const monthlyTotals = useMemo(() => {
    const totalsMap: Record<string, number> = {};

    months.forEach((month) => {
      const key = `${month.year}-${month.month}`;
      const monthTotal = completionData
        .filter((c) => c.year === month.year && c.month === month.month)
        .reduce((sum, c) => sum + c.actual_amount, 0);
      totalsMap[key] = monthTotal;
    });

    return totalsMap;
  }, [months, completionData]);

  // Scroll to current month on mount
  useEffect(() => {
    if (scrollRef.current && months.length > 0) {
      const currentIndex = months.findIndex((m) => m.isCurrent);
      if (currentIndex > 2) {
        scrollRef.current.scrollLeft = (currentIndex - 2) * monthWidth;
      }
    }
  }, [months, monthWidth]);

  // Get completion data for a project/month
  const getCompletionForMonth = (projectId: string, year: number, month: number) => {
    return completionData.find(
      (c) => c.project_id === projectId && c.year === year && c.month === month
    );
  };

  // Generate mini chart data for a project (Area format - objects)
  const getProjectMiniChartData = (project: ProjectFull): { idx: number; value: number }[] | null => {
    const projectCompletion = completionData.filter((c) => c.project_id === project.id && c.actual_amount > 0);

    if (projectCompletion.length === 0) {
      return null;
    }

    // Sort by date
    const sorted = [...projectCompletion].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return sorted.map((c, idx) => ({ idx, value: c.actual_amount / 1_000_000 }));
  };

  // Generate full chart data for modal (Area chart format)
  const getFullProjectChartData = (project: ProjectFull) => {
    const startDate = project.contract_date ? dayjs(project.contract_date) : null;
    const endDate = project.construction_end_date ? dayjs(project.construction_end_date) : null;

    if (!startDate || !endDate) {
      // Fallback to just actual data if no dates set
      const projectCompletion = completionData.filter((c) => c.project_id === project.id && c.actual_amount > 0);
      if (projectCompletion.length === 0) return [];

      const sorted = [...projectCompletion].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      return sorted.map((c) => ({
        month: `${MONTH_NAMES_SHORT[c.month - 1]} ${String(c.year).slice(-2)}`,
        value: c.actual_amount / 1_000_000,
      }));
    }

    // Get project's completion data
    const projectCompletion = completionData.filter(
      (c) => c.project_id === project.id && c.actual_amount > 0
    );

    // Find the last month with actual data
    let lastDataMonth: dayjs.Dayjs | null = null;
    if (projectCompletion.length > 0) {
      const sortedCompletion = [...projectCompletion].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      lastDataMonth = dayjs(`${sortedCompletion[0].year}-${sortedCompletion[0].month}-01`);
    }

    // Generate ALL months from start to last data month (or end if no data)
    const data: { month: string; value: number | null }[] = [];
    let current = startDate.startOf('month');
    const stopDate = lastDataMonth || endDate;

    while (current.isSameOrBefore(stopDate, 'month')) {
      const year = current.year();
      const month = current.month() + 1;

      const completion = projectCompletion.find(
        (c) => c.year === year && c.month === month
      );

      data.push({
        month: `${MONTH_NAMES_SHORT[current.month()]} ${String(year).slice(-2)}`,
        value: completion ? completion.actual_amount / 1_000_000 : null,
      });

      current = current.add(1, 'month');
    }

    return data;
  };

  // Summary chart data - monthly totals across all projects
  const summaryChartData = useMemo(() => {
    const now = dayjs();

    // Find earliest project start date
    let earliestDate = now.subtract(12, 'month').startOf('month');
    projects.forEach((p) => {
      if (p.contract_date) {
        const projectStart = dayjs(p.contract_date).startOf('month');
        if (projectStart.isBefore(earliestDate)) {
          earliestDate = projectStart;
        }
      }
    });

    // Group completion data by month
    const monthlyData: Record<string, number> = {};
    completionData.forEach((c) => {
      if (c.actual_amount > 0) {
        const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + c.actual_amount;
      }
    });

    // Find last month with data
    const sortedKeys = Object.keys(monthlyData).sort();
    if (sortedKeys.length === 0) return [];

    const lastKey = sortedKeys[sortedKeys.length - 1];
    const lastDate = dayjs(lastKey + '-01');

    // Generate data from earliest to last month with data
    const data: { month: string; value: number }[] = [];
    let current = earliestDate;

    while (current.isSameOrBefore(lastDate, 'month')) {
      const key = `${current.year()}-${String(current.month() + 1).padStart(2, '0')}`;
      const value = monthlyData[key] || 0;

      if (value > 0 || data.length > 0) { // Start from first non-zero value
        data.push({
          month: `${MONTH_NAMES_SHORT[current.month()]} ${String(current.year()).slice(-2)}`,
          value: value / 1_000_000,
        });
      }

      current = current.add(1, 'month');
    }

    return data;
  }, [completionData, projects]);

  // Summary mini chart data (Area format - objects)
  const summaryMiniChartData = useMemo(() => {
    return summaryChartData.map((d, idx) => ({ idx, value: d.value }));
  }, [summaryChartData]);

  if (projects.length === 0) {
    return <Empty description="Нет объектов для отображения" />;
  }

  const rowHeight = 70;
  const headerHeight = 60;
  const projectNameWidth = 200;
  const chartWidth = 150;
  const gridWidth = months.length * monthWidth;

  // Mini chart config for Area
  const getMiniChartConfig = (color: string) => ({
    xField: 'idx',
    yField: 'value',
    height: rowHeight - 20,
    autoFit: true,
    smooth: true,
    line: { style: { stroke: color, lineWidth: 1.5 } },
    style: { fill: `${color}30` },
    animate: false,
    axis: false,
    legend: false,
    tooltip: false,
  });

  // Full chart config for Area
  const getFullChartConfig = (color: string) => ({
    xField: 'month',
    yField: 'value',
    smooth: true,
    line: { shapeField: 'smooth', style: { stroke: color, lineWidth: 2 } },
    style: { fill: `${color}20` },
    axis: {
      x: {
        labelAutoRotate: false,
        style: {
          labelFill: theme === 'dark' ? '#ffffff85' : '#00000073',
          lineStroke: theme === 'dark' ? '#303030' : '#f0f0f0',
          gridStroke: theme === 'dark' ? '#303030' : '#f0f0f0',
        },
      },
      y: {
        labelFormatter: (v: number) => {
          if (v >= 1000) return `${(v / 1000).toFixed(1)} млрд`;
          return `${v} млн`;
        },
        style: {
          labelFill: theme === 'dark' ? '#ffffff85' : '#00000073',
          lineStroke: theme === 'dark' ? '#303030' : '#f0f0f0',
          gridStroke: theme === 'dark' ? '#303030' : '#f0f0f0',
        },
      },
    },
    tooltip: {
      title: 'month',
      items: [
        {
          channel: 'y',
          name: 'Сумма',
          valueFormatter: (v: number) => {
            if (v >= 1000) return `${(v / 1000).toFixed(2)} млрд ₽`;
            return `${v.toFixed(2)} млн ₽`;
          },
        },
      ],
    },
    interaction: { tooltip: { crosshairs: true } },
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          border: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden',
          background: theme === 'dark' ? '#141414' : '#fff',
        }}
      >
        {/* Left panel - Project names */}
        <div
        style={{
          width: projectNameWidth,
          flexShrink: 0,
          borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            height: headerHeight,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
          }}
        >
          <Text strong>Объект</Text>
        </div>

        {/* Project rows */}
        {projects.map((project, index) => (
          <div
            key={project.id}
            style={{
              height: rowHeight,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 16px',
              borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
              background:
                hoveredProject === project.id
                  ? theme === 'dark'
                    ? '#262626'
                    : '#f5f5f5'
                  : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={() => setHoveredProject(project.id)}
            onMouseLeave={() => setHoveredProject(null)}
          >
            <Text
              strong
              ellipsis
              style={{
                color: COLORS[index % COLORS.length],
                maxWidth: projectNameWidth - 32,
              }}
            >
              {project.name}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Progress
                percent={Math.min(Math.round(project.completion_percentage), 100)}
                size="small"
                showInfo={false}
                strokeColor={COLORS[index % COLORS.length]}
                style={{ width: 80, margin: 0 }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {Math.round(project.completion_percentage)}%
              </Text>
            </div>
          </div>
        ))}

        {/* Totals row label */}
        <div
          style={{
            height: rowHeight,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
            borderTop: `2px solid ${theme === 'dark' ? '#434343' : '#d9d9d9'}`,
          }}
        >
          <Text strong style={{ color: '#52c41a' }}>ИТОГО</Text>
        </div>
      </div>

      {/* Chart column - Mini charts */}
      <div
        style={{
          width: chartWidth,
          flexShrink: 0,
          borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            height: headerHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
          }}
        >
          <Text strong style={{ fontSize: 12 }}>График</Text>
        </div>

        {/* Mini chart rows */}
        {projects.map((project, index) => {
          const chartData = getProjectMiniChartData(project);
          const color = COLORS[index % COLORS.length];
          return (
            <div
              key={project.id}
              style={{
                height: rowHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
                background:
                  hoveredProject === project.id
                    ? theme === 'dark'
                      ? '#262626'
                      : '#f5f5f5'
                    : 'transparent',
                transition: 'background 0.2s',
                cursor: chartData ? 'pointer' : 'default',
              }}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
              onClick={() => chartData && setChartModalProject({ project, colorIndex: index })}
            >
              {chartData ? (
                <div style={{ width: '100%', height: rowHeight - 20, pointerEvents: 'none' }}>
                  <Area data={chartData} {...getMiniChartConfig(color)} />
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
              )}
            </div>
          );
        })}

        {/* Totals row - clickable for summary chart */}
        <div
          style={{
            height: rowHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
            borderTop: `2px solid ${theme === 'dark' ? '#434343' : '#d9d9d9'}`,
            cursor: summaryMiniChartData.length > 0 ? 'pointer' : 'default',
          }}
          onClick={() => summaryMiniChartData.length > 0 && setSummaryChartOpen(true)}
        >
          {summaryMiniChartData.length > 0 ? (
            <div style={{ width: '100%', height: rowHeight - 20, pointerEvents: 'none' }}>
              <Area data={summaryMiniChartData} {...getMiniChartConfig('#52c41a')} />
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
          )}
        </div>
      </div>

      {/* Right panel - Timeline */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <div style={{ minWidth: gridWidth }}>
          {/* Month headers */}
          <div
            style={{
              display: 'flex',
              height: headerHeight,
              borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
              background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
            }}
          >
            {months.map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                style={{
                  width: monthWidth,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
                  background: month.isCurrent
                    ? theme === 'dark'
                      ? 'rgba(24, 144, 255, 0.2)'
                      : 'rgba(24, 144, 255, 0.1)'
                    : 'transparent',
                }}
              >
                <Text
                  strong={month.isCurrent}
                  type={month.isPast ? 'secondary' : undefined}
                  style={{ fontSize: 12 }}
                >
                  {month.shortLabel}
                </Text>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {month.year}
                </Text>
              </div>
            ))}
          </div>

          {/* Project rows with bars */}
          {projects.map((project, projectIndex) => {
            const color = COLORS[projectIndex % COLORS.length];

            return (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  height: rowHeight,
                  borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
                  background:
                    hoveredProject === project.id
                      ? theme === 'dark'
                        ? '#262626'
                        : '#f5f5f5'
                      : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                {months.map((month) => {
                  const completion = getCompletionForMonth(project.id, month.year, month.month);
                  const hasActual = completion && completion.actual_amount > 0;

                  // Check if month is within project timeline (from contract_date to construction_end_date)
                  const startDate = project.contract_date
                    ? dayjs(project.contract_date)
                    : null;
                  const endDate = project.construction_end_date
                    ? dayjs(project.construction_end_date)
                    : null;
                  const monthDate = dayjs(`${month.year}-${month.month}-01`);

                  const isAfterStart = !startDate || monthDate.isSameOrAfter(startDate, 'month');
                  const isBeforeEnd = !endDate || monthDate.isSameOrBefore(endDate, 'month');
                  const isInRange = isAfterStart && isBeforeEnd;

                  return (
                    <div
                      key={`${month.year}-${month.month}`}
                      style={{
                        width: monthWidth,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
                        background: month.isCurrent
                          ? theme === 'dark'
                            ? 'rgba(24, 144, 255, 0.1)'
                            : 'rgba(24, 144, 255, 0.05)'
                          : 'transparent',
                        padding: '4px 2px',
                      }}
                    >
                      {hasActual && (
                        <Tooltip
                          title={
                            <div>
                              <div>{month.label}</div>
                              <div>Факт: {formatMoney(completion!.actual_amount)} ₽</div>
                            </div>
                          }
                        >
                          <div
                            style={{
                              width: monthWidth - 8,
                              height: 28,
                              borderRadius: 4,
                              background: color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#fff',
                                fontWeight: 500,
                              }}
                            >
                              {formatMoney(completion!.actual_amount)}
                            </Text>
                          </div>
                        </Tooltip>
                      )}
                      {!hasActual && isInRange && startDate && endDate && (
                        <div
                          style={{
                            width: monthWidth - 16,
                            height: 4,
                            borderRadius: 2,
                            background: `${color}20`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Monthly totals row */}
          <div
            style={{
              display: 'flex',
              height: rowHeight,
              background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
              borderTop: `2px solid ${theme === 'dark' ? '#434343' : '#d9d9d9'}`,
            }}
          >
            {months.map((month) => {
              const key = `${month.year}-${month.month}`;
              const monthTotal = monthlyTotals[key] || 0;

              return (
                <div
                  key={key}
                  style={{
                    width: monthWidth,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
                    background: month.isCurrent
                      ? theme === 'dark'
                        ? 'rgba(24, 144, 255, 0.15)'
                        : 'rgba(24, 144, 255, 0.1)'
                      : 'transparent',
                  }}
                >
                  {monthTotal > 0 && (
                    <Text strong style={{ fontSize: 10, color: '#52c41a' }}>
                      {formatMoney(monthTotal)}
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      {/* Totals row */}
      <div
        style={{
          display: 'flex',
          padding: '16px 24px',
          background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
          border: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          gap: 48,
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Всего договоров:</Text>{' '}
          <Text strong style={{ color: '#1890ff' }}>{formatMoney(totals.totalContract)} ₽</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Закрыто:</Text>{' '}
          <Text strong style={{ color: '#52c41a' }}>{formatMoney(totals.totalCompletion)} ₽</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Осталось:</Text>{' '}
          <Text strong style={{ color: '#faad14' }}>{formatMoney(totals.totalRemaining)} ₽</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Прогресс:</Text>{' '}
          <Text strong>{Math.round(totals.completionPercent)}%</Text>
        </div>
      </div>

      {/* Chart modal */}
      <Modal
        title={chartModalProject ? `Выполнение: ${chartModalProject.project.name}` : ''}
        open={!!chartModalProject}
        onCancel={() => setChartModalProject(null)}
        footer={null}
        width="90vw"
        style={{ maxWidth: 1800 }}
        destroyOnClose
      >
        {chartModalProject && (
          <div style={{ height: 700 }}>
            {(() => {
              const fullData = getFullProjectChartData(chartModalProject.project);
              const color = COLORS[chartModalProject.colorIndex % COLORS.length];
              return fullData.length > 0 ? (
                <Area data={fullData} {...getFullChartConfig(color)} />
              ) : (
                <Empty description="Нет данных для отображения" />
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Summary chart modal */}
      <Modal
        title="Общее выполнение компании"
        open={summaryChartOpen}
        onCancel={() => setSummaryChartOpen(false)}
        footer={null}
        width="90vw"
        style={{ maxWidth: 1800 }}
        destroyOnClose
      >
        {summaryChartData.length > 0 && (
          <div style={{ height: 700 }}>
            <Area data={summaryChartData} {...getFullChartConfig('#52c41a')} />
          </div>
        )}
      </Modal>
    </div>
  );
};
