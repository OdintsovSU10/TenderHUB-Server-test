import { useState } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '../../../../lib/supabase';

const { confirm } = Modal;

export interface MaterialRecord {
  key: string;
  id: string;
  name: string;
  unit: string;
  created_at: string;
}

export const useMaterials = () => {
  const [materialsData, setMaterialsData] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      // Загружаем данные батчами, так как Supabase ограничивает 1000 строк за запрос
      let allMaterials: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('material_names')
          .select('*')
          .order('name')
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allMaterials = [...allMaterials, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const formattedData: MaterialRecord[] = allMaterials.map((item: any) => ({
        key: item.id,
        id: item.id,
        name: item.name,
        unit: item.unit,
        created_at: new Date(item.created_at).toLocaleDateString('ru-RU'),
      }));

      console.log(`[Nomenclatures/Materials] Loaded ${formattedData.length} materials`);
      setMaterialsData(formattedData);
    } catch (error) {
      console.error('Ошибка загрузки материалов:', error);
      message.error('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const saveMaterial = async (values: any, editingMaterialId?: string) => {
    try {
      if (editingMaterialId) {
        const { error } = await supabase
          .from('material_names')
          .update({
            name: values.name,
            unit: values.unit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMaterialId);

        if (error) throw error;
        message.success('Материал обновлен');
      } else {
        const { error } = await supabase
          .from('material_names')
          .insert([{
            name: values.name,
            unit: values.unit,
          }]);

        if (error) throw error;
        message.success('Материал добавлен');
      }

      await loadMaterials();
      return true;
    } catch (error: any) {
      console.error('Ошибка сохранения материала:', error);
      message.error(error.message || 'Ошибка сохранения материала');
      return false;
    }
  };

  const deleteMaterial = (record: MaterialRecord) => {
    confirm({
      title: 'Подтверждение удаления',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите удалить материал "${record.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('material_names')
            .delete()
            .eq('id', record.id);

          if (error) throw error;

          message.success('Материал удален');
          await loadMaterials();
        } catch (error: any) {
          console.error('Ошибка удаления материала:', error);
          message.error(error.message || 'Ошибка удаления материала');
        }
      },
    });
  };

  return {
    materialsData,
    loading,
    loadMaterials,
    saveMaterial,
    deleteMaterial,
  };
};
