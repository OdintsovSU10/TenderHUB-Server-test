import React from 'react';
import { Table, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { IndicatorRow } from '../hooks/useFinancialData';

const { Text } = Typography;

interface IndicatorsTableProps {
  data: IndicatorRow[];
  spTotal: number;
  customerTotal: number;
  formatNumber: (value: number | undefined) => string;
  currentTheme: string;
}

export const IndicatorsTable: React.FC<IndicatorsTableProps> = ({
  data,
  spTotal,
  customerTotal,
  formatNumber,
  currentTheme,
}) => {
  const columns: ColumnsType<IndicatorRow> = [
    {
      title: '№ п/п',
      dataIndex: 'row_number',
      key: 'row_number',
      width: 60,
      align: 'center',
    },
    {
      title: 'Наименование',
      dataIndex: 'indicator_name',
      key: 'indicator_name',
      width: 400,
      render: (text, record) => {
        const isIndented = record.row_number >= 2 && record.row_number <= 3;
        const content = (
          <Text
            strong={record.is_header || record.is_total}
            style={isIndented ? { paddingLeft: '40px' } : {}}
          >
            {text}
          </Text>
        );

        if (record.tooltip) {
          return (
            <Tooltip title={<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{record.tooltip}</pre>}>
              {content}
            </Tooltip>
          );
        }

        return content;
      },
    },
    {
      title: 'коэф-ты',
      dataIndex: 'coefficient',
      key: 'coefficient',
      width: 120,
      align: 'center',
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div>Площадь по СП</div>
          <div>{formatNumber(spTotal)} м²</div>
        </div>
      ),
      key: 'sp_cost',
      width: 150,
      align: 'center',
      render: (_, record) => {
        if (record.is_header) return 'стоимость на 1м²';
        return <Text strong={record.is_total}>{formatNumber(record.sp_cost)}</Text>;
      },
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div>Площадь Заказчика</div>
          <div>{formatNumber(customerTotal)} м²</div>
        </div>
      ),
      key: 'customer_cost',
      width: 150,
      align: 'center',
      render: (_, record) => {
        if (record.is_header) return 'стоимость на 1м²';
        return <Text strong={record.is_total}>{formatNumber(record.customer_cost)}</Text>;
      },
    },
    {
      title: 'Итого',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 200,
      align: 'right',
      render: (value, record) => {
        if (record.is_header) return 'итоговая стоимость';
        return <Text strong={record.is_total}>{formatNumber(value)}</Text>;
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        size="small"
        rowClassName={(record) => {
          if (record.is_header) return `header-row-${currentTheme}`;
          if (record.is_total) return `total-row-${currentTheme}`;
          if (record.is_yellow) return `yellow-row-${currentTheme}`;
          return '';
        }}
      />
      <style>{`
        .header-row-light {
          background-color: #e6f7ff !important;
          font-weight: bold;
        }
        .total-row-light {
          background-color: #f0f0f0 !important;
          font-weight: bold;
        }
        .yellow-row-light {
          background-color: #fff9e6 !important;
        }
        .header-row-dark {
          background-color: #1f1f1f !important;
          font-weight: bold;
        }
        .total-row-dark {
          background-color: #262626 !important;
          font-weight: bold;
        }
        .yellow-row-dark {
          background-color: #3a3a1a !important;
        }
      `}</style>
    </>
  );
};
