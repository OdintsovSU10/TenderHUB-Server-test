import { useState } from 'react';
import { Card, Button, Typography, Tag, Input, InputNumber, Select } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import WorkEditForm from './WorkEditForm';
import MaterialEditForm from './MaterialEditForm';
import { useBoqItems } from './hooks/useBoqItems';
import { useItemActions } from './hooks/useItemActions';
import ItemsTable from './components/ItemsTable';
import AddItemForm from './components/AddItemForm';

const { Text, Title } = Typography;

const PositionItems: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [workSearchText, setWorkSearchText] = useState<string>('');
  const [materialSearchText, setMaterialSearchText] = useState<string>('');
  const [templateSearchText, setTemplateSearchText] = useState<string>('');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const {
    position,
    items,
    works,
    materials,
    templates,
    loading,
    currencyRates,
    costCategories,
    workNames,
    materialNames,
    units,
    gpVolume,
    setGpVolume,
    gpNote,
    setGpNote,
    workName,
    setWorkName,
    unitCode,
    setUnitCode,
    getCurrencyRate,
    fetchPositionData,
    fetchItems,
  } = useBoqItems(positionId);

  const {
    handleAddWork,
    handleAddMaterial,
    handleAddTemplate,
    handleDelete,
    handleFormSave,
    handleSaveGPData,
    handleSaveAdditionalWorkData,
  } = useItemActions({
    position,
    works,
    materials,
    items,
    getCurrencyRate,
    fetchItems,
  });

  const handleEditClick = (record: any) => {
    setExpandedRowKeys([record.id]);
  };

  const onFormSave = async (data: any) => {
    await handleFormSave(data, expandedRowKeys, items, () => setExpandedRowKeys([]));
  };

  const onFormCancel = () => {
    setExpandedRowKeys([]);
  };

  const onSaveGPData = async () => {
    if (positionId) {
      await handleSaveGPData(positionId, gpVolume, gpNote, fetchPositionData);
    }
  };

  const onSaveAdditionalWorkData = async () => {
    if (positionId && position?.is_additional) {
      await handleSaveAdditionalWorkData(positionId, workName, unitCode, fetchPositionData);
    }
  };

  if (!position) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {position.is_additional && <Tag color="orange">ДОП</Tag>}
                <Title level={4} style={{ margin: 0 }}>
                  {position.position_number}. {position.work_name}
                </Title>
              </div>

              {!position.is_additional && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    Кол-во заказчика: <Text strong>{position.volume?.toFixed(2) || '-'}</Text> {position.unit_code}
                  </Text>
                </div>
              )}

              {position.is_additional && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary">Наименование:</Text>
                    <Input
                      value={workName}
                      onChange={(e) => setWorkName(e.target.value)}
                      onBlur={onSaveAdditionalWorkData}
                      style={{ width: 300 }}
                      size="small"
                      placeholder="Наименование работы"
                    />
                    <Text type="secondary" style={{ marginLeft: 16 }}>Примечание ГП:</Text>
                    <Input
                      value={gpNote}
                      onChange={(e) => setGpNote(e.target.value)}
                      onBlur={onSaveGPData}
                      style={{ width: 300 }}
                      size="small"
                      placeholder="Примечание"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary">Кол-во ГП:</Text>
                    <InputNumber
                      value={gpVolume}
                      onChange={(value) => setGpVolume(value || 0)}
                      onBlur={onSaveGPData}
                      precision={2}
                      style={{ width: 120 }}
                      size="small"
                    />
                    <Text type="secondary" style={{ marginLeft: 16 }}>Ед. изм:</Text>
                    <Select
                      value={unitCode}
                      onChange={(value) => {
                        setUnitCode(value);
                        setTimeout(() => onSaveAdditionalWorkData(), 100);
                      }}
                      style={{ width: 100 }}
                      size="small"
                      showSearch
                      placeholder="Выберите"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={units.map(unit => ({
                        value: unit.code,
                        label: unit.code,
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {!position.is_additional && (
              <>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <Text type="secondary">Кол-во ГП:</Text>
                    <InputNumber
                      value={gpVolume}
                      onChange={(value) => setGpVolume(value || 0)}
                      onBlur={onSaveGPData}
                      precision={2}
                      style={{ width: 120 }}
                      size="small"
                    />
                    <Text type="secondary">{position.unit_code}</Text>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                  <Text type="secondary">Примечание ГП:</Text>
                  <Input
                    value={gpNote}
                    onChange={(e) => setGpNote(e.target.value)}
                    onBlur={onSaveGPData}
                    style={{ width: 400 }}
                    size="small"
                    placeholder="Примечание"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card title="Добавление работ и материалов" style={{ marginBottom: 16 }}>
        <AddItemForm
          works={works}
          materials={materials}
          templates={templates}
          workSearchText={workSearchText}
          materialSearchText={materialSearchText}
          templateSearchText={templateSearchText}
          onWorkSearchChange={setWorkSearchText}
          onMaterialSearchChange={setMaterialSearchText}
          onTemplateSearchChange={setTemplateSearchText}
          onAddWork={(workNameId) => {
            handleAddWork(workNameId);
            setWorkSearchText('');
          }}
          onAddMaterial={(materialNameId) => {
            handleAddMaterial(materialNameId);
            setMaterialSearchText('');
          }}
          onAddTemplate={(templateId) => {
            handleAddTemplate(templateId, () => {});
            setTemplateSearchText('');
          }}
        />
      </Card>

      <Card title="Элементы позиции">
        <ItemsTable
          items={items}
          loading={loading}
          expandedRowKeys={expandedRowKeys}
          onExpandedRowsChange={setExpandedRowKeys}
          onEditClick={handleEditClick}
          onDelete={handleDelete}
          getCurrencyRate={getCurrencyRate}
          expandedRowRender={(record) => {
            const isWork = ['раб', 'суб-раб', 'раб-комп.'].includes(record.boq_item_type);

            if (isWork) {
              return (
                <WorkEditForm
                  record={record}
                  workNames={workNames}
                  costCategories={costCategories}
                  currencyRates={currencyRates}
                  onSave={onFormSave}
                  onCancel={onFormCancel}
                />
              );
            } else {
              const workItems = items.filter(
                item => item.boq_item_type === 'раб' ||
                  item.boq_item_type === 'суб-раб' ||
                  item.boq_item_type === 'раб-комп.'
              );

              return (
                <MaterialEditForm
                  record={record}
                  materialNames={materialNames}
                  workItems={workItems}
                  costCategories={costCategories}
                  currencyRates={currencyRates}
                  gpVolume={gpVolume}
                  onSave={onFormSave}
                  onCancel={onFormCancel}
                />
              );
            }
          }}
        />
      </Card>
    </div>
  );
};

// Стили для подсветки строк по типу
const styles = `
  .boq-row-rab {
    background-color: rgba(255, 152, 0, 0.15) !important;
  }
  .boq-row-rab:hover > td {
    background-color: rgba(255, 152, 0, 0.25) !important;
  }
  .boq-row-sub-rab {
    background-color: rgba(156, 39, 176, 0.15) !important;
  }
  .boq-row-sub-rab:hover > td {
    background-color: rgba(156, 39, 176, 0.25) !important;
  }
  .boq-row-rab-comp {
    background-color: rgba(244, 67, 54, 0.15) !important;
  }
  .boq-row-rab-comp:hover > td {
    background-color: rgba(244, 67, 54, 0.25) !important;
  }
  .boq-row-mat {
    background-color: rgba(33, 150, 243, 0.15) !important;
  }
  .boq-row-mat:hover > td {
    background-color: rgba(33, 150, 243, 0.25) !important;
  }
  .boq-row-sub-mat {
    background-color: rgba(156, 204, 101, 0.15) !important;
  }
  .boq-row-sub-mat:hover > td {
    background-color: rgba(156, 204, 101, 0.25) !important;
  }
  .boq-row-mat-comp {
    background-color: rgba(0, 137, 123, 0.15) !important;
  }
  .boq-row-mat-comp:hover > td {
    background-color: rgba(0, 137, 123, 0.25) !important;
  }
`;

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default PositionItems;
