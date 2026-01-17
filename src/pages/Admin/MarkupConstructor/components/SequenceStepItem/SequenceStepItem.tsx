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

  // Получить информацию о наценке
  const getOperandInfo = () => {
    if (step.operand1Type === 'markup' && step.operand1Key) {
      const markup = parameters.markupParameters.find((p) => p.key === step.operand1Key);
      if (markup) {
        return {
          label: markup.label,
          value: markup.default_value || 0,
          type: 'markup',
        };
      }
    } else if (step.operand1Type === 'number' && step.operand1Key) {
      return {
        label: String(step.operand1Key),
        value: step.operand1Key as number,
        type: 'number',
      };
    }
    return null;
  };

  const operandInfo = getOperandInfo();

  // Получить символ операции
  const getActionSymbol = () => {
    switch (step.action1) {
      case 'multiply':
        return '×';
      case 'add':
        return '+';
      case 'subtract':
        return '−';
      case 'divide':
        return '÷';
      default:
        return '×';
    }
  };

  // Построить формулу для отображения
  const formula = buildFormula(
    step,
    baseName,
    parameters.markupParameters,
    form,
    []
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
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditedName(step.name || '');
                  setIsEditingName(true);
                }}
                type="text"
                title="Редактировать название"
              />
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

        {/* Название и формула */}
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* Название с тегом наценки */}
          <Space wrap>
            {step.name && <Tag color="green">{step.name}</Tag>}
            {operandInfo && operandInfo.type === 'markup' && (
              <Tag color="green">
                {operandInfo.label} ({operandInfo.value}%)
              </Tag>
            )}
            {operandInfo && operandInfo.type === 'number' && (
              <Tag color="blue">{getActionSymbol()} {operandInfo.value}</Tag>
            )}
          </Space>

          {/* Формула расчета */}
          <div style={{ padding: '8px 12px', background: 'rgba(245, 245, 245, 0.5)', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formula}
            </Text>
          </div>
        </Space>

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
