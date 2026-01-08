import { useCallback } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ProjectInsert, ProjectFull } from '../../../lib/supabase/types';

const { confirm } = Modal;

export const useProjectActions = (fetchProjects: () => Promise<void>) => {
  const { theme } = useTheme();

  const handleSave = useCallback(
    async (values: ProjectInsert, editingId?: string): Promise<boolean> => {
      try {
        if (editingId) {
          // Update existing project
          const { error } = await supabase
            .from('projects')
            .update({
              name: values.name,
              client_name: values.client_name,
              contract_cost: values.contract_cost,
              area: values.area || null,
              contract_date: values.contract_date || null,
              construction_end_date: values.construction_end_date || null,
              tender_id: values.tender_id || null,
            })
            .eq('id', editingId);

          if (error) throw error;
          message.success('Объект успешно обновлён');
        } else {
          // Create new project
          const { error } = await supabase.from('projects').insert([
            {
              name: values.name,
              client_name: values.client_name,
              contract_cost: values.contract_cost,
              area: values.area || null,
              contract_date: values.contract_date || null,
              construction_end_date: values.construction_end_date || null,
              tender_id: values.tender_id || null,
              is_active: true,
            },
          ]);

          if (error) throw error;
          message.success('Объект успешно создан');
        }

        await fetchProjects();
        return true;
      } catch (error) {
        console.error('Error saving project:', error);
        message.error('Ошибка сохранения объекта');
        return false;
      }
    },
    [fetchProjects]
  );

  const handleDelete = useCallback(
    (record: ProjectFull) => {
      confirm({
        title: 'Удалить объект?',
        icon: <ExclamationCircleOutlined />,
        content: (
          <span>
            Вы уверены, что хотите удалить объект <strong>{record.name}</strong>? Все связанные
            данные (доп. соглашения, выполнение) также будут удалены.
          </span>
        ),
        okText: 'Удалить',
        okType: 'danger',
        cancelText: 'Отмена',
        className: theme === 'dark' ? 'dark-modal' : '',
        onOk: async () => {
          try {
            // Soft delete - just set is_active to false
            const { error } = await supabase
              .from('projects')
              .update({ is_active: false })
              .eq('id', record.id);

            if (error) throw error;

            message.success('Объект удалён');
            await fetchProjects();
          } catch (error) {
            console.error('Error deleting project:', error);
            message.error('Ошибка удаления объекта');
          }
        },
      });
    },
    [fetchProjects, theme]
  );

  return { handleSave, handleDelete };
};
