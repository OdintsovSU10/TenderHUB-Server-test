import React from 'react';
import { Card, Row, Col, Typography } from 'antd';

const { Text } = Typography;
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../../contexts/ThemeContext';
import type { IndicatorRow } from '../hooks/useFinancialData';

interface IndicatorsChartsProps {
  data: IndicatorRow[];
  spTotal: number;
  customerTotal: number;
  formatNumber: (value: number | undefined) => string;
}

export const IndicatorsCharts: React.FC<IndicatorsChartsProps> = ({
  data,
  spTotal,
  customerTotal,
  formatNumber,
}) => {
  const { theme: currentTheme } = useTheme();

  const getPieChartData = () => {
    if (data.length === 0) return null;

    const subcontract = data.find(d => d.row_number === 2)?.total_cost || 0;
    const su10Works = data.find(d => d.row_number === 3)?.total_cost || 0;
    const mechanization = data.find(d => d.row_number === 4)?.total_cost || 0;
    const mvpGsm = data.find(d => d.row_number === 5)?.total_cost || 0;
    const warranty = data.find(d => d.row_number === 6)?.total_cost || 0;
    const coefficient06 = data.find(d => d.row_number === 7)?.total_cost || 0;
    const costGrowth = data.find(d => d.row_number === 8)?.total_cost || 0;
    const unforeseeable = data.find(d => d.row_number === 9)?.total_cost || 0;
    const ooz = data.find(d => d.row_number === 10)?.total_cost || 0;
    const oozSubcontract = data.find(d => d.row_number === 11)?.total_cost || 0;
    const ofz = data.find(d => d.row_number === 12)?.total_cost || 0;
    const profit = data.find(d => d.row_number === 13)?.total_cost || 0;
    const profitSubcontract = data.find(d => d.row_number === 14)?.total_cost || 0;

    const totalProfit = profit + profitSubcontract;

    return {
      labels: [
        'Субподряд',
        'Работы + Материалы СУ-10',
        'Служба механизации',
        'МБП+ГСМ',
        'Гарантийный период',
        '0,6к (Раб+СМ)',
        'Рост стоимости',
        'Непредвиденные',
        'ООЗ',
        'ООЗ Субподряд',
        'ОФЗ',
        'Прибыль',
      ],
      datasets: [
        {
          data: [
            subcontract,
            su10Works,
            mechanization,
            mvpGsm,
            warranty,
            coefficient06,
            costGrowth,
            unforeseeable,
            ooz,
            oozSubcontract,
            ofz,
            totalProfit,
          ],
          backgroundColor: [
            '#ff4d4f',
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#722ed1',
            '#13c2c2',
            '#fa8c16',
            '#eb2f96',
            '#52c41a',
            '#95de64',
            '#faad14',
            '#1890ff',
          ],
          borderWidth: 2,
          borderColor: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff',
        },
      ],
    };
  };

  const getHorizontalBarChartData = () => {
    if (data.length === 0) return null;

    const filteredData = data.filter(d => !d.is_header && d.row_number !== 15 && d.row_number !== 1 && d.row_number !== 14);

    const labels: string[] = [];
    const totalCostData: number[] = [];
    const backgroundColors: string[] = [];
    const borderColors: string[] = [];

    filteredData.forEach((d) => {
      let label = d.indicator_name;

      if (d.row_number === 2) {
        label = 'Субподряд ПЗ';
      } else if (d.row_number === 3) {
        label = 'Работы+материалы СУ-10 ПЗ';
      } else if (d.row_number === 13) {
        label = 'Прибыль';
        const profit13 = data.find(item => item.row_number === 13)?.total_cost || 0;
        const profit14 = data.find(item => item.row_number === 14)?.total_cost || 0;
        totalCostData.push(profit13 + profit14);
        labels.push(label);
        backgroundColors.push('rgba(19, 194, 194, 0.7)');
        borderColors.push('rgba(19, 194, 194, 1)');
        return;
      }

      labels.push(label);
      totalCostData.push(d.total_cost || 0);

      if (d.row_number >= 2 && d.row_number <= 3) {
        backgroundColors.push('rgba(64, 169, 255, 0.6)');
        borderColors.push('rgba(64, 169, 255, 1)');
      } else if (d.row_number >= 4 && d.row_number <= 7) {
        backgroundColors.push('rgba(82, 196, 26, 0.7)');
        borderColors.push('rgba(82, 196, 26, 1)');
      } else if (d.row_number === 8) {
        backgroundColors.push('rgba(250, 140, 22, 0.7)');
        borderColors.push('rgba(250, 140, 22, 1)');
      } else if (d.row_number === 9) {
        backgroundColors.push('rgba(235, 47, 150, 0.7)');
        borderColors.push('rgba(235, 47, 150, 1)');
      } else if (d.row_number >= 10 && d.row_number <= 11) {
        backgroundColors.push('rgba(250, 173, 20, 0.7)');
        borderColors.push('rgba(250, 173, 20, 1)');
      } else if (d.row_number === 12) {
        backgroundColors.push('rgba(114, 46, 209, 0.7)');
        borderColors.push('rgba(114, 46, 209, 1)');
      } else {
        backgroundColors.push('rgba(140, 140, 140, 0.5)');
        borderColors.push('rgba(140, 140, 140, 1)');
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Итоговая стоимость (руб.)',
          data: totalCostData,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          padding: 10,
          font: { size: 11 },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels && data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
              return data.labels.map((label: string, i: number) => {
                const value = dataset.data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: (dataset.backgroundColor && Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : '#000') as string,
                  fontColor: currentTheme === 'dark' ? '#ffffff' : '#000000',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('ru-RU')} руб. (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold' as const, size: 14 },
        formatter: function(value: number, context: any) {
          const dataset = context.chart.data.datasets[0];
          const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage + '%';
        }
      }
    },
  };

  const horizontalBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      datalabels: { display: false },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.x || 0;
            return `Стоимость: ${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} руб.`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          callback: function(value: string | number) {
            return (Number(value) / 1000000).toFixed(1) + ' млн';
          }
        },
        grid: {
          color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        ticks: {
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          font: { size: 10 },
        },
        grid: {
          color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div>
      {/* Статистические карточки */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ textAlign: 'center', background: currentTheme === 'dark' ? '#1f1f1f' : '#f0f5ff' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Прямые затраты</Text>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff', marginTop: 8 }}>
              {formatNumber(data.find(d => d.row_number === 1)?.total_cost || 0)} руб.
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ textAlign: 'center', background: currentTheme === 'dark' ? '#1f1f1f' : '#f6ffed' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Наценки (всего)</Text>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a', marginTop: 8 }}>
              {formatNumber(
                (data.find(d => d.row_number === 4)?.total_cost || 0) +
                (data.find(d => d.row_number === 5)?.total_cost || 0) +
                (data.find(d => d.row_number === 6)?.total_cost || 0) +
                (data.find(d => d.row_number === 7)?.total_cost || 0) +
                (data.find(d => d.row_number === 8)?.total_cost || 0) +
                (data.find(d => d.row_number === 9)?.total_cost || 0) +
                (data.find(d => d.row_number === 10)?.total_cost || 0) +
                (data.find(d => d.row_number === 11)?.total_cost || 0) +
                (data.find(d => d.row_number === 12)?.total_cost || 0)
              )} руб.
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ textAlign: 'center', background: currentTheme === 'dark' ? '#1f1f1f' : '#e6fffb' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Прибыль (всего)</Text>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#13c2c2', marginTop: 8 }}>
              {formatNumber(
                (data.find(d => d.row_number === 13)?.total_cost || 0) +
                (data.find(d => d.row_number === 14)?.total_cost || 0)
              )} руб.
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ textAlign: 'center', background: currentTheme === 'dark' ? '#1f1f1f' : '#fff7e6' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Итоговая стоимость</Text>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fa8c16', marginTop: 8 }}>
              {formatNumber(data.find(d => d.row_number === 15)?.total_cost || 0)} руб.
            </div>
          </Card>
        </Col>
      </Row>

      {/* Статистические карточки - Площади */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card
            title={<Text strong style={{ fontSize: 14 }}>Площадь по СП: {formatNumber(spTotal)} м²</Text>}
            bordered
            style={{ background: currentTheme === 'dark' ? '#1f1f1f' : '#fafafa' }}
          >
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Прямые затраты</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff', marginTop: 4 }}>
                    {formatNumber(data.find(d => d.row_number === 1)?.sp_cost || 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Наценки</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a', marginTop: 4 }}>
                    {formatNumber(
                      (data.find(d => d.row_number === 4)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 5)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 6)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 7)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 8)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 9)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 10)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 11)?.sp_cost || 0) +
                      (data.find(d => d.row_number === 12)?.sp_cost || 0)
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px', background: currentTheme === 'dark' ? '#262626' : '#fff7e6', borderRadius: '4px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Итого</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16', marginTop: 4 }}>
                    {formatNumber(data.find(d => d.row_number === 15)?.sp_cost || 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            title={<Text strong style={{ fontSize: 14 }}>Площадь Заказчика: {formatNumber(customerTotal)} м²</Text>}
            bordered
            style={{ background: currentTheme === 'dark' ? '#1f1f1f' : '#fafafa' }}
          >
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Прямые затраты</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff', marginTop: 4 }}>
                    {formatNumber(data.find(d => d.row_number === 1)?.customer_cost || 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Наценки</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a', marginTop: 4 }}>
                    {formatNumber(
                      (data.find(d => d.row_number === 4)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 5)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 6)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 7)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 8)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 9)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 10)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 11)?.customer_cost || 0) +
                      (data.find(d => d.row_number === 12)?.customer_cost || 0)
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px', background: currentTheme === 'dark' ? '#262626' : '#fff7e6', borderRadius: '4px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Итого</Text>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16', marginTop: 4 }}>
                    {formatNumber(data.find(d => d.row_number === 15)?.customer_cost || 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>руб/м²</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Графики */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Структура затрат" bordered style={{ height: 500 }}>
            {getPieChartData() && (
              <div style={{ height: 420 }}>
                <Doughnut data={getPieChartData()!} options={pieOptions} />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Детализация затрат (итоговая стоимость)" bordered style={{ minHeight: 600 }}>
            {getHorizontalBarChartData() && (
              <div style={{ height: 550 }}>
                <Bar data={getHorizontalBarChartData()!} options={horizontalBarOptions} />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
