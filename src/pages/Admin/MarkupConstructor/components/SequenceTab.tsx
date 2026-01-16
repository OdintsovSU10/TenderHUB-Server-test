import React, { useState } from 'react';
import {
  Space,
  Typography,
  InputNumber,
  Divider,
  Button,
  Select,
  Card,
  Row,
  Col,
  Input,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TabKey, MarkupStep, ActionType, OperandType } from '../types';
import { ACTIONS, formatCurrency } from '../utils';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';
import { SequenceStepList } from './SequenceStepList';
import { useMarkupCalculator } from '../hooks';

const { Text } = Typography;
const { Option, OptGroup } = Select;

interface SequenceTabProps {
  tabKey: TabKey;
}

export const SequenceTab: React.FC<SequenceTabProps> = ({ tabKey }) => {
  const { sequences, parameters, baseCosts, form } = useMarkupConstructorContext();
  const { markupSequences, addStep } = sequences;
  const { markupParameters } = parameters;
  const { intermediateResults } = useMarkupCalculator(tabKey);

  const sequence = markupSequences[tabKey] || [];
  const baseCost = baseCosts.baseCosts[tabKey] || 0;

  // State for adding new step
  const [stepName, setStepName] = useState<string>('');
  const [baseIndex, setBaseIndex] = useState<number>(-1);
  const [action1, setAction1] = useState<ActionType>('multiply');
  const [operand1Value, setOperand1Value] = useState<string | number>('');
  const [operandMode, setOperandMode] = useState<'select' | 'number'>('select');

  const formatNumberWithSpaces = (value: number | undefined) => {
    if (!value) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const parseNumberWithSpaces = (value: string | undefined) => {
    if (!value) return 0;
    return parseFloat(value.replace(/\s/g, ''));
  };

  // Get available markups for select
  const availableMarkups = markupParameters.filter((p) => p.is_active);

  // Options for base index select
  const baseOptions = [
    { label: 'Базовая стоимость', value: -1 },
    ...sequence.map((step, index) => {
      const intermediateValue = intermediateResults[index] || baseCost;
      const stepLabel = step.name || `Пункт ${index + 1}`;
      return {
        label: `${stepLabel} (${formatCurrency(intermediateValue)} ₽)`,
        value: index,
      };
    }),
  ];

  // Options for operand select
  const operandOptions = (
    <>
      <OptGroup label="Наценки">
        {availableMarkups.map((markup) => (
          <Option key={`markup:${markup.key}`} value={`markup:${markup.key}`}>
            {markup.label} ({markup.default_value || 0}%)
          </Option>
        ))}
      </OptGroup>
      <OptGroup label="Базовая стоимость">
        <Option value="base:-1">Базовая стоимость ({formatCurrency(baseCost)} ₽)</Option>
      </OptGroup>
      {sequence.length > 0 && (
        <OptGroup label="Пункты">
          {sequence.map((step, index) => {
            const intermediateValue = intermediateResults[index] || baseCost;
            const stepLabel = step.name || `Пункт ${index + 1}`;
            return (
              <Option key={`step:${index}`} value={`step:${index}`}>
                {stepLabel} ({formatCurrency(intermediateValue)} ₽)
              </Option>
            );
          })}
        </OptGroup>
      )}
    </>
  );

  const handleAddStep = () => {
    if (!operand1Value) {
      return;
    }

    const newStep: MarkupStep = {
      name: stepName || undefined,
      baseIndex,
      action1,
      operand1Type: 'markup', // Default, will be overridden below
    };

    // Parse operand value
    if (typeof operand1Value === 'string') {
      const [type, value] = operand1Value.split(':');
      if (type === 'markup') {
        newStep.operand1Type = 'markup';
        newStep.operand1Key = value;
      } else if (type === 'step') {
        newStep.operand1Type = 'step';
        newStep.operand1Index = parseInt(value);
      } else if (type === 'base') {
        newStep.operand1Type = 'step';
        newStep.operand1Index = -1;
      }
    } else if (typeof operand1Value === 'number') {
      newStep.operand1Type = 'number';
      newStep.operand1Key = operand1Value;
    }

    addStep(tabKey, newStep);

    // Reset form
    setStepName('');
    setBaseIndex(-1);
    setAction1('multiply');
    setOperand1Value('');
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Base cost input */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: '4px' }}>
            Базовая (прямая) стоимость:
          </Text>
          <InputNumber
            value={baseCost}
            onChange={(value) => baseCosts.updateBaseCost(tabKey, value || 0)}
            style={{ width: '300px' }}
            min={0}
            step={0.01}
            precision={2}
            addonAfter="₽"
            placeholder="Введите базовую стоимость"
            formatter={formatNumberWithSpaces}
            parser={parseNumberWithSpaces}
          />
        </div>

        <Divider style={{ margin: '0' }}>Порядок расчета</Divider>

        {/* Sequence list */}
        <SequenceStepList tabKey={tabKey} />

        <Divider style={{ margin: '0' }}>Добавить новый пункт</Divider>

        {/* Add new step form */}
        <Card size="small" title="Создание нового пункта расчета">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {/* Название пункта */}
            <div>
              <Text>Название пункта (опционально):</Text>
              <Input
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                placeholder="Например: Накладные расходы"
                style={{ marginTop: '4px' }}
              />
            </div>

            {/* Базовое значение и Действие */}
            <Row gutter={8}>
              <Col span={12}>
                <Text>Базовое значение:</Text>
                <Select
                  style={{ width: '100%', marginTop: '4px' }}
                  value={baseIndex}
                  onChange={setBaseIndex}
                  options={baseOptions}
                />
              </Col>
              <Col span={12}>
                <Text>Действие:</Text>
                <Select
                  style={{ width: '100%', marginTop: '4px' }}
                  value={action1}
                  onChange={setAction1}
                  options={ACTIONS.map((a) => ({ label: a.label, value: a.value }))}
                />
              </Col>
            </Row>

            {/* Операции */}
            <div>
              <Text>Операции:</Text>
              <div style={{ marginTop: '4px' }}>
                <Button.Group style={{ width: '100%' }}>
                  <Button
                    type={operandMode === 'select' ? 'primary' : 'default'}
                    onClick={() => {
                      setOperandMode('select');
                      setOperand1Value('');
                    }}
                    style={{ width: '50%' }}
                  >
                    Выбрать
                  </Button>
                  <Button
                    type={operandMode === 'number' ? 'primary' : 'default'}
                    onClick={() => {
                      setOperandMode('number');
                      setOperand1Value('');
                    }}
                    style={{ width: '50%' }}
                  >
                    Ввести число
                  </Button>
                </Button.Group>
              </div>
            </div>

            {/* Операнд - Select or InputNumber */}
            <div>
              {operandMode === 'select' ? (
                <>
                  <Text>Операнд:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '4px' }}
                    value={typeof operand1Value === 'string' ? operand1Value : undefined}
                    onChange={setOperand1Value}
                    placeholder="Выберите наценку или пункт"
                  >
                    {operandOptions}
                  </Select>
                </>
              ) : (
                <>
                  <Text>Введите число:</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: '4px' }}
                    value={typeof operand1Value === 'number' ? operand1Value : undefined}
                    onChange={(value) => setOperand1Value(value || 0)}
                    placeholder="Введите число"
                    step={0.01}
                    precision={2}
                  />
                </>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStep} block>
              Добавить пункт
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
};
