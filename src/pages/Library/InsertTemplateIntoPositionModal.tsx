import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  AutoComplete,
  message,
  Row,
  Col,
} from 'antd';
import { supabase } from '../../lib/supabase';
import { insertTemplateItems } from '../../utils/insertTemplateItems';

interface Tender {
  id: string;
  title: string;
  version: number;
}

interface LeafPosition {
  id: string;
  position_number: number;
  work_name: string;
  hierarchy_level: number;
  tender_id: string;
}

interface InsertTemplateIntoPositionModalProps {
  open: boolean;
  templateId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const InsertTemplateIntoPositionModal: React.FC<InsertTemplateIntoPositionModalProps> = ({
  open,
  templateId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [leafPositions, setLeafPositions] = useState<LeafPosition[]>([]);

  // Состояния для тендера
  const [tenderTitleSearch, setTenderTitleSearch] = useState<string>('');
  const [tenderVersionSearch, setTenderVersionSearch] = useState<string>('');
  const [selectedTenderTitle, setSelectedTenderTitle] = useState<string | null>(null);
  const [selectedTenderVersion, setSelectedTenderVersion] = useState<number | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);

  // Состояния для позиции
  const [positionSearch, setPositionSearch] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTenders();
      form.resetFields();
      resetTenderSelection();
      resetPositionSelection();
    }
  }, [open]);

  const resetTenderSelection = () => {
    setTenderTitleSearch('');
    setTenderVersionSearch('');
    setSelectedTenderTitle(null);
    setSelectedTenderVersion(null);
    setSelectedTenderId(null);
    setLeafPositions([]);
  };

  const resetPositionSelection = () => {
    setPositionSearch('');
    setSelectedPositionId(null);
  };

  const fetchTenders = async () => {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('id, title, version')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки тендеров:', error);
      message.error('Не удалось загрузить тендеры');
    }
  };

  const fetchLeafPositions = async (tenderId: string) => {
    try {
      const { data: allPositions, error } = await supabase
        .from('client_positions')
        .select('id, position_number, work_name, hierarchy_level, tender_id')
        .eq('tender_id', tenderId)
        .order('position_number', { ascending: true });

      if (error) throw error;

      if (!allPositions || allPositions.length === 0) {
        setLeafPositions([]);
        return;
      }

      // Отфильтровать только конечные позиции (hierarchy_level >= 3)
      // Уровни 1 и 2 - это родительские категории
      const leaves = allPositions.filter(p =>
        p.hierarchy_level !== null &&
        p.hierarchy_level !== undefined &&
        p.hierarchy_level >= 3
      );

      console.log('Всего позиций:', allPositions.length);
      console.log('Конечных позиций (hierarchy_level >= 3):', leaves.length);

      setLeafPositions(leaves);
    } catch (error: any) {
      console.error('Ошибка загрузки позиций:', error);
      message.error('Не удалось загрузить позиции');
    }
  };

  // Получить уникальные названия тендеров
  const uniqueTenderTitles = Array.from(new Set(tenders.map(t => t.title)));

  // Получить версии для выбранного названия тендера
  const availableVersions = selectedTenderTitle
    ? tenders
        .filter(t => t.title === selectedTenderTitle)
        .map(t => t.version)
        .sort((a, b) => b - a) // Сортировка по убыванию
    : [];

  const handleTenderTitleSelect = (value: string) => {
    setTenderTitleSearch(value);
    setSelectedTenderTitle(value);

    // Сбросить версию и позицию
    setTenderVersionSearch('');
    setSelectedTenderVersion(null);
    setSelectedTenderId(null);
    resetPositionSelection();
    setLeafPositions([]);
    form.setFieldsValue({ tender_version: undefined, position_id: undefined });
  };

  const handleTenderVersionSelect = (value: string) => {
    const version = parseInt(value);
    setTenderVersionSearch(value);
    setSelectedTenderVersion(version);

    // Найти ID тендера по названию и версии
    const tender = tenders.find(t => t.title === selectedTenderTitle && t.version === version);
    if (tender) {
      setSelectedTenderId(tender.id);
      fetchLeafPositions(tender.id);

      // Сбросить позицию
      resetPositionSelection();
      form.setFieldsValue({ position_id: undefined });
    }
  };

  const handlePositionSelect = (value: string, option: any) => {
    setPositionSearch(option.label);
    setSelectedPositionId(option.key);
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      await form.validateFields();

      if (!templateId) {
        message.error('Шаблон не выбран');
        return;
      }

      if (!selectedTenderId) {
        message.error('Выберите тендер и версию');
        return;
      }

      if (!selectedPositionId) {
        message.error('Выберите позицию');
        return;
      }

      const result = await insertTemplateItems(
        templateId,
        selectedPositionId,
        selectedTenderId
      );

      message.success(
        `Шаблон вставлен: ${result.worksCount} работ, ${result.materialsCount} материалов`
      );

      form.resetFields();
      onSuccess();
    } catch (error: any) {
      console.error('Ошибка вставки шаблона:', error);
      message.error('Ошибка вставки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    resetTenderSelection();
    resetPositionSelection();
    onCancel();
  };

  return (
    <Modal
      title="Вставить шаблон в позицию заказчика"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Вставить"
      cancelText="Отмена"
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tender_title"
              label="Имя тендера"
              rules={[{ required: true, message: 'Выберите тендер' }]}
            >
              <AutoComplete
                value={tenderTitleSearch}
                onChange={setTenderTitleSearch}
                onSelect={handleTenderTitleSelect}
                placeholder="Начните вводить название..."
                options={uniqueTenderTitles
                  .filter(title => {
                    if (!tenderTitleSearch) return true;
                    return title.toLowerCase().includes(tenderTitleSearch.toLowerCase());
                  })
                  .map(title => ({
                    value: title,
                    label: title,
                  }))
                }
                filterOption={false}
                allowClear
                onClear={() => {
                  setTenderTitleSearch('');
                  setSelectedTenderTitle(null);
                  setTenderVersionSearch('');
                  setSelectedTenderVersion(null);
                  setSelectedTenderId(null);
                  setLeafPositions([]);
                  resetPositionSelection();
                  form.setFieldsValue({ tender_version: undefined, position_id: undefined });
                }}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="tender_version"
              label="Версия"
              rules={[{ required: true, message: 'Выберите версию' }]}
            >
              <AutoComplete
                value={tenderVersionSearch}
                onChange={setTenderVersionSearch}
                onSelect={handleTenderVersionSelect}
                disabled={!selectedTenderTitle}
                placeholder="Выберите версию..."
                options={availableVersions.map(version => ({
                  value: version.toString(),
                  label: `Версия ${version}`,
                }))}
                filterOption={false}
                allowClear
                onClear={() => {
                  setTenderVersionSearch('');
                  setSelectedTenderVersion(null);
                  setSelectedTenderId(null);
                  setLeafPositions([]);
                  resetPositionSelection();
                  form.setFieldsValue({ position_id: undefined });
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="position_id"
          label="Позиция заказчика"
          rules={[{ required: true, message: 'Выберите позицию' }]}
        >
          <AutoComplete
            value={positionSearch}
            onChange={setPositionSearch}
            onSelect={handlePositionSelect}
            disabled={!selectedTenderId}
            placeholder="Начните вводить наименование позиции (минимум 2 символа)..."
            options={leafPositions
              .filter(p => {
                if (!positionSearch || positionSearch.length < 2) return true;
                const searchLower = positionSearch.toLowerCase();
                const nameLower = p.work_name.toLowerCase();
                const numberStr = p.position_number.toString();
                return nameLower.includes(searchLower) || numberStr.includes(searchLower);
              })
              .map(p => ({
                key: p.id,
                value: `${p.position_number} - ${p.work_name}`,
                label: `${p.position_number} - ${p.work_name}`,
              }))
            }
            filterOption={false}
            allowClear
            onClear={() => {
              setPositionSearch('');
              setSelectedPositionId(null);
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InsertTemplateIntoPositionModal;
