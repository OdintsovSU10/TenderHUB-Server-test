import React from 'react';
import { Card, Button, Space, Typography, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PricingTabProps {
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const PricingTab: React.FC<PricingTabProps> = ({
  loading,
  saving,
  onSave,
  onReset,
}) => {
  if (loading) {
    return <Spin />;
  }

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Распределение ценообразования
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Настройте, как распределяются базовые и наценочные затраты
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            Сбросить к умолчанию
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
            Сохранить
          </Button>
        </Space>
      }
    >
      <Text type="secondary">
        Вкладка настройки ценообразования - в процессе рефакторинга
      </Text>
    </Card>
  );
};
