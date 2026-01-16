/**
 * Конструктор наценок - упрощенная версия
 * Использует хуки и компоненты для управления состоянием
 */

import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Form, Tabs, App, Modal, Input, message } from 'antd';
import { useMarkupTactics, useMarkupParameters, useMarkupSequences, usePricingDistribution, useBaseCosts } from './hooks';
import { TabKey } from './types';
import { MarkupConstructorProvider } from './MarkupConstructorContext';
import {
  TacticsList,
  SequenceTab,
  BasePercentagesTab,
  PricingTab,
} from './components';
import './MarkupConstructor.css';

const { Title } = Typography;

const MarkupConstructor: React.FC = () => {
  const [form] = Form.useForm();
  const { modal } = App.useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('works');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTacticName, setNewTacticName] = useState('');

  // Хуки для управления состоянием
  const tactics = useMarkupTactics();
  const parameters = useMarkupParameters();
  const sequences = useMarkupSequences();
  const pricing = usePricingDistribution();
  const baseCosts = useBaseCosts();

  // Загрузка тактик при монтировании
  useEffect(() => {
    tactics.fetchTactics();
  }, []);

  // Обработчик создания новой тактики
  const handleCreateNew = () => {
    setIsCreateModalOpen(true);
    setNewTacticName('');
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
    });

    setIsCreateModalOpen(false);
    setNewTacticName('');
  };

  // Обработчик выбора тактики
  const handleSelectTactic = async (tacticId: string) => {
    tactics.setSelectedTacticId(tacticId);
    tactics.setCurrentTacticId(tacticId);

    // Найти название тактики
    const tactic = tactics.tactics.find(t => t.id === tacticId);
    if (tactic) {
      tactics.setCurrentTacticName(tactic.name || '');

      // Загрузить параметры тактики
      await parameters.fetchParameters(tacticId);

      // Загрузить последовательности (если есть)
      // TODO: Implement loading sequences for tactic

      // Загрузить распределение ценообразования (если есть)
      await pricing.fetchPricing(tacticId);
    }
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
      <div style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Title level={2}>Конструктор наценок</Title>

            {/* Список тактик */}
            <TacticsList
              tactics={tactics.tactics}
              loading={tactics.loadingTactics}
              searchText={tactics.tacticSearchText}
              onSearchChange={tactics.setTacticSearchText}
              onCreateNew={handleCreateNew}
              onSelectTactic={handleSelectTactic}
            />

            {/* Вкладки (показываем только если выбрана тактика) */}
            {tactics.currentTacticId && (
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as TabKey)}
                items={[
                  {
                    key: 'parameters',
                    label: 'Параметры наценок',
                    children: <BasePercentagesTab />,
                  },
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
                    label: 'Работы (компонентные)',
                    children: <SequenceTab tabKey="work_comp" />,
                  },
                  {
                    key: 'material_comp',
                    label: 'Материалы (компонентные)',
                    children: <SequenceTab tabKey="material_comp" />,
                  },
                  {
                    key: 'pricing',
                    label: 'Ценообразование',
                    children: <PricingTab />,
                  },
                ]}
              />
            )}
          </Space>
        </Card>

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
