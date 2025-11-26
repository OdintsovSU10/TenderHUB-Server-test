import { useState } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '../../../../lib/supabase';

const { confirm } = Modal;

export interface WorkRecord {
  key: string;
  id: string;
  name: string;
  unit: string;
  created_at: string;
}

export const useWorks = () => {
  const [worksData, setWorksData] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_names')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedData: WorkRecord[] = data?.map((item: any) => ({
        key: item.id,
        id: item.id,
        name: item.name,
        unit: item.unit,
        created_at: new Date(item.created_at).toLocaleDateString('ru-RU'),
      })) || [];

      setWorksData(formattedData);
    } catch (error) {
      console.error('Ошибка загрузки работ:', error);
      message.error('Ошибка загрузки работ');
    } finally {
      setLoading(false);
    }
  };

  const saveWork = async (values: any, editingWorkId?: string) => {
    try {
      if (editingWorkId) {
        const { error } = await supabase
          .from('work_names')
          .update({
            name: values.name,
            unit: values.unit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWorkId);

        if (error) throw error;
        message.success('Работа обновлена');
      } else {
        const { error } = await supabase
          .from('work_names')
          .insert([{
            name: values.name,
            unit: values.unit,
          }]);

        if (error) throw error;
        message.success('Работа добавлена');
      }

      await loadWorks();
      return true;
    } catch (error: any) {
      console.error('Ошибка сохранения работы:', error);
      message.error(error.message || 'Ошибка сохранения работы');
      return false;
    }
  };

  const deleteWork = (record: WorkRecord) => {
    confirm({
      title: 'Подтверждение удаления',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите удалить работу "${record.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('work_names')
            .delete()
            .eq('id', record.id);

          if (error) throw error;

          message.success('Работа удалена');
          await loadWorks();
        } catch (error: any) {
          console.error('Ошибка удаления работы:', error);
          message.error(error.message || 'Ошибка удаления работы');
        }
      },
    });
  };

  return {
    worksData,
    loading,
    loadWorks,
    saveWork,
    deleteWork,
  };
};
