import React, { useState } from 'react';
import { Card, Button, Space, Typography, Table, Input, App, Modal, Form, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ArrowUpOutlined, ArrowDownOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { MarkupParameter } from '../../../../lib/supabase';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';

const { Title, Text } = Typography;

export const BasePercentagesTab: React.FC = () => {
  const { modal } = App.useApp();
  const { parameters, tactics } = useMarkupConstructorContext();
  const [editingParameterId, setEditingParameterId] = useState<string | null>(null);
  const [editingParameterLabel, setEditingParameterLabel] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newParameterForm] = Form.useForm();

  // Обработчик добавления нового параметра
  const handleAddParameter = () => {
    setIsAddModalOpen(true);
    newParameterForm.resetFields();
  };

  // Обработчик подтверждения добавления
  const handleAddConfirm = async () => {
    try {
      const values = await newParameterForm.validateFields();

      await parameters.addParameter({
        label: values.label,
        key: values.key,
        default_value: values.default_value || 0,
      });

      setIsAddModalOpen(false);
      newParameterForm.resetFields();
    } catch (error) {
      console.error('Error adding parameter:', error);
    }
  };

  // Обработчик удаления параметра
  const handleDeleteParameter = (id: string, label: string) => {
    modal.confirm({
      title: 'Удалить параметр наценки?',
      content: `Вы действительно хотите удалить параметр "${label}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        await parameters.deleteParameter(id);
        message.success('Параметр удален');
      },
    });
  };

  // Обработчик начала редактирования
  const handleStartEditing = (id: string, label: string) => {
    setEditingParameterId(id);
    setEditingParameterLabel(label);
  };

  // Обработчик сохранения редактирования
  const handleSaveEditing = async () => {
    if (!editingParameterId || !editingParameterLabel.trim()) {
      return;
    }

    await parameters.updateParameter(editingParameterId, {
      label: editingParameterLabel.trim(),
    });

    setEditingParameterId(null);
    setEditingParameterLabel('');
    message.success('Параметр обновлен');
  };

  // Обработчик отмены редактирования
  const handleCancelEditing = () => {
    setEditingParameterId(null);
    setEditingParameterLabel('');
  };

  // Обработчик изменения порядка
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    await parameters.reorderParameters(id, direction);
  };

  const columns = [
    {
      title: '№',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Название параметра',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: MarkupParameter) => {
        if (editingParameterId === record.id) {
          return (
            <Input
              value={editingParameterLabel}
              onChange={(e) => setEditingParameterLabel(e.target.value)}
              onPressEnter={handleSaveEditing}
              autoFocus
              suffix={
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={handleSaveEditing}
                    style={{ color: '#52c41a' }}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleCancelEditing}
                  />
                </Space>
              }
            />
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>{text}</Text>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartEditing(record.id, text)}
            />
          </div>
        );
      },
    },
    {
      title: 'Ключ',
      dataIndex: 'key',
      key: 'key',
      width: 150,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Порядок',
      width: 120,
      render: (_: any, record: MarkupParameter, index: number) => (
        <Space>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => handleReorder(record.id, 'up')}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === parameters.markupParameters.length - 1}
            onClick={() => handleReorder(record.id, 'down')}
          />
        </Space>
      ),
    },
    {
      title: 'Действия',
      width: 100,
      render: (_: any, record: MarkupParameter) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteParameter(record.id, record.label)}
        >
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              Управление параметрами наценок
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Глобальный справочник параметров наценок для использования в схемах
            </Text>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddParameter}>
            Добавить параметр
          </Button>
        }
      >
        <Table
          dataSource={parameters.markupParameters}
          columns={columns}
          rowKey="id"
          pagination={false}
          loading={parameters.loadingParameters}
          locale={{ emptyText: 'Нет параметров наценок' }}
        />
      </Card>

      {/* Modal для добавления параметра */}
      <Modal
        title="Добавить параметр наценки"
        open={isAddModalOpen}
        onOk={handleAddConfirm}
        onCancel={() => setIsAddModalOpen(false)}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={newParameterForm} layout="vertical">
          <Form.Item
            name="label"
            label="Название"
            rules={[{ required: true, message: 'Введите название параметра' }]}
          >
            <Input placeholder="Например: НДС" />
          </Form.Item>
          <Form.Item
            name="key"
            label="Ключ (уникальный идентификатор)"
            rules={[
              { required: true, message: 'Введите ключ' },
              { pattern: /^[a-z_]+$/, message: 'Только строчные латинские буквы и подчеркивание' }
            ]}
          >
            <Input placeholder="Например: vat" />
          </Form.Item>
          <Form.Item
            name="default_value"
            label="Значение по умолчанию (%)"
          >
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
