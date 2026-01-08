import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Typography, Empty, Tooltip, Progress, Button, Modal } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ProjectFull, ProjectCompletion } from '../../../lib/supabase/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

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

  // Generate mini chart data for a project (only actual data points, no labels)
  const getProjectChartData = (project: ProjectFull, colorIndex: number) => {
    const color = COLORS[colorIndex % COLORS.length];
    const projectCompletion = completionData.filter((c) => c.project_id === project.id && c.actual_amount > 0);

    if (projectCompletion.length === 0) {
      return null;
    }

    // Sort by date
    const sorted = [...projectCompletion].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return {
      labels: sorted.map(() => ''), // Empty labels
      datasets: [
        {
          data: sorted.map((c) => c.actual_amount / 1_000_000),
          borderColor: color,
          backgroundColor: `${color}15`,
          tension: 0.4,
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0,
          datalabels: { display: false },
        },
      ],
    };
  };

  // Generate full chart data for modal (full construction period on X axis)
  const getFullProjectChartData = (project: ProjectFull, colorIndex: number) => {
    const color = COLORS[colorIndex % COLORS.length];

    const startDate = project.contract_date ? dayjs(project.contract_date) : null;
    const endDate = project.construction_end_date ? dayjs(project.construction_end_date) : null;

    if (!startDate || !endDate) {
      // Fallback to just actual data if no dates set
      return getProjectChartData(project, colorIndex);
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

    // Generate ALL months from start to end (full construction period)
    const allMonths: { year: number; month: number; label: string }[] = [];
    let current = startDate.startOf('month');

    while (current.isSameOrBefore(endDate, 'month')) {
      allMonths.push({
        year: current.year(),
        month: current.month() + 1,
        label: `${MONTH_NAMES_SHORT[current.month()]} ${current.year().toString().slice(-2)}`,
      });
      current = current.add(1, 'month');
    }

    // Get actual data - null for months without data, but don't include data after last actual month
    const data = allMonths.map((m) => {
      const monthDate = dayjs(`${m.year}-${m.month}-01`);

      // If this month is after the last month with data, return null (line ends)
      if (lastDataMonth && monthDate.isAfter(lastDataMonth, 'month')) {
        return null;
      }

      const completion = projectCompletion.find(
        (c) => c.year === m.year && c.month === m.month
      );
      return completion ? completion.actual_amount / 1_000_000 : null;
    });

    return {
      labels: allMonths.map((m) => m.label),
      datasets: [
        {
          data,
          borderColor: color,
          backgroundColor: `${color}20`,
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          spanGaps: true,
          datalabels: { display: false },
        },
      ],
    };
  };

  // Mini chart options - completely minimal, no text at all
  const miniChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      title: { display: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 1.5 },
    },
  }), []);

  // Full chart options for modal - only tooltips, no data labels
  const fullChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: { parsed: { y: number } }) => {
            const value = context.parsed.y;
            if (value >= 1000) {
              return `${(value / 1000).toFixed(2)} млрд ₽`;
            }
            return `${value.toFixed(2)} млн ₽`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: theme === 'dark' ? '#303030' : '#f0f0f0' },
        ticks: { color: theme === 'dark' ? '#ffffff85' : '#00000073' },
      },
      y: {
        grid: { color: theme === 'dark' ? '#303030' : '#f0f0f0' },
        ticks: {
          color: theme === 'dark' ? '#ffffff85' : '#00000073',
          callback: (value: number | string) => {
            const num = typeof value === 'number' ? value : parseFloat(value);
            if (num >= 1000) {
              return `${(num / 1000).toFixed(1)} млрд`;
            }
            return `${num} млн`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [theme]);

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

    // End date is current + 6 months
    const endDate = now.add(6, 'month').endOf('month');

    // Generate all months in range
    const allMonths: { key: string; label: string }[] = [];
    let current = earliestDate;
    while (current.isSameOrBefore(endDate, 'month')) {
      const key = `${current.year()}-${String(current.month() + 1).padStart(2, '0')}`;
      allMonths.push({
        key,
        label: `${MONTH_NAMES_SHORT[current.month()]} ${current.year().toString().slice(-2)}`,
      });
      current = current.add(1, 'month');
    }

    // Group completion data by month
    const monthlyTotals: Record<string, number> = {};
    completionData.forEach((c) => {
      if (c.actual_amount > 0) {
        const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + c.actual_amount;
      }
    });

    // Find last month with data to stop the line there
    const monthsWithData = allMonths.filter((m) => monthlyTotals[m.key] > 0);
    const lastMonthWithData = monthsWithData.length > 0
      ? monthsWithData[monthsWithData.length - 1].key
      : null;

    // Build data array - null for months after last data
    const data = allMonths.map((m) => {
      if (lastMonthWithData && m.key > lastMonthWithData) {
        return null;
      }
      return monthlyTotals[m.key] ? monthlyTotals[m.key] / 1_000_000 : null;
    });

    if (allMonths.length === 0) return null;

    return {
      labels: allMonths.map((m) => m.label),
      datasets: [
        {
          data,
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.15)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          spanGaps: true,
          datalabels: { display: false },
        },
      ],
    };
  }, [completionData, projects]);

  // Summary chart options
  const summaryChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: { parsed: { y: number } }) => {
            const value = context.parsed.y;
            if (value >= 1000) {
              return `${(value / 1000).toFixed(2)} млрд ₽`;
            }
            return `${value.toFixed(2)} млн ₽`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: theme === 'dark' ? '#303030' : '#f0f0f0' },
        ticks: { color: theme === 'dark' ? '#ffffff85' : '#00000073' },
      },
      y: {
        grid: { color: theme === 'dark' ? '#303030' : '#f0f0f0' },
        ticks: {
          color: theme === 'dark' ? '#ffffff85' : '#00000073',
          callback: (value: number | string) => {
            const num = typeof value === 'number' ? value : parseFloat(value);
            if (num >= 1000) {
              return `${(num / 1000).toFixed(1)} млрд`;
            }
            return `${num} млн`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [theme]);

  if (projects.length === 0) {
    return <Empty description="Нет объектов для отображения" />;
  }

  const rowHeight = 70;
  const headerHeight = 60;
  const projectNameWidth = 200;
  const chartWidth = 150;
  const gridWidth = months.length * monthWidth;

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
          const chartData = getProjectChartData(project, index);
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
                  <Line data={chartData} options={miniChartOptions} />
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
            cursor: summaryChartData ? 'pointer' : 'default',
          }}
          onClick={() => summaryChartData && setSummaryChartOpen(true)}
        >
          {summaryChartData ? (
            <div style={{ width: '100%', height: rowHeight - 20, pointerEvents: 'none' }}>
              <Line data={summaryChartData} options={miniChartOptions} />
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
              const fullData = getFullProjectChartData(chartModalProject.project, chartModalProject.colorIndex);
              return fullData ? (
                <Line data={fullData} options={fullChartOptions} />
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
        {summaryChartData && (
          <div style={{ height: 700 }}>
            <Line data={summaryChartData} options={summaryChartOptions} />
          </div>
        )}
      </Modal>
    </div>
  );
};
