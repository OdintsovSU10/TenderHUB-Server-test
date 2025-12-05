import { useState, useEffect } from 'react';
import { message } from 'antd';
import { supabase, MaterialLibraryFull, MaterialName } from '../../../../lib/supabase';

export const useMaterialsData = () => {
  const [data, setData] = useState<MaterialLibraryFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialNames, setMaterialNames] = useState<MaterialName[]>([]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data: materialsData, error } = await supabase
        .from('materials_library')
        .select(`
          *,
          material_names (
            id,
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = materialsData?.map(item => ({
        ...item,
        material_name: item.material_names?.name || '',
        unit: item.material_names?.unit || 'шт'
      })) as MaterialLibraryFull[];

      setData(formatted || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      message.error('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialNames = async () => {
    try {
      // Загружаем все записи батчами (Supabase ограничение 1000 строк)
      let allNames: MaterialName[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: namesData, error } = await supabase
          .from('material_names')
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

      setMaterialNames(allNames);
    } catch (error) {
      console.error('Error fetching material names:', error);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchMaterialNames();
  }, []);

  return {
    data,
    loading,
    materialNames,
    fetchMaterials,
  };
};
