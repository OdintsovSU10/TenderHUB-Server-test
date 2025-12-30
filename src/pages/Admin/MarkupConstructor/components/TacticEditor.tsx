import React from 'react';
import { Button, Input, Space, Typography, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface TacticEditorHeaderProps {
  currentTacticName: string;
  isEditingName: boolean;
  editingName: string;
  canDelete: boolean;
  isGlobal?: boolean;
  onBackToList: () => void;
  onStartEditingName: () => void;
  onSaveName: () => void;
  onCancelEditingName: () => void;
  onEditingNameChange: (value: string) => void;
  onCopyTactic: () => void;
  onDeleteTactic: () => void;
  onSaveTactic: () => void;
}

export const TacticEditorHeader: React.FC<TacticEditorHeaderProps> = ({
  currentTacticName,
  isEditingName,
  editingName,
  canDelete,
  isGlobal,
  onBackToList,
  onStartEditingName,
  onSaveName,
  onCancelEditingName,
  onEditingNameChange,
  onCopyTactic,
  onDeleteTactic,
  onSaveTactic,
}) => {
  return (
    <div
      style={{
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 1, maxWidth: '400px' }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Button type="primary" icon={<ArrowLeftOutlined />} onClick={onBackToList}>
            К списку схем
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            {isEditingName ? (
              <Input
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onPressEnter={onSaveName}
                style={{ flex: 1 }}
                suffix={
                  <Space size={4}>
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={onSaveName}
                      style={{ color: '#52c41a' }}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={onCancelEditingName}
                    />
                  </Space>
                }
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {currentTacticName || 'Новая схема'}
                </Title>
                {isGlobal && (
                  <Tag color="gold" style={{ margin: 0 }}>
                    глобальная
                  </Tag>
                )}
                <Button type="text" size="small" icon={<EditOutlined />} onClick={onStartEditingName} />
              </div>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Настройте последовательность расчета для каждого типа позиций
          </Text>
        </Space>
      </div>
      <Space>
        <Button icon={<CopyOutlined />} onClick={onCopyTactic}>
          Сделать копию
        </Button>
        {canDelete && (
          <Button danger icon={<DeleteOutlined />} onClick={onDeleteTactic}>
            Удалить
          </Button>
        )}
        <Button type="primary" icon={<SaveOutlined />} onClick={onSaveTactic}>
          Сохранить
        </Button>
      </Space>
    </div>
  );
};
