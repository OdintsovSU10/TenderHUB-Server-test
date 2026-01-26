/**
 * Страница тестирования расчётов наценок
 * Позволяет проверить корректность расчётов и агрегации для выбранного тендера
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Typography,
  Space,
  Alert,
  Spin,
  Descriptions,
  Collapse,
  Tag,
  Statistic,
  Row,
  Col,
  Divider,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import type { BoqItem, Tender } from '../../lib/supabase';
import { logger } from '../../utils/debug';
import { loadMarkupParameters } from '../../services/markupTactic/parameters';
import { loadSubcontractGrowthExclusions } from '../../services/markupTactic/calculation';
import {
  calculateTenderMarkupAggregation,
  getMarkupByParameter,
  type TenderMarkupAggregation,
  type ParameterMarkupAggregate,
} from '../../services/markupTactic/aggregation';
import {
  runMarkupVerification,
  type VerificationResult,
} from '../../utils/verification';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface TenderOption {
  value: string;
  label: string;
  tender: Tender;
}

interface ComparisonRow {
  key: string;
  parameter: string;
  parameterKey: string;
  aggregatedValue: number;
  itemsCount: number;
  stepsCount: number;
}

const Test: React.FC = () => {
  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTenders, setLoadingTenders] = useState(false);

  // Результаты тестов
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [aggregation, setAggregation] = useState<TenderMarkupAggregation | null>(null);
  const [boqItemsCount, setBoqItemsCount] = useState(0);
  const [tacticName, setTacticName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [parameterLabels, setParameterLabels] = useState<Map<string, string>>(new Map());

  // Загрузка списка тендеров
  const loadTenders = useCallback(async () => {
    setLoadingTenders(true);
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('title');

      if (error) throw error;

      const options: TenderOption[] = (data || []).map((t) => ({
        value: t.id,
        label: `${t.title} (v${t.version || 1})`,
        tender: t,
      }));

      setTenders(options);
    } catch (err) {
      logger.error('Ошибка загрузки тендеров:', err);
      setError('Не удалось загрузить список тендеров');
    } finally {
      setLoadingTenders(false);
    }
  }, []);

  // Загрузка при первом рендере
  React.useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  // Загрузка BOQ элементов
  const loadBoqItems = async (tenderId: string): Promise<BoqItem[]> => {
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
  };

  // Запуск тестирования
  const runTests = useCallback(async () => {
    if (!selectedTenderId) return;

    setLoading(true);
    setError(null);
    setVerificationResult(null);
    setAggregation(null);

    try {
      // 1. Запускаем базовую верификацию расчётов
      const verification = runMarkupVerification();
      setVerificationResult(verification);

      // 2. Загружаем тендер
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', selectedTenderId)
        .single();

      if (tenderError) throw tenderError;

      if (!tender.markup_tactic_id) {
        setError('У тендера не назначена тактика наценок');
        return;
      }

      // 3. Загружаем тактику
      const { data: tactic, error: tacticError } = await supabase
        .from('markup_tactics')
        .select('*')
        .eq('id', tender.markup_tactic_id)
        .single();

      if (tacticError) throw tacticError;
      setTacticName(tactic.name || 'Без названия');

      // 4. Загружаем параметры наценок
      const markupParameters = await loadMarkupParameters(selectedTenderId);

      // 4.1 Загружаем названия параметров из БД
      const { data: paramsData } = await supabase
        .from('markup_parameters')
        .select('key, label');

      if (paramsData) {
        const labelsMap = new Map<string, string>();
        paramsData.forEach(p => labelsMap.set(p.key, p.label));
        setParameterLabels(labelsMap);
      }

      // 5. Загружаем исключения
      const exclusions = await loadSubcontractGrowthExclusions(selectedTenderId);

      // 6. Загружаем BOQ элементы
      const boqItems = await loadBoqItems(selectedTenderId);
      setBoqItemsCount(boqItems.length);

      if (boqItems.length === 0) {
        setError('В тендере нет BOQ элементов');
        return;
      }

      // 7. Выполняем агрегацию
      const agg = calculateTenderMarkupAggregation(
        boqItems,
        tactic,
        markupParameters,
        exclusions
      );
      setAggregation(agg);

      logger.info('Тестирование завершено успешно', {
        itemsCount: boqItems.length,
        totalCommercial: agg.totalCommercialCost,
        parametersCount: agg.byParameter.size,
      });
    } catch (err) {
      logger.error('Ошибка тестирования:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [selectedTenderId]);

  // Формирование таблицы параметров
  const getParameterTableData = (): ComparisonRow[] => {
    if (!aggregation) return [];

    const rows: ComparisonRow[] = [];
    aggregation.byParameter.forEach((value: ParameterMarkupAggregate, key: string) => {
      // Используем label из загруженных параметров или ключ как fallback
      const label = parameterLabels.get(key) || value.parameterLabel || key;
      rows.push({
        key,
        parameter: label,
        parameterKey: key,
        aggregatedValue: value.totalMarkupAmount,
        itemsCount: value.itemCount,
        stepsCount: value.stepsCount,
      });
    });

    // Сортируем по абсолютной сумме наценки (от большей к меньшей)
    return rows.sort((a, b) => Math.abs(b.aggregatedValue) - Math.abs(a.aggregatedValue));
  };

  const parameterColumns = [
    {
      title: 'Параметр',
      dataIndex: 'parameter',
      key: 'parameter',
      render: (text: string, record: ComparisonRow) => (
        <Tooltip title={`Ключ: ${record.parameterKey}`}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Ключ',
      dataIndex: 'parameterKey',
      key: 'parameterKey',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Сумма наценки',
      dataIndex: 'aggregatedValue',
      key: 'aggregatedValue',
      align: 'right' as const,
      render: (value: number) => {
        const isNegative = value < 0;
        const color = isNegative ? '#ef4444' : value > 0 ? '#10b981' : undefined;
        return (
          <Tooltip title={isNegative ? 'Отрицательное значение - возможна ошибка в расчёте' : undefined}>
            <Text strong style={{ color }}>
              {value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
              {isNegative && ' ⚠️'}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'BOQ элементов',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      align: 'center' as const,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Шагов расчёта',
      dataIndex: 'stepsCount',
      key: 'stepsCount',
      align: 'center' as const,
      render: (count: number) => <Tag color="purple">{count}</Tag>,
    },
  ];

  // Таблица прямых затрат
  const getDirectCostsData = () => {
    if (!aggregation) return [];

    const { directCosts } = aggregation;
    return [
      { key: 'works', label: 'Работы СУ-10', value: directCosts.works, type: 'раб' },
      { key: 'materials', label: 'Материалы СУ-10', value: directCosts.materials, type: 'мат' },
      { key: 'subWorks', label: 'Субподряд работы', value: directCosts.subcontractWorks, type: 'суб-раб' },
      { key: 'subMaterials', label: 'Субподряд материалы', value: directCosts.subcontractMaterials, type: 'суб-мат' },
      { key: 'worksComp', label: 'Работы комп.', value: directCosts.worksComp, type: 'раб-комп.' },
      { key: 'materialsComp', label: 'Материалы комп.', value: directCosts.materialsComp, type: 'мат-комп.' },
      { key: 'total', label: 'ИТОГО', value: directCosts.total, type: 'total' },
    ];
  };

  const directCostsColumns = [
    {
      title: 'Категория',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: any) => (
        <Text strong={record.type === 'total'}>{text}</Text>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        type !== 'total' ? <Tag>{type}</Tag> : null
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'value',
      key: 'value',
      align: 'right' as const,
      render: (value: number, record: any) => (
        <Text strong={record.type === 'total'} style={{ color: record.type === 'total' ? '#10b981' : undefined }}>
          {value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок */}
        <Card>
          <Space align="center">
            <ExperimentOutlined style={{ fontSize: 32, color: '#10b981' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>Тестирование расчётов наценок</Title>
              <Text type="secondary">
                Проверка корректности пошаговых расчётов и агрегации по параметрам
              </Text>
            </div>
          </Space>
        </Card>

        {/* Выбор тендера */}
        <Card title="Выбор тендера">
          <Space size="middle">
            <Select
              style={{ width: 400 }}
              placeholder="Выберите тендер для тестирования"
              loading={loadingTenders}
              value={selectedTenderId}
              onChange={setSelectedTenderId}
              options={tenders}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={runTests}
              loading={loading}
              disabled={!selectedTenderId}
            >
              Запустить тесты
            </Button>
          </Space>
        </Card>

        {/* Ошибка */}
        {error && (
          <Alert
            message="Ошибка тестирования"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Загрузка */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>Выполняется тестирование...</Text>
              </div>
            </div>
          </Card>
        )}

        {/* Результаты базовой верификации */}
        {verificationResult && (
          <Card
            title={
              <Space>
                <CalculatorOutlined />
                <span>Базовая верификация расчётов</span>
                {verificationResult.passed ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>PASSED</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>FAILED</Tag>
                )}
              </Space>
            }
          >
            <Descriptions bordered size="small" column={4}>
              <Descriptions.Item label="Всего тестов">
                {verificationResult.totalTests}
              </Descriptions.Item>
              <Descriptions.Item label="Успешно">
                <Text type="success">{verificationResult.passedTests}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Провалено">
                <Text type="danger">{verificationResult.failures.length}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Время выполнения">
                {verificationResult.executionTime.toFixed(2)} мс
              </Descriptions.Item>
            </Descriptions>

            {verificationResult.failures.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="Провалившиеся тесты"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {verificationResult.failures.map((f, i) => (
                        <li key={i}>
                          <Text strong>{f.testName}</Text>: ожидалось {f.expected}, получено {f.actual}
                          (разница: {f.difference.toFixed(4)})
                        </li>
                      ))}
                    </ul>
                  }
                  type="error"
                />
              </div>
            )}
          </Card>
        )}

        {/* Результаты агрегации */}
        {aggregation && (
          <>
            {/* Общая статистика */}
            <Card title="Общая статистика агрегации">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="BOQ элементов"
                    value={boqItemsCount}
                    prefix={<InfoCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="База (прямые затраты)"
                    value={aggregation.totalBaseAmount}
                    precision={2}
                    suffix="₽"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Итого коммерческая"
                    value={aggregation.totalCommercialCost}
                    precision={2}
                    suffix="₽"
                    valueStyle={{ color: '#10b981' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Сумма наценок"
                    value={aggregation.totalMarkupAmount}
                    precision={2}
                    suffix="₽"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Тактика"
                    value={tacticName}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Параметров наценок"
                    value={aggregation.byParameter.size}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Коэфф. наценки"
                    value={aggregation.totalBaseAmount > 0
                      ? ((aggregation.totalCommercialCost / aggregation.totalBaseAmount - 1) * 100).toFixed(2)
                      : 0
                    }
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Прямые затраты */}
            <Card title="Прямые затраты по типам">
              <Table
                dataSource={getDirectCostsData()}
                columns={directCostsColumns}
                pagination={false}
                size="small"
                rowClassName={(record) => record.type === 'total' ? 'total-row' : ''}
              />
            </Card>

            {/* Таблица параметров */}
            <Card
              title={
                <Space>
                  <span>Детализация по параметрам наценок</span>
                  <Tooltip title="Сумма наценок, агрегированная по каждому параметру из тактики. Это значение должно соответствовать данным в таблице финансовых показателей.">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
            >
              <Table
                dataSource={getParameterTableData()}
                columns={parameterColumns}
                pagination={false}
                size="small"
                summary={() => {
                  const total = getParameterTableData().reduce((sum, row) => sum + row.aggregatedValue, 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>ИТОГО наценок</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong style={{ color: '#10b981' }}>
                          {total.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} colSpan={2} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>

            {/* Сверка с ключевыми параметрами */}
            <Card title="Сверка ключевых параметров для Financial Indicators">
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Эти значения используются в таблице финансовых показателей.
                Названия берутся из справочника markup_parameters.
              </Paragraph>
              <Descriptions bordered size="small" column={2}>
                {[
                  'mechanization_service',
                  'mbp_gsm',
                  'warranty_period',
                  'works_16_markup',
                  'works_cost_growth',
                  'material_cost_growth',
                  'subcontract_works_cost_growth',
                  'subcontract_materials_cost_growth',
                  'contingency_costs',
                  'overhead_own_forces',
                  'overhead_subcontract',
                  'general_costs_without_subcontract',
                  'profit_own_forces',
                  'profit_subcontract',
                  'nds_22',
                ].map(key => {
                  const value = getMarkupByParameter(aggregation, key);
                  const label = parameterLabels.get(key) || key;
                  const isNegative = value < 0;
                  return (
                    <Descriptions.Item
                      key={key}
                      label={<Tooltip title={key}><span>{label}</span></Tooltip>}
                    >
                      <Text style={{ color: isNegative ? '#ef4444' : value > 0 ? '#10b981' : undefined }}>
                        {value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                        {isNegative && ' ⚠️'}
                      </Text>
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </Card>
          </>
        )}
      </Space>

      <style>{`
        .total-row {
          background-color: #f6ffed !important;
          font-weight: bold;
        }
        .total-row td {
          background-color: #f6ffed !important;
        }
      `}</style>
    </div>
  );
};

export default Test;
