import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Tag, Typography, Upload, message, Progress, Modal, Form, Select, Popconfirm } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  FolderOutlined,
  FileOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { supabase } from '../../../lib/supabase';
import { costImportService } from '../../../services/costImportService';

const { Text } = Typography;
const { Option } = Select;

interface CategoryRecord {
  key: string;
  id: string;
  name: string;
  unit: string;
  type: 'category';
  description?: string;
  children?: DetailRecord[];
}

interface DetailRecord {
  key: string;
  id: string;
  name: string;
  unit: string;
  type: 'detail';
  description?: string;
  categoryId: string;
  locationId?: string;
  orderNum: number;
}

type CostRecord = CategoryRecord | DetailRecord;

const ConstructionCost: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CostRecord | null>(null);
  const [form] = Form.useForm();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const unitOptions = [
    'шт', 'м', 'м2', 'м3', 'кг', 'т', 'л', 'компл', 'м.п.'
  ];

  const unitColors: Record<string, string> = {
    'шт': 'blue',
    'м': 'green',
    'м2': 'cyan',
    'м3': 'purple',
    'кг': 'orange',
    'т': 'red',
    'л': 'magenta',
    'компл': 'volcano',
    'м.п.': 'geekblue',
  };

  // Загрузка данных из Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем категории
      const { data: categoryData, error: categoryError } = await supabase
        .from('cost_categories')
        .select('*')
        .order('name');

      if (categoryError) {
        console.error('Ошибка загрузки категорий:', categoryError);
        message.error('Ошибка загрузки данных');
        return;
      }

      // Загружаем детальные категории
      const { data: detailData, error: detailError } = await supabase
        .from('detail_cost_categories')
        .select('*')
        .order('order_num');

      if (detailError) {
        console.error('Ошибка загрузки деталей:', detailError);
        message.error('Ошибка загрузки данных');
        return;
      }

      // Группируем данные по категориям
      const groupedData: CategoryRecord[] = (categoryData || []).map((category: any) => {
        const details = (detailData || [])
          .filter((detail: any) => detail.cost_category_id === category.id)
          .map((detail: any) => ({
            key: `detail-${detail.id}`,
            id: detail.id,
            name: detail.name,
            unit: detail.unit,
            type: 'detail' as const,
            description: '', // Можно добавить поле в БД при необходимости
            categoryId: detail.cost_category_id,
            locationId: detail.location_id,
            orderNum: detail.order_num,
          }));

        return {
          key: `category-${category.id}`,
          id: category.id,
          name: category.name,
          unit: category.unit,
          type: 'category' as const,
          description: '', // Можно добавить поле в БД при необходимости
          children: details,
        };
      });

      setData(groupedData);
      // Раскрываем все категории по умолчанию
      setExpandedRowKeys(groupedData.map(cat => cat.key));
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      message.error('Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Функция обработки импорта Excel файла
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportProgress(0);

    try {
      const result = await costImportService.importFromExcel(file, (progress) => {
        setImportProgress(progress);
      });

      if (result.success) {
        message.success(`Импорт завершен! Добавлено ${result.recordsAdded} записей`);
        await fetchData();
      } else {
        message.error(result.error || 'Ошибка при импорте данных');
      }
    } catch (error) {
      console.error('Ошибка импорта:', error);
      message.error('Произошла ошибка при импорте');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }

    return false;
  };

  // Редактирование записи
  const handleEdit = (record: CostRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.name,
      unit: record.unit,
      description: record.description || '',
    });
    setEditModalVisible(true);
  };

  // Сохранение изменений
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!editingRecord) return;

      if (editingRecord.type === 'category') {
        // Обновляем категорию
        const { error } = await supabase
          .from('cost_categories')
          .update({
            name: values.name,
            unit: values.unit,
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
      } else {
        // Обновляем детальную категорию
        const { error } = await supabase
          .from('detail_cost_categories')
          .update({
            name: values.name,
            unit: values.unit,
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
      }

      message.success('Изменения сохранены');
      setEditModalVisible(false);
      form.resetFields();
      setEditingRecord(null);
      await fetchData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      message.error('Ошибка при сохранении изменений');
    }
  };

  // Удаление записи
  const handleDelete = async (record: CostRecord) => {
    try {
      if (record.type === 'category') {
        // Проверяем, есть ли дочерние элементы
        const category = record as CategoryRecord;
        if (category.children && category.children.length > 0) {
          message.warning('Нельзя удалить категорию с дочерними элементами');
          return;
        }

        // Удаляем категорию
        const { error } = await supabase
          .from('cost_categories')
          .delete()
          .eq('id', record.id);

        if (error) throw error;
      } else {
        // Удаляем детальную категорию
        const { error } = await supabase
          .from('detail_cost_categories')
          .delete()
          .eq('id', record.id);

        if (error) throw error;
      }

      message.success('Запись удалена');
      await fetchData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      message.error('Ошибка при удалении записи');
    }
  };

  // Фильтрация данных
  const filterData = (data: CategoryRecord[]): CategoryRecord[] => {
    if (!searchText) return data;

    return data.map(category => {
      const categoryMatches = category.name.toLowerCase().includes(searchText.toLowerCase());
      const filteredChildren = category.children?.filter(child =>
        child.name.toLowerCase().includes(searchText.toLowerCase())
      ) || [];

      if (categoryMatches || filteredChildren.length > 0) {
        return {
          ...category,
          children: categoryMatches ? category.children : filteredChildren
        };
      }
      return null;
    }).filter(Boolean) as CategoryRecord[];
  };

  const columns: ColumnsType<CostRecord> = [
    {
      title: 'Структура',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CostRecord) => {
        const isCategory = record.type === 'category';
        const Icon = isCategory ?
          (expandedRowKeys.includes(record.key) ? FolderOpenOutlined : FolderOutlined) :
          FileOutlined;

        return (
          <Space>
            <Icon style={{ color: isCategory ? '#1890ff' : '#666' }} />
            <Text strong={isCategory}>{text}</Text>
            {isCategory && (record as CategoryRecord).children && (
              <Text type="secondary">({(record as CategoryRecord).children?.length || 0})</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Тип элемента',
      key: 'type',
      width: 150,
      render: (_: any, record: CostRecord) => (
        <Tag color={record.type === 'category' ? 'blue' : 'green'}>
          {record.type === 'category' ? 'Категория' : 'Детализация'}
        </Tag>
      ),
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
      width: 150,
      align: 'center',
      render: (unit: string) => (
        <Tag color={unitColors[unit] || 'default'}>{unit}</Tag>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Text type="secondary">{text || 'Нет описания'}</Text>
      ),
    },
    {
      title: 'Действия',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_: any, record: CostRecord) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Вы уверены?"
            description={
              record.type === 'category' && (record as CategoryRecord).children?.length
                ? "Эта категория содержит дочерние элементы"
                : "Эта запись будет удалена безвозвратно"
            }
            onConfirm={() => handleDelete(record)}
            okText="Да"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredData = filterData(data);

  return (
    <div>
      <Card
        title="Затраты на строительство"
        extra={
          <Space>
            <Input
              placeholder="Поиск..."
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={loading}
            />
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleImport}
              disabled={importing}
            >
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                loading={importing}
              >
                Импорт затрат
              </Button>
            </Upload>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRecord(null);
                form.resetFields();
                setEditModalVisible(true);
              }}
            >
              Добавить
            </Button>
          </Space>
        }
      >
        {importing && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={importProgress} status="active" />
            <Text type="secondary">Импорт данных...</Text>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            rowExpandable: (record) =>
              record.type === 'category' &&
              !!(record as CategoryRecord).children?.length,
            indentSize: 40,
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} записей`,
          }}
          size="middle"
          locale={{
            emptyText: data.length === 0
              ? 'Нет данных. Используйте кнопку "Импорт затрат" для загрузки данных из Excel файла.'
              : 'Нет данных по запросу'
          }}
        />
      </Card>

      {/* Модальное окно редактирования */}
      <Modal
        title={editingRecord ? 'Редактирование' : 'Добавление'}
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
          setEditingRecord(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input placeholder="Введите наименование" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Единица измерения"
            rules={[{ required: true, message: 'Выберите единицу измерения' }]}
          >
            <Select placeholder="Выберите единицу измерения">
              {unitOptions.map(unit => (
                <Option key={unit} value={unit}>
                  <Tag color={unitColors[unit]}>{unit}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Введите описание (необязательно)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConstructionCost;