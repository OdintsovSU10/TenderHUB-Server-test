/**
 * Компонент для отображения одного шага наценки в последовательности
 */

import { useState } from 'react';
import { Card, Space, Button, Typography, Input, Popconfirm, Tag } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { MarkupStep } from '../../types';
import { buildFormula, formatCurrency } from '../../utils';
import { useMarkupConstructorContext } from '../../MarkupConstructorContext';

const { Text } = Typography;

export interface SequenceStepItemProps {
  step: MarkupStep;
  index: number;
  intermediateResult: number;
  baseValue: number;
  baseName: string;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateName: (newName: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const SequenceStepItem = ({
  step,
  index,
  intermediateResult,
  baseValue,
  baseName,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateName,
  isFirst,
  isLast,
}: SequenceStepItemProps) => {
  const { parameters, sequences, form } = useMarkupConstructorContext();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(step.name || '');

  // Построить формулу для отображения
  const formula = buildFormula(
    step,
    baseName,
    parameters.markupParameters,
    form,
    sequences.markupSequences[step.tender_id as any] || []
  );

  // Обработчик сохранения имени
  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateName(editedName.trim());
      setIsEditingName(false);
    }
  };

  // Обработчик отмены редактирования имени
  const handleCancelEdit = () => {
    setEditedName(step.name || '');
    setIsEditingName(false);
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderLeft: '4px solid #10b981',
      }}
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Заголовок шага */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Tag color="blue">Пункт {index + 1}</Tag>
            {isEditingName ? (
              <Space.Compact>
                <Input
                  size="small"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onPressEnter={handleSaveName}
                  style={{ width: 200 }}
                  autoFocus
                />
                <Button
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSaveName}
                  type="primary"
                />
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                />
              </Space.Compact>
            ) : (
              <Space>
                <Text strong>{step.name || `Пункт ${index + 1}`}</Text>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditedName(step.name || '');
                    setIsEditingName(true);
                  }}
                  type="text"
                />
              </Space>
            )}
          </Space>

          {/* Кнопки действий */}
          <Space size="small">
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={onMoveUp}
              disabled={isFirst}
              title="Переместить вверх"
            />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={onMoveDown}
              disabled={isLast}
              title="Переместить вниз"
            />
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
              title="Редактировать"
            />
            <Popconfirm
              title="Удалить пункт?"
              description="Это действие нельзя отменить"
              onConfirm={onDelete}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                title="Удалить"
              />
            </Popconfirm>
          </Space>
        </Space>

        {/* Формула */}
        <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Формула:
          </Text>
          <br />
          <Text code style={{ fontSize: 13 }}>
            {formula}
          </Text>
        </div>

        {/* Результат */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text type="secondary">База:</Text>
            <Text strong>{formatCurrency(baseValue)} ₽</Text>
          </Space>
          <Space>
            <Text type="secondary">Результат:</Text>
            <Text strong style={{ color: '#10b981', fontSize: 15 }}>
              {formatCurrency(intermediateResult)} ₽
            </Text>
          </Space>
        </Space>
      </Space>
    </Card>
  );
};
