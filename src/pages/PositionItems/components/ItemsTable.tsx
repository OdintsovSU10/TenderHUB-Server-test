import { useMemo, useCallback } from 'react';
import { Table, Button, Space, Tag, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, LinkOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { BoqItemFull, CurrencyType } from '../../../lib/supabase';

const currencySymbols: Record<CurrencyType, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  CNY: '¥',
};

// Типы работ и материалов для быстрой проверки
const WORK_TYPES = new Set(['раб', 'суб-раб', 'раб-комп.']);
const MATERIAL_TYPES = new Set(['мат', 'суб-мат', 'мат-комп.']);

interface ItemsTableProps {
  items: BoqItemFull[];
  loading: boolean;
  expandedRowKeys: string[];
  onExpandedRowsChange: (keys: string[]) => void;
  onEditClick: (record: BoqItemFull) => void;
  onDelete: (id: string) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  getCurrencyRate: (currency: CurrencyType) => number;
  expandedRowRender: (record: BoqItemFull) => React.ReactNode;
  readOnly?: boolean;
}

// Интерфейс для предвычисленных данных перемещения
interface MovementBoundaries {
  /** Индекс первой работы с материалами */
  firstWorkWithMaterialsIndex: number;
  /** Индекс последнего привязанного материала в списке */
  lastLinkedMaterialIndex: number;
  /** Индекс первого непривязанного элемента */
  firstUnlinkedIndex: number;
}

// Интерфейс для предвычисленных карт
interface ItemMaps {
  /** Карта элементов по ID для O(1) поиска */
  itemById: Map<string, BoqItemFull>;
  /** Карта индексов элементов по ID */
  indexById: Map<string, number>;
  /** Карта материалов по ID родительской работы */
  childrenByWorkId: Map<string, BoqItemFull[]>;
  /** Set ID работ, у которых есть материалы */
  worksWithMaterials: Set<string>;
  /** Границы для операций перемещения */
  boundaries: MovementBoundaries;
}

/**
 * Вычисляет все карты и границы за один проход по массиву items
 */
