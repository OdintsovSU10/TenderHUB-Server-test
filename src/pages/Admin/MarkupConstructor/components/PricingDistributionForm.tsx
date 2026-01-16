import React, { useState, useEffect } from 'react';
import { Card, Select, Table, Button, Space, Tag, Typography, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '../../../../lib/supabase';

const { Title, Text } = Typography;

interface Tender {
  id: string;
  title: string;
  version: number;
}

interface DistributionRow {
  key: string;
  elementType: string;
  elementTypeTags: { label: string; color: string }[];
  baseCostTarget: 'materials' | 'works';
  markupTarget: 'materials' | 'works';
}

const INITIAL_DISTRIBUTION: DistributionRow[] = [
  {
    key: 'мат_основн',
    elementType: 'Основные материалы',
    elementTypeTags: [
      { label: 'мат', color: 'cyan' },
      { label: 'основн.', color: 'orange' },
    ],
    baseCostTarget: 'materials',
    markupTarget: 'works',
  },
  {
    key: 'мат_вспом',
    elementType: 'Вспомогательные материалы',
    elementTypeTags: [
      { label: 'мат', color: 'cyan' },
      { label: 'вспом.', color: 'blue' },
    ],
    baseCostTarget: 'works',
    markupTarget: 'works',
  },
  {
    key: 'суб-мат_основн',
    elementType: 'Субподрядные материалы (основные)',
    elementTypeTags: [
      { label: 'суб-мат', color: 'cyan' },
      { label: 'основн.', color: 'orange' },
    ],
    baseCostTarget: 'materials',
    markupTarget: 'works',
  },
  {
    key: 'суб-мат_вспом',
    elementType: 'Субподрядные материалы (вспомогательные)',
    elementTypeTags: [
      { label: 'суб-мат', color: 'cyan' },
      { label: 'вспом.', color: 'blue' },
    ],
    baseCostTarget: 'works',
    markupTarget: 'works',
  },
  {
    key: 'раб',
    elementType: 'Работы',
    elementTypeTags: [
      { label: 'раб', color: 'green' },
      { label: 'суб-раб', color: 'green' },
    ],
    baseCostTarget: 'works',
    markupTarget: 'works',
  },
  {
    key: 'мат-комп',
    elementType: 'Материалы компании',
    elementTypeTags: [
      { label: 'мат-комп.', color: 'cyan' },
      { label: 'основн.', color: 'orange' },
    ],
    baseCostTarget: 'works',
    markupTarget: 'works',
  },
  {
    key: 'раб-комп',
    elementType: 'Работы компании',
    elementTypeTags: [{ label: 'раб-комп.', color: 'green' }],
    baseCostTarget: 'works',
    markupTarget: 'works',
  },
];

export const PricingDistributionForm: React.FC = () => {
  const [allTenders, setAllTenders] = useState<Tender[]>([]);
  const [uniqueTitles, setUniqueTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<DistributionRow[]>(INITIAL_DISTRIBUTION);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загрузить список всех тендеров
  useEffect(() => {
    const fetchTenders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tenders')
          .select('id, title, version')
          .order('title');

        if (error) throw error;
        setAllTenders(data || []);

        // Получить уникальные названия тендеров
        const titles = Array.from(new Set((data || []).map((t) => t.title)));
        setUniqueTitles(titles);
      } catch (error) {
        console.error('Error fetching tenders:', error);
        message.error('Ошибка загрузки списка тендеров');
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  // Загрузить доступные версии при выборе тендера
  useEffect(() => {
    if (!selectedTitle) {
      setAvailableVersions([]);
      setSelectedVersion(null);
      return;
    }

    const versions = allTenders
      .filter((t) => t.title === selectedTitle)
      .map((t) => t.version)
      .sort((a, b) => b - a); // Сортировка по убыванию (новые версии сверху)

    setAvailableVersions(versions);

    // Автоматически выбрать последнюю версию
    if (versions.length > 0) {
      setSelectedVersion(versions[0]);
    }
  }, [selectedTitle, allTenders]);

  // Загрузить настройки распределения для выбранного тендера и версии
  useEffect(() => {
    if (!selectedTitle || selectedVersion === null) return;

    const fetchDistribution = async () => {
      setLoading(true);
      try {
        // Найти tender_id по названию и версии
        const tender = allTenders.find(
          (t) => t.title === selectedTitle && t.version === selectedVersion
        );

        if (!tender) {
          message.error('Тендер не найден');
          return;
        }

        const { data, error } = await supabase
          .from('tender_pricing_distribution')
          .select('*')
          .eq('tender_id', tender.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Преобразовать данные из БД в формат таблицы
          // TODO: Реализовать маппинг из данных БД
          setDistribution(INITIAL_DISTRIBUTION);
        } else {
          setDistribution(INITIAL_DISTRIBUTION);
        }
      } catch (error) {
        console.error('Error fetching distribution:', error);
        message.error('Ошибка загрузки настроек распределения');
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [selectedTitle, selectedVersion, allTenders]);

  // Сохранить настройки
  const handleSave = async () => {
    if (!selectedTitle || selectedVersion === null) {
      message.warning('Выберите тендер и версию');
      return;
    }

    setSaving(true);
    try {
      // Найти tender_id по названию и версии
      const tender = allTenders.find(
        (t) => t.title === selectedTitle && t.version === selectedVersion
      );

      if (!tender) {
        message.error('Тендер не найден');
        return;
      }

      // TODO: Преобразовать distribution в формат БД и сохранить
      message.success('Настройки распределения сохранены');
    } catch (error) {
      console.error('Error saving distribution:', error);
      message.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  // Сбросить к значениям по умолчанию
  const handleReset = () => {
    setDistribution(INITIAL_DISTRIBUTION);
    message.info('Настройки сброшены к значениям по умолчанию');
  };

  // Обновить целевую колонку для базовой стоимости
  const handleBaseCostTargetChange = (key: string, value: 'materials' | 'works') => {
    setDistribution((prev) =>
      prev.map((row) => (row.key === key ? { ...row, baseCostTarget: value } : row))
    );
  };

  // Обновить целевую колонку для наценки
  const handleMarkupTargetChange = (key: string, value: 'materials' | 'works') => {
    setDistribution((prev) =>
      prev.map((row) => (row.key === key ? { ...row, markupTarget: value } : row))
    );
  };

  const columns = [
    {
      title: 'Тип элемента',
      dataIndex: 'elementType',
      key: 'elementType',
      width: 300,
      render: (text: string, record: DistributionRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Space size="small">
            {record.elementTypeTags.map((tag, index) => (
              <Tag key={index} color={tag.color}>
                {tag.label}
              </Tag>
            ))}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Базовая стоимость',
      dataIndex: 'baseCostTarget',
      key: 'baseCostTarget',
      width: 200,
      render: (value: string, record: DistributionRow) => (
        <Select
          value={value}
          onChange={(newValue) => handleBaseCostTargetChange(record.key, newValue)}
          style={{ width: '100%' }}
          options={[
            { label: 'Материалы КП', value: 'materials' },
            { label: 'Работы КП', value: 'works' },
          ]}
        />
      ),
    },
    {
      title: 'Наценка',
      dataIndex: 'markupTarget',
      key: 'markupTarget',
      width: 200,
      render: (value: string, record: DistributionRow) => (
        <Select
          value={value}
          onChange={(newValue) => handleMarkupTargetChange(record.key, newValue)}
          style={{ width: '100%' }}
          options={[
            { label: 'Материалы КП', value: 'materials' },
            { label: 'Работы КП', value: 'works' },
          ]}
        />
      ),
    },
    {
      title: 'Результат',
      key: 'result',
      render: (_: any, record: DistributionRow) => {
        const { baseCostTarget, markupTarget } = record;

        if (baseCostTarget === 'materials' && markupTarget === 'works') {
          return (
            <Space direction="vertical" size="small">
              <Tag color="green">База → Материалы КП</Tag>
              <Tag color="red">Наценка → Работы КП</Tag>
            </Space>
          );
        } else if (baseCostTarget === 'works' && markupTarget === 'works') {
          return <Tag color="blue">Всё → Работы КП</Tag>;
        } else if (baseCostTarget === 'materials' && markupTarget === 'materials') {
          return <Tag color="cyan">Всё → Материалы КП</Tag>;
        } else {
          return (
            <Space direction="vertical" size="small">
              <Tag color="red">База → Работы КП</Tag>
              <Tag color="green">Наценка → Материалы КП</Tag>
            </Space>
          );
        }
      },
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={4} style={{ marginTop: 0 }}>
            Распределение затрат между материалами и работами (КП)
          </Title>
          <Text type="secondary">
            Настройте, как базовые затраты и наценки распределяются между материалами и работами
            (КП) для выбранного тендера
          </Text>
        </div>

        {/* Выбор тендера и версии */}
        <Space size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Выберите тендер:
            </Text>
            <Select
              value={selectedTitle}
              onChange={setSelectedTitle}
              style={{ width: 300 }}
              placeholder="Выберите тендер"
              loading={loading}
              options={uniqueTitles.map((title) => ({
                label: title,
                value: title,
              }))}
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Версия:
            </Text>
            <Select
              value={selectedVersion}
              onChange={setSelectedVersion}
              style={{ width: 100 }}
              placeholder="Версия"
              disabled={!selectedTitle || availableVersions.length === 0}
              options={availableVersions.map((version) => ({
                label: `v${version}`,
                value: version,
              }))}
            />
          </div>
        </Space>

        {/* Таблица настроек */}
        {selectedTitle && selectedVersion !== null && (
          <>
            <Table
              dataSource={distribution}
              columns={columns}
              pagination={false}
              loading={loading}
              bordered
            />

            {/* Кнопки действий */}
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                Сохранить настройки
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Сбросить к значениям по умолчанию
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
};
