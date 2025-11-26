import React from 'react';
import {
  Collapse,
  Alert,
  Table,
  Space,
  Button,
  Input,
  Form,
  Select,
  Typography,
  theme
} from 'antd';
import {
  WarningOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UnitMapping, ExistingUnit } from '../hooks/useBoqUpload';

const { Text } = Typography;
const { Panel } = Collapse;

interface MappingStepProps {
  unitMappings: UnitMapping[];
  existingUnits: ExistingUnit[];
  unknownUnitsCount: number;
  onMappingChange: (originalCode: string, value: string, action: 'map' | 'create') => void;
  onCreateUnit: (originalCode: string, values: { name: string; description?: string }) => Promise<void>;
}

export const MappingStep: React.FC<MappingStepProps> = ({
  unitMappings,
  existingUnits,
  unknownUnitsCount,
  onMappingChange,
  onCreateUnit,
}) => {
  const { token } = theme.useToken();
  const [newUnitForm] = Form.useForm();

  const handleCreateUnitClick = async (originalCode: string) => {
    try {
      const values = await newUnitForm.validateFields();
      await onCreateUnit(originalCode, values);
      newUnitForm.resetFields();
    } catch (error) {
      console.error('Ошибка валидации формы:', error);
    }
  };

  const mappingColumns: ColumnsType<UnitMapping> = [
    {
      title: 'Исходная единица',
      dataIndex: 'originalCode',
      key: 'originalCode',
      width: 150,
      render: (code: string) => <Text strong code>{code}</Text>
    },
    {
      title: 'Сопоставить с',
      key: 'mapping',
      render: (_: unknown, record: UnitMapping) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Выберите существующую единицу"
            value={record.action === 'map' ? record.mappedCode : undefined}
            onChange={(value) => onMappingChange(record.originalCode, value, 'map')}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={existingUnits.map(u => ({
              value: u.code,
              label: `${u.code} - ${u.name}`
            }))}
          />
          <Space>
            <Button
              size="small"
              type={record.action === 'create' ? 'primary' : 'default'}
              icon={<PlusOutlined />}
              onClick={() => onMappingChange(record.originalCode, record.originalCode, 'create')}
            >
              Создать новую
            </Button>
            {record.action === 'create' && (
              <Button
                size="small"
                onClick={() => onMappingChange(record.originalCode, '', 'map')}
              >
                Отмена
              </Button>
            )}
          </Space>
          {record.action === 'create' && (
            <Form
              form={newUnitForm}
              layout="vertical"
              size="small"
              style={{
                marginTop: 8,
                padding: 12,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius
              }}
            >
              <Form.Item
                label="Код единицы"
                help={`Будет использован код: ${record.originalCode}`}
              >
                <Input value={record.originalCode} disabled />
              </Form.Item>
              <Form.Item
                name="name"
                label="Полное наименование"
                rules={[{ required: true, message: 'Введите наименование' }]}
              >
                <Input placeholder="Например: штуки, метры и т.д." />
              </Form.Item>
              <Form.Item
                name="description"
                label="Описание (опционально)"
              >
                <Input.TextArea rows={2} placeholder="Дополнительная информация" />
              </Form.Item>
              <Button
                type="primary"
                size="small"
                onClick={() => handleCreateUnitClick(record.originalCode)}
              >
                Сохранить единицу
              </Button>
            </Form>
          )}
        </Space>
      )
    }
  ];

  if (unknownUnitsCount === 0) {
    return null;
  }

  return (
    <Collapse defaultActiveKey={['1']}>
      <Panel
        header={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <Text strong>
              Требуется настроить {unknownUnitsCount} единиц измерения
            </Text>
          </Space>
        }
        key="1"
      >
        <Alert
          message="Обнаружены неизвестные единицы измерения"
          description="Для каждой единицы выберите существующую из списка или создайте новую"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={mappingColumns}
          dataSource={unitMappings}
          rowKey="originalCode"
          pagination={false}
          size="small"
        />
      </Panel>
    </Collapse>
  );
};
