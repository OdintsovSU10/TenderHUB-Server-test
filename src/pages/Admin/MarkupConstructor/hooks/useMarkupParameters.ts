import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase, MarkupParameter } from '../../../../lib/supabase';

export const useMarkupParameters = () => {
  const [markupParameters, setMarkupParameters] = useState<MarkupParameter[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [editingParameterId, setEditingParameterId] = useState<string | null>(null);
  const [editingParameterLabel, setEditingParameterLabel] = useState('');

  const fetchParameters = useCallback(async (tacticId: string | null) => {
    if (!tacticId) {
      setMarkupParameters([]);
      return;
    }

    setLoadingParameters(true);
    try {
      const { data, error } = await supabase
        .from('markup_parameters')
        .select('*')
        .eq('tactic_id', tacticId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      setMarkupParameters(data || []);
    } catch (error) {
      console.error('Error fetching parameters:', error);
      message.error('Ошибка загрузки параметров наценок');
    } finally {
      setLoadingParameters(false);
    }
  }, []);

  const addParameter = useCallback(async (
    tacticId: string,
    parameterData: {
      parameter_name: string;
      base_value: string;
      coefficient: number;
      is_percentage: boolean;
    }
  ) => {
    try {
      // Получаем максимальный order_number
      const { data: existing } = await supabase
        .from('markup_parameters')
        .select('order_number')
        .eq('tactic_id', tacticId)
        .order('order_number', { ascending: false })
        .limit(1);

      const maxOrder = existing && existing.length > 0 ? existing[0].order_number : 0;

      const { data, error } = await supabase
        .from('markup_parameters')
        .insert({
          tactic_id: tacticId,
          parameter_name: parameterData.parameter_name,
          base_value: parameterData.base_value,
          coefficient: parameterData.coefficient,
          is_percentage: parameterData.is_percentage,
          order_number: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      message.success('Параметр наценки добавлен');
      setMarkupParameters(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding parameter:', error);
      message.error('Ошибка добавления параметра наценки');
    }
  }, []);

  const deleteParameter = useCallback(async (parameterId: string) => {
    try {
      const { error } = await supabase
        .from('markup_parameters')
        .delete()
        .eq('id', parameterId);

      if (error) throw error;

      message.success('Параметр наценки удален');
      setMarkupParameters(prev => prev.filter(p => p.id !== parameterId));
    } catch (error) {
      console.error('Error deleting parameter:', error);
      message.error('Ошибка удаления параметра наценки');
    }
  }, []);

  const updateParameter = useCallback(async (
    parameterId: string,
    updates: Partial<MarkupParameter>
  ) => {
    try {
      const { error } = await supabase
        .from('markup_parameters')
        .update(updates)
        .eq('id', parameterId);

      if (error) throw error;

      setMarkupParameters(prev =>
        prev.map(p => (p.id === parameterId ? { ...p, ...updates } : p))
      );
    } catch (error) {
      console.error('Error updating parameter:', error);
      message.error('Ошибка обновления параметра наценки');
      throw error;
    }
  }, []);

  const reorderParameters = useCallback(async (
    parameterId: string,
    direction: 'up' | 'down'
  ) => {
    const index = markupParameters.findIndex(p => p.id === parameterId);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === markupParameters.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newParameters = [...markupParameters];
    [newParameters[index], newParameters[newIndex]] = [
      newParameters[newIndex],
      newParameters[index],
    ];

    try {
      // Обновляем order_num для обоих параметров
      await Promise.all([
        updateParameter(newParameters[index].id, { order_num: index + 1 }),
        updateParameter(newParameters[newIndex].id, { order_num: newIndex + 1 }),
      ]);

      setMarkupParameters(newParameters);
    } catch (error) {
      console.error('Error reordering parameters:', error);
      message.error('Ошибка изменения порядка параметров');
    }
  }, [markupParameters, updateParameter]);

  const startEditingParameter = useCallback((parameterId: string, label: string) => {
    setEditingParameterId(parameterId);
    setEditingParameterLabel(label);
  }, []);

  const cancelEditingParameter = useCallback(() => {
    setEditingParameterId(null);
    setEditingParameterLabel('');
  }, []);

  const saveEditingParameter = useCallback(async () => {
    if (!editingParameterId || !editingParameterLabel.trim()) {
      message.error('Название не может быть пустым');
      return;
    }

    try {
      await updateParameter(editingParameterId, {
        label: editingParameterLabel.trim(),
      });
      message.success('Название параметра обновлено');
      setEditingParameterId(null);
      setEditingParameterLabel('');
    } catch (error) {
      // Error already handled in updateParameter
    }
  }, [editingParameterId, editingParameterLabel, updateParameter]);

  return {
    markupParameters,
    loadingParameters,
    editingParameterId,
    editingParameterLabel,
    setEditingParameterLabel,
    fetchParameters,
    addParameter,
    deleteParameter,
    updateParameter,
    reorderParameters,
    startEditingParameter,
    cancelEditingParameter,
    saveEditingParameter,
  };
};