function computeItemMaps(items: BoqItemFull[]): ItemMaps {
  const itemById = new Map<string, BoqItemFull>();
  const indexById = new Map<string, number>();
  const childrenByWorkId = new Map<string, BoqItemFull[]>();
  const worksWithMaterials = new Set<string>();

  let firstWorkWithMaterialsIndex = -1;
  let lastLinkedMaterialIndex = -1;
  let firstUnlinkedIndex = -1;

  // Первый проход: построить базовые карты
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    itemById.set(item.id, item);
    indexById.set(item.id, i);

    if (item.parent_work_item_id) {
      // Привязанный материал
      lastLinkedMaterialIndex = i;
      worksWithMaterials.add(item.parent_work_item_id);

      const children = childrenByWorkId.get(item.parent_work_item_id) || [];
      children.push(item);
      childrenByWorkId.set(item.parent_work_item_id, children);
    }
  }

  // Второй проход: найти границы групп
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isWork = WORK_TYPES.has(item.boq_item_type);
    const hasLinkedMaterials = worksWithMaterials.has(item.id);
    const isLinkedMaterial = !!item.parent_work_item_id;
    const isUnlinked = !isLinkedMaterial && !hasLinkedMaterials;

    // Первая работа с материалами
    if (firstWorkWithMaterialsIndex === -1 && isWork && hasLinkedMaterials) {
      firstWorkWithMaterialsIndex = i;
    }

    // Первый непривязанный элемент
    if (firstUnlinkedIndex === -1 && isUnlinked) {
      firstUnlinkedIndex = i;
    }
  }

  return {
    itemById,
    indexById,
    childrenByWorkId,
    worksWithMaterials,
    boundaries: {
      firstWorkWithMaterialsIndex,
      lastLinkedMaterialIndex,
      firstUnlinkedIndex,
    },
  };
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  loading,
  expandedRowKeys,
  onExpandedRowsChange,
  onEditClick,
  onDelete,
  onMoveItem,
  getCurrencyRate,
  expandedRowRender,
  readOnly,
}) => {
  // Мемоизированные карты - пересчитываются только при изменении items
  const maps = useMemo(() => computeItemMaps(items), [items]);

  // Мемоизированная функция получения родительской работы
  const getParentWork = useCallback(
    (parentWorkItemId: string | null): BoqItemFull | undefined => {
      if (!parentWorkItemId) return undefined;
      return maps.itemById.get(parentWorkItemId);
    },
    [maps.itemById]
  );

  // Оптимизированная проверка возможности перемещения вверх
  const canMoveItemUp = useCallback(
    (record: BoqItemFull): boolean => {
      const index = maps.indexById.get(record.id);
      if (index === undefined || index === 0) return false;

      // Привязанный материал
      if (record.parent_work_item_id) {
        const workIndex = maps.indexById.get(record.parent_work_item_id);
        if (workIndex === undefined) return false;
        return index > workIndex + 1;
      }

      // Работа с материалами
      if (maps.worksWithMaterials.has(record.id)) {
        const { firstWorkWithMaterialsIndex } = maps.boundaries;
        return firstWorkWithMaterialsIndex !== -1 && index > firstWorkWithMaterialsIndex;
      }

      // Непривязанный элемент
      const { firstUnlinkedIndex } = maps.boundaries;
      return firstUnlinkedIndex !== -1 && index > firstUnlinkedIndex;
    },
    [maps]
  );

  // Оптимизированная проверка возможности перемещения вниз
  const canMoveItemDown = useCallback(
    (record: BoqItemFull): boolean => {
      const index = maps.indexById.get(record.id);
      if (index === undefined || index >= items.length - 1) return false;

      // Привязанный материал
      if (record.parent_work_item_id) {
        const siblings = maps.childrenByWorkId.get(record.parent_work_item_id) || [];
        const lastSibling = siblings[siblings.length - 1];
        if (!lastSibling) return false;
        const lastIndex = maps.indexById.get(lastSibling.id);
        return lastIndex !== undefined && index < lastIndex;
      }

      // Работа с материалами
      if (maps.worksWithMaterials.has(record.id)) {
        const { lastLinkedMaterialIndex } = maps.boundaries;
        return lastLinkedMaterialIndex !== -1 && index < lastLinkedMaterialIndex;
      }

      // Непривязанный элемент
      return index < items.length - 1;
    },
    [maps, items.length]
  );

  const getRowClassName = useCallback((record: BoqItemFull): string => {
    switch (record.boq_item_type) {
      case 'раб':
        return 'boq-row-rab';
      case 'суб-раб':
        return 'boq-row-sub-rab';
      case 'раб-комп.':
        return 'boq-row-rab-comp';
      case 'мат':
        return 'boq-row-mat';
      case 'суб-мат':
        return 'boq-row-sub-mat';
      case 'мат-комп.':
        return 'boq-row-mat-comp';
      default:
        return '';
    }
  }, []);

  // Мемоизированные колонки
  const columns = useMemo(
    () => [
      {
        title: '',
        key: 'sort',
        width: 60,
        align: 'center' as const,
        fixed: 'left' as const,
        render: (_: unknown, record: BoqItemFull) => (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Tooltip title="Переместить вверх">
              <Button
                type="text"
                size="small"
                icon={<UpOutlined style={{ fontSize: 12 }} />}
                disabled={readOnly || !canMoveItemUp(record)}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(record.id, 'up');
                }}
                style={{ padding: '2px 4px', height: 20 }}
              />
            </Tooltip>
            <Tooltip title="Переместить вниз">
              <Button
                type="text"
                size="small"
                icon={<DownOutlined style={{ fontSize: 12 }} />}
                disabled={readOnly || !canMoveItemDown(record)}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(record.id, 'down');
                }}
                style={{ padding: '2px 4px', height: 20 }}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: <div style={{ textAlign: 'center' }}>Тип</div>,
        key: 'type',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          const isMaterial = MATERIAL_TYPES.has(record.boq_item_type);
          const itemType = record.boq_item_type;

          let bgColor = '';
          let textColor = '';

          if (WORK_TYPES.has(itemType)) {
            switch (itemType) {
              case 'раб':
                bgColor = 'rgba(239, 108, 0, 0.12)';
                textColor = '#f57c00';
                break;
              case 'суб-раб':
                bgColor = 'rgba(106, 27, 154, 0.12)';
                textColor = '#7b1fa2';
                break;
              case 'раб-комп.':
                bgColor = 'rgba(198, 40, 40, 0.12)';
                textColor = '#d32f2f';
                break;
            }
          } else {
            switch (itemType) {
              case 'мат':
                bgColor = 'rgba(21, 101, 192, 0.12)';
                textColor = '#1976d2';
                break;
              case 'суб-мат':
                bgColor = 'rgba(104, 159, 56, 0.12)';
                textColor = '#7cb342';
                break;
              case 'мат-комп.':
                bgColor = 'rgba(0, 105, 92, 0.12)';
                textColor = '#00897b';
                break;
            }
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Tag style={{ backgroundColor: bgColor, color: textColor, border: 'none', margin: 0 }}>
                {itemType}
              </Tag>
              {isMaterial && record.material_type && (
                <Tag
                  style={{
                    backgroundColor:
                      record.material_type === 'основн.'
                        ? 'rgba(255, 152, 0, 0.12)'
                        : 'rgba(21, 101, 192, 0.12)',
                    color: record.material_type === 'основн.' ? '#fb8c00' : '#1976d2',
                    border: 'none',
                    margin: 0,
                    fontSize: 11,
                  }}
                >
                  {record.material_type}
                </Tag>
              )}
            </div>
          );
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Затрата на стр-во</div>,
        key: 'cost_category',
        width: 150,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          if (!record.detail_cost_category_full || record.detail_cost_category_full === '-') {
            return '-';
          }

          const parts = record.detail_cost_category_full.split(' / ');
          const categoryName = parts[0] || '-';

          return (
            <Tooltip title={record.detail_cost_category_full}>
              <span style={{ cursor: 'help' }}>{categoryName}</span>
            </Tooltip>
          );
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Наименование</div>,
        key: 'name',
        width: 200,
        render: (_: unknown, record: BoqItemFull) => {
          const isMaterial = MATERIAL_TYPES.has(record.boq_item_type);
          const parentWork = getParentWork(record.parent_work_item_id);

          return (
            <div style={{ textAlign: 'left' }}>
              <div>{record.work_name || record.material_name}</div>
              {isMaterial && parentWork && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  <LinkOutlined style={{ marginRight: 4 }} />
                  {parentWork.work_name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>К перв</div>,
        dataIndex: 'conversion_coefficient',
        key: 'conversion',
        width: 70,
        align: 'center' as const,
        render: (value: number) => value?.toFixed(4) || '-',
      },
      {
        title: <div style={{ textAlign: 'center' }}>К расх</div>,
        dataIndex: 'consumption_coefficient',
        key: 'consumption',
        width: 70,
        align: 'center' as const,
        render: (value: number) => value?.toFixed(4) || '-',
      },
      {
        title: <div style={{ textAlign: 'center' }}>Кол-во</div>,
        dataIndex: 'quantity',
        key: 'quantity',
        width: 90,
        align: 'center' as const,
        render: (value: number, record: BoqItemFull) => {
          const isMaterial = MATERIAL_TYPES.has(record.boq_item_type);
          const displayValue = value?.toFixed(5) || '-';

          if (isMaterial && value) {
            let tooltipTitle = '';
            if (record.parent_work_item_id) {
              const parentWork = getParentWork(record.parent_work_item_id);
              const workQty = parentWork?.quantity || 0;
              const convCoef = record.conversion_coefficient || 1;
              const consCoef = record.consumption_coefficient || 1;
              tooltipTitle = `Кол-во = ${workQty.toFixed(5)} (кол-во работы) × ${convCoef.toFixed(4)} (К перв) × ${consCoef.toFixed(4)} (К расх) = ${displayValue}`;
            } else if (record.base_quantity) {
              const baseQty = record.base_quantity;
              const consCoef = record.consumption_coefficient || 1;
              tooltipTitle = `Кол-во = ${baseQty.toFixed(5)} (базовое кол-во)\nК расх ${consCoef.toFixed(4)} применяется к итоговой сумме`;
            }

            return (
              <Tooltip title={tooltipTitle}>
                <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>{displayValue}</span>
              </Tooltip>
            );
          }

          return displayValue;
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Ед.изм.</div>,
        dataIndex: 'unit_code',
        key: 'unit',
        width: 70,
        align: 'center' as const,
      },
      {
        title: <div style={{ textAlign: 'center' }}>Цена за ед.</div>,
        key: 'price',
        width: 100,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          const symbol = currencySymbols[record.currency_type || 'RUB'];
          return record.unit_rate ? `${record.unit_rate.toLocaleString('ru-RU')} ${symbol}` : '-';
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Доставка</div>,
        key: 'delivery',
        width: 110,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          const isMaterial = MATERIAL_TYPES.has(record.boq_item_type);

          if (!isMaterial || !record.delivery_price_type) {
            return '-';
          }

          if (record.delivery_price_type === 'в цене') {
            return 'Включена';
          } else if (record.delivery_price_type === 'не в цене') {
            const unitRate = record.unit_rate || 0;
            const rate = getCurrencyRate(record.currency_type as CurrencyType);
            const unitPriceInRub = unitRate * rate;
            const deliveryAmount = unitPriceInRub * 0.03;

            const deliveryRounded = Math.round(deliveryAmount * 100) / 100;
            const tooltipTitle = `${deliveryRounded.toFixed(2)} = ${unitPriceInRub.toFixed(2)} × 3%`;

            return (
              <Tooltip title={tooltipTitle}>
                <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>
                  {deliveryRounded.toFixed(2)}
                </span>
              </Tooltip>
            );
          } else if (record.delivery_price_type === 'суммой' && record.delivery_amount) {
            return `${record.delivery_amount.toLocaleString('ru-RU')}`;
          }

          return '-';
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Итого</div>,
        key: 'total',
        width: 100,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          const total = record.total_amount || 0;
          const displayValue = total > 0 ? `${total.toLocaleString('ru-RU')}` : '-';

          if (total > 0) {
            const qty = record.quantity || 0;
            const price = record.unit_rate || 0;
            const rate = getCurrencyRate(record.currency_type || 'RUB');

            const isMaterial = MATERIAL_TYPES.has(record.boq_item_type);
            let tooltipTitle = '';

            if (isMaterial) {
              let deliveryPrice = 0;
              if (record.delivery_price_type === 'не в цене') {
                deliveryPrice = Math.round(price * rate * 0.03 * 100) / 100;
              } else if (record.delivery_price_type === 'суммой') {
                deliveryPrice = record.delivery_amount || 0;
              }

              const consCoef = !record.parent_work_item_id ? (record.consumption_coefficient || 1) : 1;
              if (consCoef !== 1) {
                tooltipTitle = `${total.toFixed(2)} = ${qty.toFixed(5)} × ${consCoef.toFixed(4)} (К расх) × (${price.toFixed(2)} * ${rate.toFixed(2)} + ${deliveryPrice.toFixed(2)})`;
              } else {
                tooltipTitle = `${total.toFixed(2)} = ${qty.toFixed(5)} × (${price.toFixed(2)} * ${rate.toFixed(2)} + ${deliveryPrice.toFixed(2)})`;
              }
            } else {
              tooltipTitle = `${total.toFixed(2)} = ${qty.toFixed(5)} × (${price.toFixed(2)} * ${rate.toFixed(2)} + 0)`;
            }

            return (
              <Tooltip title={tooltipTitle}>
                <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>{displayValue}</span>
              </Tooltip>
            );
          }

          return displayValue;
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Ссылка на КП</div>,
        dataIndex: 'quote_link',
        key: 'quote_link',
        width: 100,
        align: 'center' as const,
        render: (value: string) => {
          if (!value) return '-';

          const isUrl = value.startsWith('http://') || value.startsWith('https://');

          if (isUrl) {
            return (
              <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
                Ссылка
              </a>
            );
          }

          return value;
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>Примечание</div>,
        dataIndex: 'description',
        key: 'description',
        width: 120,
        align: 'center' as const,
        render: (value: string) => value || '-',
      },
      {
        title: <div style={{ textAlign: 'center' }}>Действия</div>,
        key: 'actions',
        width: 100,
        align: 'center' as const,
        render: (_: unknown, record: BoqItemFull) => {
          return (
            <Space>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEditClick(record)}
                disabled={
                  readOnly || (expandedRowKeys.length > 0 && !expandedRowKeys.includes(record.id))
                }
              />
              <Popconfirm
                title="Удалить элемент?"
                onConfirm={() => onDelete(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={readOnly} />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [
      readOnly,
      expandedRowKeys,
      canMoveItemUp,
      canMoveItemDown,
      onMoveItem,
      onEditClick,
      onDelete,
      getCurrencyRate,
      getParentWork,
    ]
  );

  // Мемоизированная конфигурация expandable
  const expandableConfig = useMemo(
    () => ({
      showExpandColumn: false,
      expandedRowKeys: expandedRowKeys,
      onExpand: (expanded: boolean, record: BoqItemFull) => {
        onExpandedRowsChange(expanded ? [record.id] : []);
      },
      expandedRowRender,
    }),
    [expandedRowKeys, onExpandedRowsChange, expandedRowRender]
  );

  return (
    <Table
      columns={columns}
      dataSource={items}
      rowKey="id"
      rowClassName={getRowClassName}
      loading={loading}
      pagination={false}
      scroll={{ y: 600 }}
      size="small"
      virtual
      expandable={expandableConfig}
    />
  );
};

export default ItemsTable;
