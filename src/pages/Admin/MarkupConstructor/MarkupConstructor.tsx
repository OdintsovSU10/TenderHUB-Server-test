/**
 * Конструктор наценок - рефакторенная версия
 * Использует хуки и компоненты для управления состоянием
 */

import React, { useState, useEffect } from 'react';
import { Tabs, App, Modal, Input, message, Card, Space, Typography, Tag, Button } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
import { useMarkupTactics, useMarkupParameters, useMarkupSequences, usePricingDistribution, useBaseCosts } from './hooks';
import { TabKey } from './types';
import { MarkupConstructorProvider } from './MarkupConstructorContext';
import {
  TacticsList,
  SequenceTab,
  BasePercentagesTab,
  BasePercentagesForm,
  PricingTab,
} from './components';
import './MarkupConstructor.css';
import { Form } from 'antd';

const MarkupConstructor: React.FC = () => {
  const [form] = Form.useForm();
  const { modal } = App.useApp();
  const [mainActiveTab, setMainActiveTab] = useState('tactics');
  const [sequenceActiveTab, setSequenceActiveTab] = useState<TabKey>('works');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTacticName, setNewTacticName] = useState('');
  const [isTacticSelected, setIsTacticSelected] = useState(false);

  // Хуки для управления состоянием
  const tactics = useMarkupTactics();
  const parameters = useMarkupParameters();
  const sequences = useMarkupSequences();
  const pricing = usePricingDistribution();
  const baseCosts = useBaseCosts();

  // Загрузка тактик и параметров при монтировании
  useEffect(() => {
    tactics.fetchTactics();
    parameters.fetchParameters();
  }, []);

  // Обработчик создания новой тактики
  const handleCreateNew = () => {
    setNewTacticName('');
    setIsCreateModalOpen(true);
  };

  // Обработчик подтверждения создания
  const handleCreateConfirm = async () => {
    if (!newTacticName.trim()) {
      message.warning('Введите название схемы');
      return;
    }

    await tactics.createNewTactic(null, newTacticName, (tacticId) => {
      tactics.setSelectedTacticId(tacticId);
      tactics.setCurrentTacticId(tacticId);
      tactics.setCurrentTacticName(newTacticName);
      setIsTacticSelected(true);

      // Очистить последовательности
      sequences.setMarkupSequences({
        works: [],
        materials: [],
        subcontract_works: [],
        subcontract_materials: [],
        work_comp: [],
        material_comp: [],
      });

      // Очистить базовые стоимости
      baseCosts.resetAllBaseCosts();
    });

    setIsCreateModalOpen(false);
    message.success('Схема наценок создана');
  };

  // Обработчик выбора тактики
  const handleSelectTactic = async (tacticId: string) => {
    tactics.setSelectedTacticId(tacticId);
    tactics.setCurrentTacticId(tacticId);

    // Найти название тактики
    const tactic = tactics.tactics.find(t => t.id === tacticId);
    if (tactic) {
      tactics.setCurrentTacticName(tactic.name || '');

      // Загрузить последовательности наценок для тактики
      await sequences.fetchSequences(tacticId);

      // Загрузить базовые стоимости для тактики
      await baseCosts.fetchBaseCosts(tacticId);

      // Загрузить распределение ценообразования (если есть)
      await pricing.fetchPricing(tacticId);

      setIsTacticSelected(true);
    }
  };

  // Обработчик возврата к списку схем
  const handleBackToList = () => {
    setIsTacticSelected(false);
    tactics.setCurrentTacticId(null);
    tactics.setCurrentTacticName('');
  };

  // Context value
  const contextValue = {
    tactics,
    parameters,
    sequences,
    pricing,
    baseCosts,
    form,
  };

  return (
    <MarkupConstructorProvider value={contextValue}>
      <div style={{ minHeight: '100%', overflow: 'visible' }} className="markup-constructor">
        <Tabs
          activeKey={mainActiveTab}
          onChange={setMainActiveTab}
          items={[
            {
              key: 'tactics',
              label: 'Порядок применения наценок',
              children: (
                <div style={{ minHeight: '100%', overflow: 'visible' }}>
                  {!isTacticSelected ? (
                    // Список схем наценок
                    <TacticsList
                      tactics={tactics.tactics}
                      loading={tactics.loadingTactics}
                      searchText={tactics.tacticSearchText}
                      onSearchChange={tactics.setTacticSearchText}
                      onCreateNew={handleCreateNew}
                      onSelectTactic={handleSelectTactic}
                    />
                  ) : (
                    // Редактор схемы с подвкладками
                    <div>
                      {/* Кнопка назад */}
                      <div style={{ marginBottom: 16 }}>
                        <Button
                          type="link"
                          icon={<ArrowLeftOutlined />}
                          onClick={handleBackToList}
                          style={{ paddingLeft: 0 }}
                        >
                          К списку схем
                        </Button>
                      </div>

                      {/* Заголовок схемы */}
                      <Card
                        size="small"
                        style={{ marginBottom: 16, background: 'transparent' }}
                        bordered={true}
                        extra={
                          <Space>
                            <Button icon={<CopyOutlined />}>
                              Сделать копию
                            </Button>
                            <Button type="primary" icon={<SaveOutlined />}>
                              Сохранить
                            </Button>
                          </Space>
                        }
                      >
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>
                              {tactics.currentTacticName}
                            </Title>
                            {tactics.tactics.find(t => t.id === tactics.currentTacticId)?.is_global && (
                              <Tag color="gold">глобальная</Tag>
                            )}
                            <Button type="text" size="small" icon={<EditOutlined />} />
                          </Space>
                          <Text type="secondary">
                            Настройте последовательность расчета для каждого типа позиций
                          </Text>
                        </Space>
                      </Card>

                      {/* Панель базовых процентов наценок */}
                      {parameters.markupParameters.length > 0 && (
                        <Card
                          size="small"
                          title={<Text strong>Базовые проценты наценок</Text>}
                          style={{ marginBottom: 16, background: 'transparent' }}
                          bordered={true}
                        >
                          <Space wrap size="small">
                            {parameters.markupParameters.map((param, index) => (
                              <Tag key={param.id} color="blue">
                                {index + 1}. {param.label}: <Text strong>{param.default_value || 0}%</Text>
                              </Tag>
                            ))}
                          </Space>
                        </Card>
                      )}

                      {/* Подвкладки для разных типов */}
                      <Tabs
                        activeKey={sequenceActiveTab}
                        onChange={(key) => setSequenceActiveTab(key as TabKey)}
                        items={[
                          {
                            key: 'works',
                            label: 'Работы',
                            children: <SequenceTab tabKey="works" />,
                          },
                          {
                            key: 'materials',
                            label: 'Материалы',
                            children: <SequenceTab tabKey="materials" />,
                          },
                          {
                            key: 'subcontract_works',
                            label: 'Субподрядные работы',
                            children: <SequenceTab tabKey="subcontract_works" />,
                          },
                          {
                            key: 'subcontract_materials',
                            label: 'Субподрядные материалы',
                            children: <SequenceTab tabKey="subcontract_materials" />,
                          },
                          {
                            key: 'work_comp',
                            label: 'Раб-комп',
                            children: <SequenceTab tabKey="work_comp" />,
                          },
                          {
                            key: 'material_comp',
                            label: 'Мат-комп',
                            children: <SequenceTab tabKey="material_comp" />,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'base_percentages',
              label: 'Базовые проценты',
              children: <BasePercentagesForm />,
            },
            {
              key: 'parameters',
              label: 'Управление параметрами',
              children: <BasePercentagesTab />,
            },
            {
              key: 'pricing',
              label: 'Ценообразование',
              children: <PricingTab />,
            },
          ]}
        />

        {/* Modal для создания новой тактики */}
        <Modal
          title="Создать новую схему наценок"
          open={isCreateModalOpen}
          onOk={handleCreateConfirm}
          onCancel={() => setIsCreateModalOpen(false)}
          okText="Создать"
          cancelText="Отмена"
        >
          <Input
            placeholder="Введите название схемы"
            value={newTacticName}
            onChange={(e) => setNewTacticName(e.target.value)}
            onPressEnter={handleCreateConfirm}
            autoFocus
          />
        </Modal>
      </div>
    </MarkupConstructorProvider>
  );
};

export default MarkupConstructor;
