import { useState, useEffect } from 'react';
import { message } from 'antd';
import { supabase, WorkLibraryFull, WorkName } from '../../../../lib/supabase';

export const useWorksData = () => {
  const [data, setData] = useState<WorkLibraryFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [workNames, setWorkNames] = useState<WorkName[]>([]);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const { data: worksData, error } = await supabase
        .from('works_library')
        .select(`
          *,
          work_names (
            id,
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = worksData?.map(item => ({
        ...item,
        work_name: item.work_names?.name || '',
        unit: item.work_names?.unit || 'шт'
      })) as WorkLibraryFull[];

      setData(formatted || []);
    } catch (error) {
      console.error('Error fetching works:', error);
      message.error('Ошибка загрузки работ');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkNames = async () => {
    try {
      const { data: namesData, error } = await supabase
        .from('work_names')
        .select('*')
        .order('name');

      if (error) throw error;
      setWorkNames(namesData || []);
    } catch (error) {
      console.error('Error fetching work names:', error);
    }
  };

  useEffect(() => {
    fetchWorks();
    fetchWorkNames();
  }, []);

  return {
    data,
    loading,
    workNames,
    fetchWorks,
  };
};
