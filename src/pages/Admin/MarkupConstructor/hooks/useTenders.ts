import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase, Tender } from '../../../../lib/supabase';

/**
 * Хук для управления тендерами в контексте конструктора наценок
 */
export const useTenders = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);

  /**
   * Загрузка списка тендеров
   */
  const fetchTenders = useCallback(async () => {
    setLoadingTenders(true);
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
      message.error('Ошибка загрузки списка тендеров');
    } finally {
      setLoadingTenders(false);
    }
  }, []);

  /**
   * Привязка тактики наценок к тендеру
   */
  const assignTacticToTender = useCallback(async (tenderId: string, tacticId: string) => {
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ markup_tactic_id: tacticId })
        .eq('id', tenderId);

      if (error) throw error;

      message.success('Схема наценок привязана к тендеру');

      // Обновляем локальное состояние
      setTenders(prev =>
        prev.map(t => (t.id === tenderId ? { ...t, markup_tactic_id: tacticId } : t))
      );

      return true;
    } catch (error) {
      console.error('Error assigning tactic to tender:', error);
      message.error('Ошибка привязки схемы к тендеру');
      return false;
    }
  }, []);

  /**
   * Отвязка тактики от тендера
   */
  const removeTacticFromTender = useCallback(async (tenderId: string) => {
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ markup_tactic_id: null })
        .eq('id', tenderId);

      if (error) throw error;

      message.success('Схема наценок отвязана от тендера');

      // Обновляем локальное состояние
      setTenders(prev =>
        prev.map(t => (t.id === tenderId ? { ...t, markup_tactic_id: null } : t))
      );

      return true;
    } catch (error) {
      console.error('Error removing tactic from tender:', error);
      message.error('Ошибка отвязки схемы от тендера');
      return false;
    }
  }, []);

  /**
   * Получение тактики привязанной к тендеру
   */
  const getTenderTacticId = useCallback((tenderId: string | null): string | null => {
    if (!tenderId) return null;
    const tender = tenders.find(t => t.id === tenderId);
    return tender?.markup_tactic_id || null;
  }, [tenders]);

  return {
    tenders,
    loadingTenders,
    selectedTenderId,
    setSelectedTenderId,
    fetchTenders,
    assignTacticToTender,
    removeTacticFromTender,
    getTenderTacticId,
  };
};
