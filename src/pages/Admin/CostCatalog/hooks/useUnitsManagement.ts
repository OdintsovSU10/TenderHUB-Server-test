import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

export const useUnitsManagement = () => {
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [unitsData, setUnitsData] = useState<any[]>([]);

  const loadUnits = async () => {
    try {
      const { data: units, error } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      if (units) {
        setAvailableUnits(units.map(u => u.code));
        setUnitsData(units);
      }
    } catch (error) {
      console.error('Ошибка загрузки единиц измерения:', error);
      setAvailableUnits(['шт', 'м', 'м2', 'м3', 'кг', 'т', 'л', 'компл', 'м.п.']);
    }
  };

  return {
    availableUnits,
    unitsData,
    loadUnits,
  };
};
