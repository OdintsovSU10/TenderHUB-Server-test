import React, { useState, useEffect } from 'react';
import { Table, Typography, theme, Input, Tag, Button, Space, message, Card } from 'antd';
import {
  SearchOutlined,
  CheckCircleFilled,
  SyncOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase, Tender } from '../../lib/supabase';
import { formatNumberWithSpaces } from '../../utils/numberFormat';
import dayjs from 'dayjs';
import './Dashboard.css';

const { Title, Text } = Typography;

interface TenderTableData {
  key: string;
  id: string;
  number: string;
  name: string;
  version: number;
  status_deadline: boolean;
  construction_area: number;
  boq_cost: number;
  cost_per_sqm: number;
  deadline: string;
  client: string;
}

const Dashboard: React.FC = () => {
  const { theme: currentTheme } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [tenders, setTenders] = useState<TenderTableData[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredTenders, setFilteredTenders] = useState<TenderTableData[]>([]);

  // Загрузка тендеров из базы данных
  const fetchTenders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: TenderTableData[] = (data || []).map((tender: Tender) => ({
        key: tender.id,
        id: tender.id,
        number: tender.tender_number || '',
        name: tender.title || '',
        version: tender.version || 1,
        status_deadline: tender.submission_deadline ?
          new Date(tender.submission_deadline) < new Date() : false,
        construction_area: tender.area_sp || 0,
        boq_cost: 0, // TODO: Это поле нужно будет рассчитать на основе BOQ позиций
        cost_per_sqm: 0, // TODO: Рассчитать после получения boq_cost
        deadline: tender.submission_deadline || '',
        client: tender.client_name || '',
      }));

      setTenders(formattedData);
      setFilteredTenders(formattedData);
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error);
      message.error('Не удалось загрузить тендеры');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  // Фильтрация тендеров по поисковому запросу
  useEffect(() => {
    if (searchText) {
      const filtered = tenders.filter(tender =>
        tender.name.toLowerCase().includes(searchText.toLowerCase()) ||
        tender.number.toLowerCase().includes(searchText.toLowerCase()) ||
        tender.client.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredTenders(filtered);
    } else {
      setFilteredTenders(tenders);
    }
  }, [searchText, tenders]);

  // Обновление расчета для тендера
  const handleUpdateCalculation = async (tenderId: string) => {
    message.info('Обновление расчета для тендера ' + tenderId);
    // TODO: Реализовать логику обновления расчета
  };

  const columns = [
    {
      title: 'Номер тендера',
      dataIndex: 'number',
      key: 'number',
      width: 130,
      render: (text: string) => (
        <Text strong>{text || '-'}</Text>
      ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (text: string, record: TenderTableData) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.client && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.client}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Версия',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center' as const,
      render: (version: number) => version || 1,
    },
    {
      title: 'Статус дедлайна',
      dataIndex: 'status_deadline',
      key: 'status_deadline',
      width: 130,
      align: 'center' as const,
      render: (isCompleted: boolean) => (
        <Tag
          icon={<CheckCircleFilled />}
          color={isCompleted ? 'success' : 'default'}
        >
          {isCompleted ? 'Завершен' : 'В работе'}
        </Tag>
      ),
    },
    {
      title: 'Площадь СП',
      dataIndex: 'construction_area',
      key: 'construction_area',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{formatNumberWithSpaces(value)} м²</Text>
      ),
    },
    {
      title: 'BOQ стоимость',
      dataIndex: 'boq_cost',
      key: 'boq_cost',
      width: 140,
      align: 'right' as const,
      render: (value: number) => (
        <Text strong>{formatNumberWithSpaces(value)} ₽</Text>
      ),
    },
    {
      title: 'Стоимость за м²',
      dataIndex: 'cost_per_sqm',
      key: 'cost_per_sqm',
      width: 130,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{formatNumberWithSpaces(Math.round(value))} ₽/м²</Text>
      ),
    },
    {
      title: 'Крайний срок',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (date: string) => (
        <Text>{date ? dayjs(date).format('DD.MM.YYYY') : '-'}</Text>
      ),
    },
    {
      title: 'Обновить расчет',
      key: 'action',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: TenderTableData) => (
        <Button
          type="text"
          icon={<SyncOutlined />}
          onClick={() => handleUpdateCalculation(record.id)}
          style={{ color: token.colorPrimary }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок страницы */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <DashboardOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
          <Title level={2} style={{ margin: 0 }}>
            Дашборд тендеров
          </Title>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Обзор активных тендеров и основные показатели
        </Text>
      </div>

      {/* Поиск */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Поиск по названию, номеру, заказчику..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 500,
            backgroundColor: currentTheme === 'dark' ? '#141414' : '#fff',
          }}
        />
      </div>

      {/* Таблица тендеров */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: currentTheme === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={filteredTenders}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} тендеров`,
            style: { margin: '16px' }
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;