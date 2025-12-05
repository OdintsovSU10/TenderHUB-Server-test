import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { supabase, WorkLibraryFull, WorkName } from '../../../../lib/supabase';

export const useWorksData = () => {
  const [data, setData] = useState<WorkLibraryFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [workNames, setWorkNames] = useState<WorkName[]>([]);
  const hasFetchedNames = useRef(false);

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
    if (hasFetchedNames.current) return;
    hasFetchedNames.current = true;

    try {
      // Загружаем все записи батчами (Supabase ограничение 1000 строк)
      let allNames: WorkName[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: namesData, error } = await supabase
          .from('work_names')
          .select('*')
          .order('name')
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (namesData && namesData.length > 0) {
          allNames = [...allNames, ...namesData];
          from += batchSize;
          hasMore = namesData.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Дедупликация: сначала по name (оставляем первое вхождение), потом по id
      const uniqueByName = Array.from(
        new Map(allNames.map(item => [item.name, item])).values()
      );
      const uniqueNames = Array.from(
        new Map(uniqueByName.map(item => [item.id, item])).values()
      );

      console.log(`[WorksData] Loaded ${allNames.length} raw, ${uniqueNames.length} unique work names`);
      setWorkNames(uniqueNames);
    } catch (error) {
      console.error('Error fetching work names:', error);
      hasFetchedNames.current = false; // Сброс при ошибке
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
