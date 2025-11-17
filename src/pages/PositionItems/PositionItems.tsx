import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  message,
  InputNumber,
  Input,
  AutoComplete,
  Select,
  Popconfirm,
  Form,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  supabase,
  type ClientPosition,
  type BoqItemFull,
  type BoqItemInsert,
  type WorkLibraryFull,
  type MaterialLibraryFull,
  type BoqItemType,
  type MaterialType,
  type CurrencyType,
  type DeliveryPriceType,
} from '../../lib/supabase';

const { Text, Title } = Typography;

const currencySymbols: Record<CurrencyType, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  CNY: '¥',
};

const PositionItems: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [position, setPosition] = useState<ClientPosition | null>(null);
  const [items, setItems] = useState<BoqItemFull[]>([]);
  const [works, setWorks] = useState<WorkLibraryFull[]>([]);
  const [materials, setMaterials] = useState<MaterialLibraryFull[]>([]);
  const [loading, setLoading] = useState(false);

  const [workSearchText, setWorkSearchText] = useState<string>('');
  const [materialSearchText, setMaterialSearchText] = useState<string>('');

  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<string>('');

  useEffect(() => {
    if (positionId) {
      fetchPositionData();
      fetchItems();
      fetchWorks();
      fetchMaterials();
    }
  }, [positionId]);

  const fetchPositionData = async () => {
    try {
      const { data, error } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (error) throw error;
      setPosition(data);
    } catch (error: any) {
      message.error('Ошибка загрузки позиции: ' + error.message);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .select(`
          *,
          material_names(name, unit),
          work_names(name, unit),
          parent_work:parent_work_item_id(work_names(name))
        `)
        .eq('client_position_id', positionId)
        .order('sort_number', { ascending: true });

      if (error) throw error;

      // Fetch unit rates from libraries
      const materialIds = (data || [])
        .filter(item => item.material_name_id)
        .map(item => item.material_name_id);

      const workIds = (data || [])
        .filter(item => item.work_name_id)
        .map(item => item.work_name_id);

      let materialRates: Record<string, number> = {};
      let workRates: Record<string, number> = {};

      if (materialIds.length > 0) {
        const { data: matData } = await supabase
          .from('materials_library')
          .select('material_name_id, unit_rate')
          .in('material_name_id', materialIds);

        materialRates = (matData || []).reduce((acc, item) => {
          acc[item.material_name_id] = item.unit_rate;
          return acc;
        }, {} as Record<string, number>);
      }

      if (workIds.length > 0) {
        const { data: workData } = await supabase
          .from('works_library')
          .select('work_name_id, unit_rate')
          .in('work_name_id', workIds);

        workRates = (workData || []).reduce((acc, item) => {
          acc[item.work_name_id] = item.unit_rate;
          return acc;
        }, {} as Record<string, number>);
      }

      const formattedItems: BoqItemFull[] = (data || []).map((item: any) => ({
        ...item,
        material_name: item.material_names?.name,
        material_unit: item.material_names?.unit,
        work_name: item.work_names?.name,
        work_unit: item.work_names?.unit,
        parent_work_name: item.parent_work?.work_names?.name,
        unit_rate: item.material_name_id
          ? materialRates[item.material_name_id]
          : workRates[item.work_name_id],
      }));

      setItems(formattedItems);
    } catch (error: any) {
      message.error('Ошибка загрузки элементов: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works_library')
        .select('*, work_names(name, unit)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: WorkLibraryFull[] = (data || []).map((item: any) => ({
        ...item,
        work_name: item.work_names?.name,
        unit: item.work_names?.unit,
      }));

      setWorks(formatted);
    } catch (error: any) {
      message.error('Ошибка загрузки работ: ' + error.message);
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials_library')
        .select('*, material_names(name, unit)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: MaterialLibraryFull[] = (data || []).map((item: any) => ({
        ...item,
        material_name: item.material_names?.name,
        unit: item.material_names?.unit,
      }));

      setMaterials(formatted);
    } catch (error: any) {
      message.error('Ошибка загрузки материалов: ' + error.message);
    }
  };

  const handleAddWork = async (workNameId: string) => {
    if (!workNameId || !position) {
      message.error('Выберите работу');
      return;
    }

    try {
      const workLib = works.find(w => w.work_name_id === workNameId);
      if (!workLib) throw new Error('Работа не найдена в библиотеке');

      const maxSort = Math.max(...items.map(i => i.sort_number || 0), 0);

      const newItem: BoqItemInsert = {
        tender_id: position.tender_id,
        client_position_id: position.id,
        sort_number: maxSort + 1,
        boq_item_type: workLib.item_type as BoqItemType,
        work_name_id: workLib.work_name_id,
        unit_code: workLib.unit,
        quantity: 1,
        currency_type: workLib.currency_type as CurrencyType,
      };

      const { error } = await supabase.from('boq_items').insert(newItem);

      if (error) throw error;

      message.success('Работа добавлена');
      setWorkSearchText('');
      fetchItems();
    } catch (error: any) {
      message.error('Ошибка добавления работы: ' + error.message);
    }
  };

  const handleAddMaterial = async (materialNameId: string) => {
    if (!materialNameId || !position) {
      message.error('Выберите материал');
      return;
    }

    try {
      const matLib = materials.find(m => m.material_name_id === materialNameId);
      if (!matLib) throw new Error('Материал не найден в библиотеке');

      const maxSort = Math.max(...items.map(i => i.sort_number || 0), 0);

      const newItem: BoqItemInsert = {
        tender_id: position.tender_id,
        client_position_id: position.id,
        sort_number: maxSort + 1,
        boq_item_type: matLib.item_type as BoqItemType,
        material_type: matLib.material_type as MaterialType,
        material_name_id: matLib.material_name_id,
        unit_code: matLib.unit,
        quantity: 1,
        consumption_coefficient: matLib.consumption_coefficient,
        currency_type: matLib.currency_type as CurrencyType,
        delivery_price_type: matLib.delivery_price_type as DeliveryPriceType,
        delivery_amount: matLib.delivery_amount,
      };

      const { error } = await supabase.from('boq_items').insert(newItem);

      if (error) throw error;

      message.success('Материал добавлен');
      setMaterialSearchText('');
      fetchItems();
    } catch (error: any) {
      message.error('Ошибка добавления материала: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('boq_items').delete().eq('id', id);

      if (error) throw error;

      message.success('Элемент удален');
      fetchItems();
    } catch (error: any) {
      message.error('Ошибка удаления: ' + error.message);
    }
  };

  const isEditing = (record: BoqItemFull) => record.id === editingKey;

  const edit = (record: BoqItemFull) => {
    form.setFieldsValue({
      conversion_coefficient: record.conversion_coefficient,
      consumption_coefficient: record.consumption_coefficient,
      quantity: record.quantity,
      parent_work_item_id: record.parent_work_item_id,
      quote_link: record.quote_link,
      ...record,
    });
    setEditingKey(record.id);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (id: string) => {
    try {
      const row = await form.validateFields();

      const { error } = await supabase
        .from('boq_items')
        .update({
          conversion_coefficient: row.conversion_coefficient,
          consumption_coefficient: row.consumption_coefficient,
          quantity: row.quantity,
          parent_work_item_id: row.parent_work_item_id || null,
          quote_link: row.quote_link,
        })
        .eq('id', id);

      if (error) throw error;

      message.success('Изменения сохранены');
      setEditingKey('');
      fetchItems();
    } catch (error: any) {
      message.error('Ошибка сохранения: ' + error.message);
    }
  };

  const getTypeColor = (type: BoqItemType): string => {
    const colors: Record<BoqItemType, string> = {
      'мат': 'orange',
      'суб-мат': 'purple',
      'мат-комп.': 'red',
      'раб': 'blue',
      'суб-раб': 'cyan',
      'раб-комп.': 'geekblue',
    };
    return colors[type] || 'default';
  };

  const getAvailableWorks = () => {
    return items.filter(
      item => item.boq_item_type === 'раб' ||
        item.boq_item_type === 'суб-раб' ||
        item.boq_item_type === 'раб-комп.'
    );
  };

  const getDeliveryText = (record: BoqItemFull): string => {
    if (!record.delivery_price_type) return '-';

    if (record.delivery_price_type === 'в цене') {
      return 'Включена';
    } else if (record.delivery_price_type === 'не в цене' && record.delivery_amount) {
      return `Не включена (${record.delivery_amount}%)`;
    } else if (record.delivery_price_type === 'суммой' && record.delivery_amount) {
      const symbol = currencySymbols[record.currency_type || 'RUB'];
      return `${record.delivery_amount.toLocaleString('ru-RU')} ${symbol}`;
    }
    return '-';
  };

  const calculateTotal = (record: BoqItemFull): number => {
    // This will be implemented later with proper price calculation logic
    return record.total_amount || 0;
  };

  interface EditableCellProps {
    editing: boolean;
    dataIndex: string;
    title: any;
    inputType: 'number' | 'text' | 'select';
    record: BoqItemFull;
    index: number;
    children: React.ReactNode;
    selectOptions?: { value: string; label: string }[];
  }

  const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    selectOptions,
    ...restProps
  }) => {
    let inputNode: React.ReactNode;

    if (inputType === 'number') {
      inputNode = <InputNumber style={{ width: '100%' }} min={0} step={0.01} />;
    } else if (inputType === 'select') {
      inputNode = (
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите работу"
          allowClear
          options={selectOptions}
        />
      );
    } else {
      inputNode = <Input />;
    }

    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[
              {
                required: dataIndex === 'quantity',
                message: `Пожалуйста, введите ${title}!`,
              },
            ]}
          >
            {inputNode}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  const columns: any[] = [
    {
      title: <div style={{ textAlign: 'center' }}>Тип</div>,
      key: 'type',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Tag color={getTypeColor(record.boq_item_type)}>
          {record.boq_item_type}
        </Tag>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>Наименование</div>,
      key: 'name',
      width: 250,
      render: (_, record) => (
        <div style={{ paddingLeft: record.parent_work_item_id ? 24 : 0 }}>
          {record.parent_work_item_id && (
            <LinkOutlined style={{ marginRight: 8, color: '#888' }} />
          )}
          <Text>{record.work_name || record.material_name}</Text>
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>К перв</div>,
      dataIndex: 'conversion_coefficient',
      key: 'conversion',
      width: 80,
      align: 'center',
      editable: true,
      render: (value) => value?.toFixed(3) || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>К расх</div>,
      dataIndex: 'consumption_coefficient',
      key: 'consumption',
      width: 80,
      align: 'center',
      render: (value) => value?.toFixed(4) || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Кол-во</div>,
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
      editable: true,
      render: (value) => value?.toFixed(2) || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Ед.изм.</div>,
      dataIndex: 'unit_code',
      key: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Цена</div>,
      key: 'price',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const symbol = currencySymbols[record.currency_type || 'RUB'];
        return record.unit_rate
          ? `${record.unit_rate.toLocaleString('ru-RU')} ${symbol}`
          : '-';
      },
    },
    {
      title: <div style={{ textAlign: 'center' }}>Доставка</div>,
      key: 'delivery',
      width: 130,
      align: 'center',
      render: (_, record) => getDeliveryText(record),
    },
    {
      title: <div style={{ textAlign: 'center' }}>Сумма</div>,
      key: 'total',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const total = calculateTotal(record);
        const symbol = currencySymbols[record.currency_type || 'RUB'];
        return total > 0
          ? `${total.toLocaleString('ru-RU')} ${symbol}`
          : '-';
      },
    },
    {
      title: <div style={{ textAlign: 'center' }}>Привязка к работе</div>,
      dataIndex: 'parent_work_item_id',
      key: 'parent_work',
      width: 200,
      align: 'center',
      editable: true,
      render: (value: string | null) => {
        if (!value) return '-';
        const parentWork = items.find(item => item.id === value);
        return parentWork ? parentWork.work_name : '-';
      },
    },
    {
      title: <div style={{ textAlign: 'center' }}>Категория затрат</div>,
      key: 'cost_category',
      width: 180,
      align: 'center',
      render: (_, record) => record.detail_cost_category_full || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Ссылка на КП</div>,
      dataIndex: 'quote_link',
      key: 'quote_link',
      width: 120,
      align: 'center',
      editable: true,
      render: (value) => value || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Примечание</div>,
      key: 'note',
      width: 150,
      align: 'center',
      render: () => '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Действия</div>,
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => save(record.id)}
            />
            <Button
              type="link"
              size="small"
              icon={<CloseOutlined />}
              onClick={cancel}
            />
          </Space>
        ) : (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={editingKey !== ''}
              onClick={() => edit(record)}
            />
            <Popconfirm
              title="Удалить элемент?"
              onConfirm={() => handleDelete(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col: any) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: BoqItemFull) => ({
        record,
        inputType:
          col.dataIndex === 'parent_work_item_id'
            ? 'select'
            : col.dataIndex === 'quote_link'
            ? 'text'
            : 'number',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
        selectOptions:
          col.dataIndex === 'parent_work_item_id'
            ? getAvailableWorks().map(w => ({
                value: w.id,
                label: w.work_name || '',
              }))
            : [],
      }),
    };
  });

  if (!position) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                const tenderId = searchParams.get('tenderId');
                const positionId = searchParams.get('positionId');
                if (tenderId && positionId) {
                  navigate(`/positions?tenderId=${tenderId}&positionId=${positionId}`);
                } else {
                  navigate('/positions');
                }
              }}
            >
              Назад
            </Button>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {position.position_number}. {position.work_name}
              </Title>
              <Space style={{ marginTop: 8 }}>
                <Text type="secondary">
                  Кол-во заказчика: <Text strong>{position.volume?.toFixed(2) || '-'}</Text> {position.unit_code}
                </Text>
                <Text type="secondary">|</Text>
                <Text type="secondary">
                  Кол-во ГП: <Text strong>{position.manual_volume?.toFixed(2) || '-'}</Text> {position.unit_code}
                </Text>
              </Space>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Добавление работ и материалов" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <AutoComplete
            style={{ flex: 1 }}
            placeholder="Введите работу (2+ символа)..."
            options={works
              .filter(w =>
                workSearchText.length >= 2 &&
                w.work_name.toLowerCase().includes(workSearchText.toLowerCase())
              )
              .map(w => ({
                value: w.work_name_id,
                label: w.work_name,
              }))
            }
            value={workSearchText}
            onSelect={(value) => {
              handleAddWork(value);
            }}
            onChange={(value) => {
              setWorkSearchText(value);
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#10b981' }}
            disabled={!workSearchText || works.filter(w =>
              w.work_name.toLowerCase().includes(workSearchText.toLowerCase())
            ).length === 0}
            onClick={() => {
              const work = works.find(w =>
                w.work_name.toLowerCase().includes(workSearchText.toLowerCase())
              );
              if (work) {
                handleAddWork(work.work_name_id);
              }
            }}
          />

          <AutoComplete
            style={{ flex: 1 }}
            placeholder="Введите материал (2+ символа)..."
            options={materials
              .filter(m =>
                materialSearchText.length >= 2 &&
                m.material_name.toLowerCase().includes(materialSearchText.toLowerCase())
              )
              .map(m => ({
                value: m.material_name_id,
                label: m.material_name,
              }))
            }
            value={materialSearchText}
            onSelect={(value) => {
              handleAddMaterial(value);
            }}
            onChange={(value) => {
              setMaterialSearchText(value);
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#10b981' }}
            disabled={!materialSearchText || materials.filter(m =>
              m.material_name.toLowerCase().includes(materialSearchText.toLowerCase())
            ).length === 0}
            onClick={() => {
              const material = materials.find(m =>
                m.material_name.toLowerCase().includes(materialSearchText.toLowerCase())
              );
              if (material) {
                handleAddMaterial(material.material_name_id);
              }
            }}
          />
        </div>
      </Card>

      <Card title="Элементы позиции">
        <Form form={form} component={false}>
          <Table
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            columns={mergedColumns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ y: 'calc(100vh - 500px)' }}
            size="small"
          />
        </Form>
      </Card>
    </div>
  );
};

export default PositionItems;
