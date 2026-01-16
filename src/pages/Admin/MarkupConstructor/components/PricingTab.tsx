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
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5} style={{ marginTop: 0 }}>
              Распределение затрат между материалами и работами (КП)
            </Title>
            <Text type="secondary">
              Настройте, как базовые затраты и наценки распределяются между материалами и
              работами (КП) для схемы наценок "{tactics.currentTacticName}"
            </Text>
          </div>

          <div style={{ padding: '24px', background: '#f5f5f5', borderRadius: 8 }}>
            <Space direction="vertical" size="middle">
              <Text strong>📋 Функционал ценообразования</Text>
              <div>
                <Text type="secondary">
                  Эта функция позволяет настроить распределение затрат для разных типов элементов
                  (материалы, работы, субподряд).
                </Text>
              </div>
              <div>
                <Text type="secondary">
                  <strong>Статус:</strong> Требуется доработка схемы БД для привязки pricing
                  distribution к тактикам (сейчас привязано к тендерам).
                </Text>
              </div>
              <div>
                <Text type="secondary">
                  Для полной реализации нужно добавить <code>tactic_id</code> в таблицу{' '}
                  <code>tender_pricing_distribution</code> или хранить настройки в JSONB поле
                  внутри <code>markup_tactics</code>.
                </Text>
              </div>
            </Space>
          </div>
        </Space>
      )}
    </Card>
  );
};
