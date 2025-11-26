import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Tender } from '../../../lib/supabase';

const addNotification = async (
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'pending' = 'warning'
) => {
  try {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      is_read: false,
    });
  } catch (error) {
    console.error('Ошибка создания уведомления:', error);
  }
};

export const useTendersData = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: tendersData, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        await addNotification(
          'Ошибка загрузки списка тендеров',
          `Не удалось загрузить список тендеров: ${error.message}`,
          'warning'
        );
        throw error;
      }
      setTenders(tendersData || []);
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tenders,
    loading,
    loadTenders,
  };
};
