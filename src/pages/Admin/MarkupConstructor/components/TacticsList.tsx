import React from 'react';
import { Button, Input, List, Card, Space, Typography, Spin, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { MarkupTactic } from '../../../../lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TacticsListProps {
  tactics: MarkupTactic[];
  loading: boolean;
  searchText: string;
  onSearchChange: (value: string) => void;
  onCreateNew: () => void;
  onSelectTactic: (tacticId: string) => void;
}

export const TacticsList: React.FC<TacticsListProps> = ({
  tactics,
  loading,
  searchText,
  onSearchChange,
  onCreateNew,
  onSelectTactic,
}) => {
  const { token } = theme.useToken();

  const filteredTactics = tactics
    .filter(t => !searchText || t.name?.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => {
      // Сортировка по дате создания (новые первыми)
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Схемы наценок
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Выберите схему для редактирования или создайте новую
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateNew}
          size="large"
        >
          Создать новую схему
        </Button>
      </div>

      <Input
        placeholder="Поиск по названию схемы..."
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        allowClear
        style={{ marginBottom: 16 }}
        prefix={<span style={{ color: token.colorTextTertiary }}>🔍</span>}
      />

      <Spin spinning={loading}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
          dataSource={filteredTactics}
          locale={{ emptyText: 'Нет доступных схем наценок. Создайте новую схему.' }}
          renderItem={(tactic) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => onSelectTactic(tactic.id)}
                style={{
                  height: '100%',
                  cursor: 'pointer',
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Title level={5} style={{ margin: 0, flex: 1 }}>
                      {tactic.name || 'Без названия'}
                    </Title>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tactic.created_at
                      ? `Создана: ${dayjs(tactic.created_at).format('DD.MM.YYYY')}`
                      : ''}
                  </Text>
                  {tactic.updated_at && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Обновлена: {dayjs(tactic.updated_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  )}
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Spin>
    </div>
  );
};
