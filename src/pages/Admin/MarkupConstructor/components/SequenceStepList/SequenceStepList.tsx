/**
 * Компонент для отображения списка шагов наценки
 */

import { Space, Typography, theme } from 'antd';
import { TabKey } from '../../types';
import { useMarkupConstructorContext } from '../../MarkupConstructorContext';
import { useMarkupCalculator } from '../../hooks';
import { SequenceStepItem } from '../SequenceStepItem';
import { formatCurrency } from '../../utils';

const { Text } = Typography;

export interface SequenceStepListProps {
  tabKey: TabKey;
}

export const SequenceStepList = ({ tabKey }: SequenceStepListProps) => {
  const { token } = theme.useToken();
  const { sequences, baseCosts } = useMarkupConstructorContext();
  const { intermediateResults } = useMarkupCalculator(tabKey);

  const {
    markupSequences,
    updateStep,
    deleteStep,
    moveStepUp,
    moveStepDown,
  } = sequences;

  const sequence = markupSequences[tabKey] || [];
  const baseCost = baseCosts.baseCosts[tabKey] || 0;

  // Обработчик обновления имени шага
  const handleUpdateStepName = (index: number, newName: string) => {
    const step = sequence[index];
    updateStep(tabKey, index, { ...step, name: newName });
  };

  // Обработчик редактирования шага
  const handleEditStep = (index: number) => {
    // TODO: Implement edit step modal/form
    console.log('Edit step:', index);
  };

  // Обработчик удаления шага
  const handleDeleteStep = (index: number) => {
    deleteStep(tabKey, index);
  };

  // Обработчик перемещения вверх
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveStepUp(tabKey, index);
    }
  };

  // Обработчик перемещения вниз
  const handleMoveDown = (index: number) => {
    if (index < sequence.length - 1) {
      moveStepDown(tabKey, index);
    }
  };

  // Если нет шагов, показываем сообщение
  if (sequence.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '16px',
          color: token.colorTextTertiary,
        }}
      >
        Наценки не добавлены. Используйте форму ниже для добавления наценок.
      </div>
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* Базовая стоимость */}
      <div
        style={{
          padding: '12px 16px',
          background: token.colorFillQuaternary,
          borderRadius: '4px',
          fontWeight: 500,
          fontSize: '15px',
        }}
      >
        Базовая стоимость:{' '}
        <Text type="success">{formatCurrency(baseCost)} ₽</Text>
      </div>

      {/* Список шагов */}
      {sequence.map((step, index) => {
        const intermediateResult = intermediateResults[index] || baseCost;

        // Определить базовое значение для этого шага
        let baseValue: number;
        let baseName: string;

        if (step.baseIndex === -1) {
          baseValue = baseCost;
          baseName = 'Базовая';
        } else {
          baseValue = intermediateResults[step.baseIndex] || baseCost;
          baseName = sequence[step.baseIndex]?.name || `Пункт ${step.baseIndex + 1}`;
        }

        return (
          <SequenceStepItem
            key={index}
            step={step}
            index={index}
            intermediateResult={intermediateResult}
            baseValue={baseValue}
            baseName={baseName}
            onEdit={() => handleEditStep(index)}
            onDelete={() => handleDeleteStep(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onUpdateName={(newName) => handleUpdateStepName(index, newName)}
            isFirst={index === 0}
            isLast={index === sequence.length - 1}
          />
        );
      })}

      {/* Финальный результат */}
      <div
        style={{
          padding: '12px 16px',
          background: token.colorSuccessBg,
          border: `2px solid ${token.colorSuccess}`,
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '16px',
        }}
      >
        Итоговая стоимость:{' '}
        <Text type="success" style={{ fontSize: '18px' }}>
          {formatCurrency(intermediateResults[intermediateResults.length - 1] || baseCost)} ₽
        </Text>
      </div>
    </Space>
  );
};
