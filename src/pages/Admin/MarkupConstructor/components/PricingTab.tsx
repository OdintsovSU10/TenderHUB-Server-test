import React from 'react';
import { Card, Button, Space, Typography, Spin, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';

const { Title, Text } = Typography;

export const PricingTab: React.FC = () => {
  const { pricing, tactics } = useMarkupConstructorContext();

  // Обработчик сохранения
  const handleSave = async () => {
    if (!tactics.currentTacticId) {
      message.error('Не выбрана схема наценок');
      return;
    }

    await pricing.savePricing(tactics.currentTacticId);
    message.success('Настройки ценообразования сохранены');
  };

  // Обработчик сброса
  const handleReset = () => {
    pricing.resetPricing();
    message.info('Настройки сброшены к умолчанию');
  };

  if (pricing.loadingPricing) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Распределение ценообразования
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {tactics.currentTacticId
              ? `Настройки для схемы: ${tactics.currentTacticName}`
              : 'Выберите схему наценок для настройки ценообразования'}
          </Text>
        </Space>
      }
      extra={
        tactics.currentTacticId && (
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Сбросить к умолчанию
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={pricing.savingPricing}
              onClick={handleSave}
            >
              Сохранить
            </Button>
          </Space>
        )
      }
    >
      {!tactics.currentTacticId ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          Выберите схему наценок на вкладке "Порядок применения наценок"
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Здесь будут настройки распределения затрат между материалами и работами
          </Text>

          {pricing.pricingDistribution && (
            <div style={{ marginTop: 16 }}>
              <Text>Текущие настройки загружены для схемы: {tactics.currentTacticName}</Text>
            </div>
          )}
        </Space>
      )}
    </Card>
  );
};
