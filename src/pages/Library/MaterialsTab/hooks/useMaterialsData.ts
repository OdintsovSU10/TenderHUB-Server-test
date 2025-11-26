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
      const { data: namesData, error } = await supabase
        .from('material_names')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaterialNames(namesData || []);
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
